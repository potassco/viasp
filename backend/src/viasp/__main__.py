import argparse
import textwrap
import sys
import re
import os
import webbrowser
import subprocess
import atexit

import importlib.metadata
from clingo.script import enable_python
from clingo import Control as clingoControl

import viasp.api
from viasp.server import startup
from viasp.shared.defaults import DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, DEFAULT_FRONTEND_PORT, DEFAULT_BACKEND_PROTOCOL, DEFAULT_COLOR
from viasp.shared.io import clingo_model_to_stable_model, clingo_symbols_to_stable_model
from viasp.shared.util import get_json, get_lp_files, SolveHandle
from viasp.shared.simple_logging import error, warn, plain, info
from viasp.exceptions import NoRelaxedModelsFoundException

#
# DEFINES
#

#
UNKNOWN = "UNKNOWN"
ERROR = "(viasp) {}"
ERROR_INFO = "(viasp) Try '--help' for usage information"
ERROR_OPEN = "<cmd>: error: file could not be opened:\n  {}\n"
ERROR_PARSING = "parsing failed"
WARNING_INCLUDED_FILE = "<cmd>: already included file:\n  {}\n"
HELP_CLINGO_HELP = ": Print {1=basic|2=more|3=full} clingo help and exit"
PRINT_RELAX_HELP = textwrap.dedent("""\
    : Use the relaxer and output the transformed program""")
USE_RELAX_HELP = textwrap.dedent("""\
    : Use the relaxer and visualize the transformed program""")
RELAXER_GROUP_HELP = textwrap.dedent("""\
    Options for the relaxation of integrity constraints in unsatisfiable programs."""
                                     )

try:
    VERSION = importlib.metadata.version("viasp")
except importlib.metadata.PackageNotFoundError:
    VERSION = '0.0.0'


def backend():
    from viasp.server.factory import create_app
    parser = argparse.ArgumentParser(description='viasp backend')
    parser.add_argument('--host',
                        type=str,
                        help='The host for the backend',
                        default=DEFAULT_BACKEND_HOST)
    parser.add_argument('-p',
                        '--port',
                        type=int,
                        help='The port for the backend',
                        default=DEFAULT_BACKEND_PORT)
    app = create_app()
    use_reloader = False
    debug = False
    args = parser.parse_args()
    host = args.host
    port = args.port
    print(f"Starting viASP backend at {host}:{port}")
    app.run(host=host, port=port, use_reloader=use_reloader, debug=debug)


def start():
    ViaspRunner().run(sys.argv[1:])


def _is_running_in_notebook():
    try:
        shell = get_ipython().__class__.__name__  # type: ignore
        if shell == 'ZMQInteractiveShell':
            return True  # Jupyter notebook or qtconsole
        elif shell == 'TerminalInteractiveShell':
            return False  # Terminal running IPython
        else:
            return False  # Other type (?)
    except NameError:
        return False  # Probably standard Python interpreter


#
# MyArgumentParser
#


class MyArgumentParser(argparse.ArgumentParser):

    def print_help(self, file=None):
        if file is None:
            file = sys.stdout
        file.write("viasp version {}\n".format(VERSION))
        argparse.ArgumentParser.print_help(self, file)

    def error(self, message):
        raise argparse.ArgumentError(None, "In context <viasp>: " + message)


#
# class ViaspArgumentParser
#


