import argparse
import textwrap
import sys
import re
import os
import webbrowser
import logging
import subprocess
import atexit

import importlib.metadata
from contextlib import redirect_stdout
from clingo.script import enable_python
from clingo import Control as clingoControl

import viasp.api
from viasp.server import startup
import viasp.shared
from viasp.shared.defaults import DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, DEFAULT_FRONTEND_PORT, DEFAULT_BACKEND_PROTOCOL, DEFAULT_COLOR
from viasp.shared.defaults import _
from viasp.shared.io import clingo_model_to_stable_model, clingo_symbols_to_stable_model
import viasp.shared.simple_logging
from viasp.shared.util import get_json, get_lp_files, SolveHandle
from viasp.shared.simple_logging import error, warn, plain, info

#
# DEFINES
#

try:
    VERSION = importlib.metadata.version("viasp")
except importlib.metadata.PackageNotFoundError:
    VERSION = '0.0.0'


def backend():
    from viasp.server.factory import create_app
    parser = argparse.ArgumentParser(description=_("VIASP_BACKEND_TITLE_HELP"))
    parser.add_argument('--host',
                        type=str,
                        help=_("BACKENDHOST_HELP"),
                        default=DEFAULT_BACKEND_HOST)
    parser.add_argument('-p',
                        '--port',
                        type=int,
                        help=_("BACKENDPORT_HELP"),
                        default=DEFAULT_BACKEND_PORT)
    app = create_app()
    use_reloader = False
    debug = False
    args = parser.parse_args()
    host = args.host
    port = args.port
    print(_("STARTING_VIASP_BACKEND_HELP").format(host, port))
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
        file.write(_("VIASP_VERSION").format(VERSION))
        argparse.ArgumentParser.print_help(self, file)

    def error(self, message):
        raise argparse.ArgumentError(None, _("VIASP_ARG_PARSE_ERROR_STRING").format(message))


#
# class ViaspArgumentParser
#