class ViaspArgumentParser:

    clingo_help = textwrap.dedent("""
    Clingo Options:
      --<option>[=<value>]\t: Set clingo <option> [to <value>]

    """)

    usage = "viasp [options] [files]"

    epilog = textwrap.dedent("""
    Default command-line:
    viasp --models 0 [files]

    viasp is part of Potassco: https://potassco.org/
    Get help/report bugs via : https://potassco.org/support
    """)

    version_string = "viasp " + VERSION + textwrap.dedent("""
    Copyright (C) Stephan Zwicknagl, Luis Glaser
    License: The MIT License <https://opensource.org/licenses/MIT>""")

    def __init__(self):
        self.__first_file: str = ""
        self.__file_warnings = []

    def __add_file(self, files, file):
        abs_file = os.path.abspath(file) if file != "-" else "-"
        contents = open(abs_file) if abs_file != "-" else sys.stdin

        if abs_file in [i[1] for i in files]:
            self.__file_warnings.append(file)
        else:
            files.append((file, abs_file, contents))
        if not self.__first_file:
            self.__first_file = file if file != "-" else "stdin"

    def __do_constants(self, alist):
        try:
            constants = dict()
            for i in alist:
                old, sep, new = i.partition("=")
                if new == "":
                    raise Exception(
                        "no definition for constant {}".format(old))
                if old in constants:
                    raise Exception("constant {} defined twice".format(old))
                else:
                    constants[old] = new
            return constants
        except Exception as e:
            self.__cmd_parser.error(str(e))

    def __do_opt_mode(self, opt_mode):
        try:
            parts = opt_mode.split(',')
            mode = parts[0]
            if mode not in ['opt', 'enum', 'optN', 'ignore']:
                raise argparse.ArgumentTypeError(
                    f"Invalid value for opt-mode: {mode}")
            bounds = parts[1:]
            return (mode, bounds)
        except Exception as e:
            error(ERROR.format(e))
            error(ERROR_INFO)
            sys.exit(1)

    def run(self, args):

        # command parser
        _epilog = self.clingo_help + "\nusage: " + self.usage + self.epilog
        cmd_parser = MyArgumentParser(
            usage=self.usage,
            epilog=_epilog,
            formatter_class=argparse.RawTextHelpFormatter,
            add_help=False,
            prog="viasp")
        self.__cmd_parser = cmd_parser

        # Positional arguments
        self.__cmd_parser.add_argument('files',
                                       help=textwrap.dedent("""\
            : Files containing ASP encodings
              Optionally, a single JSON file defining the answer set(s) in clingo's
              `--outf=2` format"""),
                                       nargs='*')
        self.__cmd_parser.add_argument('stdin',
                                       help=textwrap.dedent("""\
            : Standard input in form of an ASP encoding or JSON in clingo's `--outf=2` format"""
                                                            ),
                                       nargs='?',
                                       default=sys.stdin)
        # Basic Options
        basic = cmd_parser.add_argument_group('Basic Options')
        basic.add_argument('--help',
                           '-h',
                           action='help',
                           help=': Print help and exit')
        basic.add_argument('--clingo-help',
                           help=HELP_CLINGO_HELP,
                           type=int,
                           dest='clingo_help',
                           metavar='<m>',
                           default=0,
                           choices=[0, 1, 2, 3])
        basic.add_argument('--version',
                           '-v',
                           dest='version',
                           action='store_true',
                           help=': Print version information and exit')
        basic.add_argument('--host',
                           metavar='<host>',
                           type=str,
                           help=': The host for the backend and frontend',
                           default=DEFAULT_BACKEND_HOST)
        basic.add_argument('-p',
                           '--port',
                           metavar='<port>',
                           type=int,
                           help=': The port for the backend',
                           default=DEFAULT_BACKEND_PORT)
        basic.add_argument('-f',
                           '--frontend-port',
                           metavar='<port>',
                           type=int,
                           help=': The port for the frontend',
                           default=DEFAULT_FRONTEND_PORT)
        basic.add_argument(
            '--color',
            choices=['blue', 'yellow', 'orange', 'green', 'red', 'purple'],
            metavar='<color>',
            help=': The primary color',
            default=DEFAULT_COLOR)

        # Solving Options
        solving = cmd_parser.add_argument_group('Solving Options')
        solving.add_argument('-c',
                             '--const',
                             dest='constants',
                             action="append",
                             help=argparse.SUPPRESS,
                             default=[])
        solving.add_argument('--opt-mode',
                             type=self.__do_opt_mode,
                             help=argparse.SUPPRESS)
        solving.add_argument('--models',
                             '-n',
                             help=": Compute at most <n> models (0 for all)",
                             type=int,
                             dest='max_models',
                             metavar='<n>')
        solving.add_argument('--select-model',
                             help=textwrap.dedent("""\
            : Select only one of the models when using a json input
              Defined by an index for accessing the models, starting in index 0
              Can appear multiple times to select multiple models"""),
                             metavar='<index>',
                             type=int,
                             action='append',
                             nargs='?')

        clingraph_group = cmd_parser.add_argument_group(
            'Clingraph Options',
            'If included, a Clingraph visualization will be made.')
        clingraph_group.add_argument(
            '--viz-encoding',
            metavar='<path>',
            type=str,
            help=': Path to the visualization encoding',
            default=None)
        clingraph_group.add_argument(
            '--engine',
            type=str,
            metavar='<ENGINE>',
            help=
            ': The visualization engine (refer to clingraph documentation)',
            default="dot")
        clingraph_group.add_argument(
            '--graphviz-type',
            type=str,
            metavar='<type>',
            help=': The graph type (refer to clingraph documentation)',
            default="graph")

        relaxer_group = cmd_parser.add_argument_group('Relaxation Options',
                                                      RELAXER_GROUP_HELP)
        relaxer_group.add_argument('--print-relax',
                                   action='store_true',
                                   help=PRINT_RELAX_HELP)
        relaxer_group.add_argument('-r',
                                   '--relax',
                                   action='store_true',
                                   help=USE_RELAX_HELP)
        relaxer_group.add_argument('--head-name',
                                   type=str,
                                   metavar='<name>',
                                   help=': The name of the head predicate',
                                   default="unsat")
        relaxer_group.add_argument(
            '--no-collect-variables',
            action='store_true',
            default=False,
            help=
            ': Do not collect variables from body as a tuple in the head literal'
        )
        relaxer_group.add_argument(
            '--relaxer-opt-mode',
            metavar='<mode>',
            type=self.__do_opt_mode,
            help=': Clingo optimization mode for the relaxed program',
        )

        options, unknown = cmd_parser.parse_known_args(args=args)
        options = vars(options)

        # print version
        if options['version']:
            plain(self.version_string)
            sys.exit(0)

        # separate files, number of models and clingo options
        fb = options['files']
        options['files'], clingo_options = [], []
        for i in unknown + fb:
            if i == "-":
                self.__add_file(options['files'], i)
            elif (re.match(r'^([0-9]|[1-9][0-9]+)$', i)):
                options['max_models'] = int(i)
            elif (re.match(r'^-', i)):
                clingo_options.append(i)
            else:
                self.__add_file(options['files'], i)

        # when no files, add stdin
        if options['files'] == []:
            self.__first_file = "stdin"
            options['files'].append(("-", "-"))
        if len(options['files']) > 1:
            self.__first_file = f"{self.__first_file} ..."

        # build prologue
        host = options.get("host", DEFAULT_BACKEND_HOST)
        port = options.get("port", DEFAULT_BACKEND_PORT)
        backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"
        prologue = "viasp version " + VERSION + \
            " at " + backend_url + "\n" + \
            "Reading from " + self.__first_file

        # handle constants
        options['constants'] = self.__do_constants(options['constants'])

        # handle clingraph
        options['clingraph_files'] = []
        if options['viz_encoding']:
            self.__add_file(options['clingraph_files'],
                            options.pop('viz_encoding'))

        # handle opt mode and set max_models accordingly
        options['original_max_models'] = options['max_models']
        opt_mode, bounds = options.get("opt_mode") or ('opt', [])
        options['opt_mode'] = opt_mode
        if opt_mode == "optN":
            options['max_models'] = 0
        if opt_mode == "opt":
            if options['max_models'] == None:
                options['max_models'] = 0

        options['opt_mode_str'] = f"--opt-mode={opt_mode}" + (
            f",{','.join(bounds)}" if len(bounds) > 0 else "")
        relaxer_opt_mode, relaxer_bounds = options.get("relaxer_opt_mode") or (
            'opt', [])
        options['relaxer_opt_mode_str'] = f"--opt-mode={relaxer_opt_mode}" + (
            f",{','.join(relaxer_bounds)}" if len(relaxer_bounds) > 0 else "")
        if options['max_models'] == None:
            options['max_models'] = 1

        # return
        return options, clingo_options, prologue, \
               self.__file_warnings


#
# class ViaspRunner
#


class ViaspRunner():

    def __init__(self):
        self._should_run_relaxation: bool = False
        self.backend_url: str = ""

    def run(self, args):
        try:
            self.run_wild(args)
        except Exception as e:
            error(ERROR.format(e))
            error(ERROR_INFO)
            sys.exit(1)

    def warn_unsat(self):
        plain(
            textwrap.dedent(f"""\

            [INFO] The input program is unsatisfiable. To visualize the relaxed program use:
                    {RELAXER_GROUP_HELP}
                    --print-relax{PRINT_RELAX_HELP}
                    --relax      {USE_RELAX_HELP}"""))
        sys.exit(0)

    def warn_no_relaxed_models(self):
        plain(
            textwrap.dedent(f"""\
                [WARN] The relaxed program has no stable models.
                """))
        sys.exit(0)

    def warn_optimality_not_guaranteed(self):
        warn(
            "(clingo): #models not 0: optimality of last model not guaranteed."
        )

    def run_with_json(self, model_from_json, relax, select_model):
        models_to_mark = []

        if select_model is not None:
            for m in select_model:
                if m >= len(model_from_json):
                    raise ValueError(f"Invalid model number selected {m}")
                if m < 0:
                    if m < -1 * len(model_from_json):
                        raise ValueError(f"Invalid model number selected {m}")
                    select_model.append(len(model_from_json) + m)
        with SolveHandle(model_from_json) as handle:
            # mark user model selection
            if select_model is not None:
                for model in handle:
                    if model['number'] - 1 in select_model:
                        symbols = viasp.api.parse_fact_string(
                            model['facts'], raise_nonfact=True)
                        stable_model = clingo_symbols_to_stable_model(symbols)
                        models_to_mark.append(stable_model)
            # mark all (optimal) models
            else:
                for model in handle:
                    plain(
                        f"Answer: {model['number']}\n{model['representation']}"
                    )
                    if len(model['cost']) > 0:
                        plain(
                            f"Optimization: {' '.join(map(str,model['cost']))}"
                        )
                    symbols = viasp.api.parse_fact_string(model['facts'],
                                                          raise_nonfact=True)
                    stable_model = clingo_symbols_to_stable_model(symbols)
                    if len(handle.opt()) == 0:
                        models_to_mark.append(stable_model)
                    if len(handle.opt()) > 0 and model["cost"] == handle.opt():
                        models_to_mark.append(stable_model)
            if handle.get().unsatisfiable:
                plain("UNSATISFIABLE\n")
                if relax:
                    self._should_run_relaxation = True
                else:
                    self.warn_unsat()
            else:
                plain("SATISFIABLE\n")
        return models_to_mark

    def run_with_clingo(self, ctl, relax, original_max_models, max_models,
                        opt_mode):
        models_to_mark = []
        ctl.ground([("base", [])])
        with ctl.solve(yield_=True) as handle:
            for m in handle:
                if (len(m.cost) > 0 and opt_mode == "opt" and max_models != 0):
                    self.warn_optimality_not_guaranteed()

                plain(f"Answer: {m.number}\n{m}")
                if len(m.cost) > 0:
                    plain(f"Optimization: {' '.join(map(str,m.cost))}")

                if opt_mode == "opt" and len(m.cost) > 0:
                    models_to_mark = [clingo_model_to_stable_model(m)]
                elif opt_mode == "optN":
                    if m.optimality_proven:
                        models_to_mark.append(clingo_model_to_stable_model(m))
                else:
                    models_to_mark.append(clingo_model_to_stable_model(m))

                if len(m.cost) == 0 and original_max_models == None:
                    break
                if (len(m.cost) == 0 and original_max_models != None
                        and original_max_models == m.number):
                    break

            if handle.get().unsatisfiable:
                plain("UNSATISFIABLE\n")
                if relax:
                    self._should_run_relaxation = True
                else:
                    self.warn_unsat()
            else:
                plain("SATISFIABLE\n")
        return models_to_mark

    def run_relaxer(self, encoding_files, options, head_name,
                    no_collect_variables, relaxer_opt_mode, clingo_options):
        info("No answer sets found. Switching to transformed visualization.")
        relaxed_program = self.relax_program(encoding_files, options['stdin'],
                                             head_name, no_collect_variables)

        ctl_options = [
            '--models',
            str(options['max_models']), relaxer_opt_mode
        ]
        for k, v in options['constants'].items():
            ctl_options.extend(["--const", f"{k}={v}"])
        ctl_options.extend(clingo_options)
        enable_python()
        ctl = clingoControl(ctl_options)
        ctl.add("base", [], relaxed_program)

        plain("Solving...")
        models = self.run_with_clingo(ctl, False,
                                      options['original_max_models'],
                                      options['max_models'], relaxer_opt_mode)
        viasp.api.add_program_string(relaxed_program,
                                     viasp_backend_url=self.backend_url)
        if len(models) == 0:
            self.warn_no_relaxed_models()
        for m in models:
            viasp.api.mark_from_clingo_model(
                m, viasp_backend_url=self.backend_url)
        viasp.api.show(viasp_backend_url=self.backend_url)

    def print_and_get_stable_models(self, clingo_options, options,
                                    encoding_files, model_from_json, relax,
                                    select_model):
        ctl_options = [
            '--models',
            str(options['max_models']), options['opt_mode_str']
        ]
        for k, v in options['constants'].items():
            ctl_options.extend(["--const", f"{k}={v}"])
        ctl_options.extend(clingo_options)
        enable_python()
        ctl = clingoControl(ctl_options)
        for path in encoding_files:
            if path[1] == "-":
                ctl.add("base", [], options['stdin'])
            else:
                ctl.load(path[1])

        plain("Solving...")
        if model_from_json:
            models = self.run_with_json(model_from_json, relax, select_model)
        else:
            models = self.run_with_clingo(ctl, relax,
                                          options['original_max_models'],
                                          options['max_models'],
                                          options['opt_mode'])
        return models

    def run_viasp(self, encoding_files, models, options):
        for path in encoding_files:
            if path[1] == "-":
                viasp.api.add_program_string(
                    options['stdin'], viasp_backend_url=self.backend_url)
            else:
                viasp.api.load_program_file(path[1],
                                            viasp_backend_url=self.backend_url)
        for m in models:
            viasp.api.mark_from_clingo_model(
                m, viasp_backend_url=self.backend_url)
        viasp.api.show(viasp_backend_url=self.backend_url)
        if len(options['clingraph_files']) > 0:
            for v in options['clingraph_files']:
                viasp.api.clingraph(viz_encoding=v[-1],
                                    engine=options['engine'],
                                    graphviz_type=options['graphviz_type'])

    def relax_program(self, encoding_files, stdin, head_name,
                      no_collect_variables):
        # get ASP files
        for path in encoding_files:
            if path[1] == "-":
                viasp.api.add_program_string(
                    "base", [],
                    stdin,
                    viasp_backend_url=self.backend_url)
            else:
                viasp.api.load_program_file(
                    path[1], viasp_backend_url=self.backend_url)
        relaxed_program = viasp.api.get_relaxed_program(
            head_name,
            not no_collect_variables,
            viasp_backend_url=self.backend_url) or ""
        viasp.api.clear_program()
        return relaxed_program

    def relax_program_quietly(self, encoding_files, stdin, head_name,
                                no_collect_variables):
        from contextlib import redirect_stdout
        with open('viasp.log', 'w') as f:
            with redirect_stdout(f):
                relaxed_program = self.relax_program(encoding_files, stdin,
                                                  head_name,
                                                  no_collect_variables)
                atexit._run_exitfuncs()
        return relaxed_program

    def run_wild(self, args):
        vap = ViaspArgumentParser()
        options, clingo_options, prologue, file_warnings = vap.run(args)

        # read stdin
        if not sys.stdin.isatty():
            options['stdin'] = sys.stdin.read()
        else:
            options['stdin'] = ""

        # read json
        model_from_json, stdin_is_json = get_json(options['files'],
                                                  options['stdin'])

        # get ASP files
        encoding_files = get_lp_files(options['files'], options['stdin'],
                                      stdin_is_json)

        # get backend config
        relax = options.get("relax", False)
        host = options.get("host", DEFAULT_BACKEND_HOST)
        port = options.get("port", DEFAULT_BACKEND_PORT)
        frontend_port = options.get("frontend_port", DEFAULT_FRONTEND_PORT)
        self.backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"

        head_name = options.get("head_name", "unsat")
        no_collect_variables = options.get("no_collect_variables", False)
        select_model = options.get("select_model", None)
        relax_opt_mode_str = options.get("relaxer_opt_mode_str", None)

        # print clingo help
        if options['clingo_help'] > 0:
            subprocess.Popen(
                ["clingo", "--help=" + str(options['clingo_help'])]).wait()
            sys.exit(0)

        # print relaxed program
        if options['print_relax']:
            app = startup.run(host=host, port=port)
            relaxed_program = self.relax_program_quietly(encoding_files,
                                                 options['stdin'], head_name,
                                                 no_collect_variables)
            plain(relaxed_program)
            sys.exit(0)

        # prologue
        plain(prologue)
        for i in file_warnings:
            warn(WARNING_INCLUDED_FILE.format(i))

        models = self.print_and_get_stable_models(clingo_options, options,
                                                  encoding_files,
                                                  model_from_json, relax,
                                                  select_model)
        primary_color = options.get("color", DEFAULT_COLOR)
        app = startup.run(host=host, port=port, primary_color=primary_color)
        if self._should_run_relaxation:
            self.run_relaxer(encoding_files, options, head_name,
                             no_collect_variables, relax_opt_mode_str,
                             clingo_options)
        else:
            self.run_viasp(encoding_files, models, options)

        if not _is_running_in_notebook():
            webbrowser.open(f"http://{host}:{frontend_port}")
        app.run(host=host,
                port=frontend_port,
                use_reloader=False,
                debug=False,
                dev_tools_silence_routes_logging=True)