class ViaspArgumentParser:

    clingo_help = _("CLINGO_HELP_STRING")

    usage = _("VIASP_USAGE_STRING")

    epilog = _("EPILOG_STRING")

    version_string = _("VIASP_NAME_STRING") + VERSION + _("COPYRIGHT_STRING")

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
                        _("NO_DEFINITION_FOR_CONSTANT_STR").format(old))
                if old in constants:
                    raise Exception(_("CONSTANT_DEFINED_TWICE_STR").format(old))
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
                    _("INVALID_OPT_MODE_STRING").format(mode))
            bounds = parts[1:]
            return (mode, bounds)
        except Exception as e:
            error(_("ERROR").format(e))
            error(_("ERROR_INFO"))
            sys.exit(1)

    def run(self, args):

        # command parser
        _epilog = self.clingo_help + "\n\n" + _("USAGE_STRING") +  ": " + \
            self.usage + "\n" + self.epilog
        cmd_parser = MyArgumentParser(
            usage=self.usage,
            epilog=_epilog,
            formatter_class=argparse.RawTextHelpFormatter,
            add_help=False,
            prog="viasp")
        self.__cmd_parser = cmd_parser

        # Positional arguments
        self.__cmd_parser.add_argument('files',
                                       help=_("VIASP_FILES_HELP_STRING"),
                                       nargs='*')
        self.__cmd_parser.add_argument('stdin',
                                       help=_("VIASP_STDIN_HELP_STRING"),
                                       nargs='?',
                                       default=sys.stdin)
        # Basic Options
        basic = cmd_parser.add_argument_group(_("VIASP_BASIC_OPTION"))
        basic.add_argument('--help',
                           '-h',
                           action='help',
                           help=_("VIASP_HELP_HELP"))
        basic.add_argument('--clingo-help',
                           help=_("HELP_CLINGO_HELP"),
                           type=int,
                           dest='clingo_help',
                           metavar='<m>',
                           default=0,
                           choices=[0, 1, 2, 3])
        basic.add_argument('--version',
                           '-v',
                           dest='version',
                           action='store_true',
                           help=_("VIASP_VERSION_HELP"))
        basic.add_argument('--host',
                           metavar='<host>',
                           type=str,
                           help=_("VIASP_HOST_HELP"),
                           default=DEFAULT_BACKEND_HOST)
        basic.add_argument('-p',
                           '--port',
                           metavar='<port>',
                           type=int,
                           help=_("VIASP_PORT_BACKEND_HELP"),
                           default=DEFAULT_BACKEND_PORT)
        basic.add_argument('-f',
                           '--frontend-port',
                           metavar='<port>',
                           type=int,
                           help=_("VIASP_PORT_FRONTEND_HELP"),
                           default=DEFAULT_FRONTEND_PORT)
        basic.add_argument(
            '--color',
            choices=['blue', 'yellow', 'orange', 'green', 'red', 'purple'],
            metavar='<color>',
            help=_("VIASP_PRIMARY_COLOR_HELP"),
            default=DEFAULT_COLOR)
        basic.add_argument('--verbose',
                           action='store_true',
                           help=_("VIASP_VERBOSE_LOGGING_HELP"))

        # Solving Options
        solving = cmd_parser.add_argument_group(_("CLINGO_SOLVING_OPTION"))
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
                             help=_("CLINGO_MODELS_HELP"),
                             type=int,
                             dest='max_models',
                             metavar='<n>')
        solving.add_argument('--select-model',
                             help=_("CLINGO_SELECT_MODEL_HELP"),
                             metavar='<index>',
                             type=int,
                             action='append',
                             nargs='?')

        clingraph_group = cmd_parser.add_argument_group(
            _("CLINGRAPH_OPTION"), _("CLINGRAPH_OPTION_DESCRIPTION"))
        clingraph_group.add_argument('--viz-encoding',
                                     metavar='<path>',
                                     type=str,
                                     help=_("CLINGRAPH_PATH_HELP"),
                                     default=None)
        clingraph_group.add_argument('--engine',
                                     type=str,
                                     metavar='<ENGINE>',
                                     help=_("CLINGRAPH_ENGINE_HELP"),
                                     default="dot")
        clingraph_group.add_argument('--graphviz-type',
                                     type=str,
                                     metavar='<type>',
                                     help=_("CLINGRAPH_TYPE_HELP"),
                                     default="graph")

        relaxer_group = cmd_parser.add_argument_group(_("RELAXER_OPTIONS"),
                                                      _("RELAXER_GROUP_HELP"))
        relaxer_group.add_argument('--print-relax',
                                   action='store_true',
                                   help=_("RELAXER_PRINT_RELAX_HELP"))
        relaxer_group.add_argument('-r',
                                   '--relax',
                                   action='store_true',
                                   help=_("RELAXER_RELAX_HELP"))
        relaxer_group.add_argument('--head-name',
                                   type=str,
                                   metavar='<name>',
                                   help=_("RELAXER_HEAD_NAME_HELP"),
                                   default="unsat")
        relaxer_group.add_argument('--no-collect-variables',
                                   action='store_true',
                                   default=False,
                                   help=_("RELAXER_COLLECT_VARIABLE_NAME_HELP"))
        relaxer_group.add_argument('--relaxer-opt-mode',
                                    metavar='<mode>',
                                    type=self.__do_opt_mode,
                                    help=_("RELAXER_OPT_MODE_HELP"))

        options, unknown = cmd_parser.parse_known_args(args=args)
        options = vars(options)

        # verbose
        viasp.shared.simple_logging.VERBOSE = options['verbose']

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
        prologue = _("VIASP_VERSION").format(VERSION) + \
            _("READING_FROM_PROLOGUE").format(self.__first_file)

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
            error(_("ERROR").format(e))
            error(_("ERROR_INFO"))
            sys.exit(1)

    def warn_unsat(self):
        warn(_("WARN_UNSATISFIABLE_STRING"))
        sys.exit(0)

    def warn_no_relaxed_models(self):
        warn(_("WARN_NO_STABLE_MODEL"))
        sys.exit(0)

    def warn_optimality_not_guaranteed(self):
        warn(_("WARN_OPTIMALITY_NOT_GUARANTEED"))

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
        info(_("SWITCH_TO_TRANSFORMED_VISUALIZATION"))
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
        models = self.run_with_clingo(ctl, True,
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
            warn(_("WARNING_INCLUDED_FILE").format(i))

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

        frontend_url = f"http://{host}:{frontend_port}"
        plain(_("VIASP_RUNNING_INFO").format(frontend_url))
        plain(_("VIASP_HALT_HELP"))
        if not _is_running_in_notebook():
            webbrowser.open(frontend_url)

        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        app.run(host=host, port=frontend_port, use_reloader=False, debug=False)
