import argparse
import sys
import re
import os
import shutil
import subprocess
import signal

import importlib.metadata
from contextlib import redirect_stdout
from clingo.script import enable_python
from clingo import Control as clingoControl

from viasp.server import startup
from viasp.shared.defaults import DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, DEFAULT_FRONTEND_PORT, DEFAULT_FRONTEND_HOST, DEFAULT_BACKEND_PROTOCOL, DEFAULT_COLOR, CLINGRAPH_PATH, GRAPH_PATH, PROGRAM_STORAGE_PATH, STDIN_TMP_STORAGE_PATH, SERVER_PID_FILE_PATH, FRONTEND_PID_FILE_PATH
from viasp.shared.defaults import _
from viasp.shared.io import clingo_model_to_stable_model, clingo_symbols_to_stable_model
import viasp.shared.simple_logging
from viasp.shared import clingo_stats
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


def server():
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
    parser.add_argument('--frontend-host',
                        type=str,
                        help=_("FRONTENDHOST_HELP"),
                        default=DEFAULT_FRONTEND_HOST)
    parser.add_argument('--frontend-port',
                        type=int,
                        help=_("FRONTENDPORT_HELP"),
                        default=DEFAULT_FRONTEND_PORT)
    args = parser.parse_args()
    host = args.host
    port = args.port
    backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"
    front_host = args.frontend_host
    front_port = args.frontend_port
    app = startup.run(host=host,
                      port=port,
                      front_host=front_host,
                      front_port=front_port,
                      do_wait_for_server_ready=True)
    # use ViaspRunner to manage shutdown
    runner = ViaspRunner()
    runner.backend_url = backend_url
    app.run("", open_browser=False)

def start():
    ViaspRunner().run(sys.argv[1:])

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
                           nargs='?',
                           const=1,
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
                           help=_("VIASP_BACKEND_HOST_HELP"),
                           default=DEFAULT_BACKEND_HOST)
        basic.add_argument('-p',
                           '--port',
                           metavar='<port>',
                           type=int,
                           help=_("VIASP_PORT_BACKEND_HELP"),
                           default=DEFAULT_BACKEND_PORT)
        basic.add_argument('--frontend-host',
                            metavar='<host>',
                            type=str,
                            help=_("VIASP_FRONTEND_HOST_HELP"),
                            default=DEFAULT_FRONTEND_HOST)
        basic.add_argument('--frontend-port',
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
        basic.add_argument('--show-all-derived',
                           action='store_true',
                           help=_("VIASP_SHOW_ALL_DERIVED_HELP"))
        basic.add_argument('--reset',
                           action='store_true',
                           help=_("VIASP_RESET_HELP"))

        # Solving Options
        solving = cmd_parser.add_argument_group(_("CLINGO_SOLVING_OPTION"))
        solving.add_argument('-c',
                             '--const',
                             dest='constants',
                             action='append',
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
        solving.add_argument('--warn',
                             '-W',
                             dest='warn',
                             help=argparse.SUPPRESS,
                             default='all')

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

        opt_mode, bounds = options.get("opt_mode") or ('opt', [])
        options['opt_mode'] = opt_mode

        options['opt_mode_str'] = f"--opt-mode={opt_mode}" + (
            f",{','.join(bounds)}" if len(bounds) > 0 else "")
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

    def filter_models_in_json(self, model_from_json, relax, select_model):
        models_to_mark = []
        model_number = 1

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
                        plain(f"Answer: {model['number']}\n{model['representation']}")
                        model_number += 1
                        symbols = viasp.api.parse_fact_string(
                            model['facts'], raise_nonfact=True)
                        stable_model = clingo_symbols_to_stable_model(symbols)
                        models_to_mark.append(stable_model)
            # mark all (optimal) models
            else:
                for model in handle:
                    symbols = viasp.api.parse_fact_string(model['facts'],
                                                          raise_nonfact=True)
                    stable_model = clingo_symbols_to_stable_model(symbols)
                    if len(handle.opt()) == 0:
                        plain(
                            f"Answer: {model['number']}\n{model['representation']}"
                        )
                        model_number += 1
                        models_to_mark.append(stable_model)
                    if len(handle.opt()) > 0 and model["cost"] == handle.opt():
                        plain(
                            f"Answer: {model['number']}\n{model['representation']}"
                        )
                        model_number += 1
                        models_to_mark.append(stable_model)

            sys.stdout.write(clingo_stats.Stats().summary_from_json(model_from_json) + "\n")
            if model_from_json['Result'] == "UNSATISFIABLE" and not relax:
                self.warn_unsat()
        return models_to_mark

    def run_with_clingo(self, ctl, relax, max_models,
                        opt_mode_str):
        models_to_mark = []
        sat_flag = None
        ctl.ground([("base", [])])
        with ctl.solve(yield_=True) as handle:
            for m in handle:
                if (len(m.cost) > 0 and opt_mode_str == "--opt-mode=opt"
                        and max_models != 0):
                    self.warn_optimality_not_guaranteed()

                plain(f"Answer: {m.number}\n{m}")
                if len(m.cost) > 0:
                    plain(f"Optimization: {' '.join(map(str,m.cost))}")

                if opt_mode_str == "--opt-mode=opt" and len(m.cost) > 0:
                    models_to_mark = [clingo_model_to_stable_model(m)]
                elif opt_mode_str == "--opt-mode=optN":
                    if m.optimality_proven:
                        models_to_mark.append(clingo_model_to_stable_model(m))
                else:
                    models_to_mark.append(clingo_model_to_stable_model(m))

                if len(m.cost) == 0 and max_models == None:
                    break
                if (len(m.cost) == 0 and max_models != None
                        and max_models == m.number):
                    break

            sat_flag = handle.get().unsatisfiable

        sys.stdout.write(clingo_stats.Stats().summary(ctl.statistics) + "\n")
        sys.stdout.write(clingo_stats.Stats().statistics(ctl.statistics) + "\n")
        if sat_flag and not relax:
            self.warn_unsat()
        return models_to_mark

    def run_relaxer(self, encoding_files, options, head_name,
                    no_collect_variables, clingo_options, stdin_is_json):
        info(_("SWITCH_TO_TRANSFORMED_VISUALIZATION"))
        relaxed_program = self.relax_program(encoding_files, options['stdin'],
                                             head_name, no_collect_variables,
                                             options['constants'], stdin_is_json)

        ctl_options = [
            '--models',
            str(options['max_models']),
            options['opt_mode_str'],
        ]
        for k, v in options['constants'].items():
            ctl_options.extend(["--const", f"{k}={v}"])
        ctl_options.extend(clingo_options)
        enable_python()
        ctl = clingoControl(ctl_options)
        ctl.add("base", [], relaxed_program)

        plain("Solving...")
        models = self.run_with_clingo(ctl, True,
                                      options['max_models'],
                                      options['opt_mode_str'])
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
        if model_from_json:
            models = self.filter_models_in_json(model_from_json, relax, select_model)
        else:
            ctl_options = [
                '--models',
                str(options['max_models']),
                options['opt_mode_str'],
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
            models = self.run_with_clingo(ctl, relax,
                                options['max_models'],
                                options['opt_mode_str'])
        return models

    def run_viasp(self, encoding_files, models, options):
        for path in encoding_files:
            if path[1] == "-":
                viasp.api.add_program_string(
                    options['stdin'], viasp_backend_url=self.backend_url)
            else:
                viasp.api.load_program_file(path[1],
                                            viasp_backend_url=self.backend_url)
        for c, v in options['constants'].items():
            viasp.api.register_constant(c,
                                        v,
                                        viasp_backend_url=self.backend_url)
        for m in models:
            viasp.api.mark_from_clingo_model(
                m, viasp_backend_url=self.backend_url)
        viasp.api.show(viasp_backend_url=self.backend_url)
        if len(options['clingraph_files']) > 0:
            for v in options['clingraph_files']:
                viasp.api.clingraph(viz_encoding=v[-1],
                                    engine=options['engine'],
                                    graphviz_type=options['graphviz_type'],
                                    viasp_backend_url=self.backend_url)

    def relax_program(self, encoding_files, stdin, head_name,
                      no_collect_variables, constants, stdin_is_json):
        # get ASP files
        for path in encoding_files:
            if path[1] == "-":
                if stdin_is_json:
                    continue
                viasp.api.add_program_string(
                    "base", [], stdin, viasp_backend_url=self.backend_url)
            else:
                viasp.api.load_program_file(path[1],
                                            viasp_backend_url=self.backend_url)
        for c, v in constants.items():
            viasp.api.register_constant(c,
                                        v,
                                        viasp_backend_url=self.backend_url)
        relaxed_program = viasp.api.get_relaxed_program(
            head_name,
            not no_collect_variables,
            viasp_backend_url=self.backend_url) or ""
        viasp.api.clear_program(viasp_backend_url=self.backend_url)
        return relaxed_program

    def relax_program_quietly(self, encoding_files, stdin, head_name,
                              no_collect_variables, constants, stdin_is_json):
        with open('viasp.log', 'w') as f:
            with redirect_stdout(f):
                relaxed_program = self.relax_program(encoding_files, stdin,
                                                     head_name,
                                                     no_collect_variables,
                                                     constants, stdin_is_json)
        return relaxed_program

    def shutdown_server(self):
        from viasp.server.startup import LOG_FILE

        if os.path.exists(SERVER_PID_FILE_PATH):
            with open(SERVER_PID_FILE_PATH, "r") as pid_file:
                pid = int(pid_file.read().strip())
                os.kill(pid, signal.SIGTERM)
            os.remove(SERVER_PID_FILE_PATH)
        if LOG_FILE is not None and not LOG_FILE.closed:
            LOG_FILE.close()

        if os.path.exists(CLINGRAPH_PATH):
            shutil.rmtree(CLINGRAPH_PATH)
        for file in [GRAPH_PATH, PROGRAM_STORAGE_PATH, STDIN_TMP_STORAGE_PATH]:
            if os.path.exists(file):
                os.remove(file)

    def shutdown_frontend_server(self):
        if os.path.exists(FRONTEND_PID_FILE_PATH):
            with open(FRONTEND_PID_FILE_PATH, "r") as pid_file:
                pid = int(pid_file.read().strip())
                os.kill(pid, signal.SIGTERM)
            os.remove(FRONTEND_PID_FILE_PATH)

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
        frontend_host = options.get("frontend_host", DEFAULT_FRONTEND_HOST)
        frontend_port = options.get("frontend_port", DEFAULT_FRONTEND_PORT)
        self.backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"

        head_name = options.get("head_name", "unsat")
        no_collect_variables = options.get("no_collect_variables", False)
        select_model = options.get("select_model", None)

        # print clingo help
        if options['clingo_help'] > 0:
            subprocess.Popen(
                ["clingo", "--help=" + str(options['clingo_help'])]).wait()
            sys.exit(0)

        # print relaxed program
        if options['print_relax']:
            app = startup.run(host=host, port=port, front_host=frontend_host,
                              front_port=frontend_port)
            relaxed_program = self.relax_program_quietly(
                encoding_files, options['stdin'], head_name,
                no_collect_variables, options['constants'], stdin_is_json)
            plain(relaxed_program)
            app.deregister_session()
            sys.exit(0)

        if options['reset']:
            app = startup.ViaspServerLauncher()
            app.shutdown_server()
            app.shutdown_frontend_server()
            sys.exit(0)

        # prologue
        plain(prologue)
        for i in file_warnings:
            warn(_("WARNING_INCLUDED_FILE").format(i))

        app = startup.run(host=host, 
                          port=port, 
                          front_host=frontend_host, 
                          front_port=frontend_port, 
                          do_wait_for_server_ready=False)
        if not relax:
            models = self.print_and_get_stable_models(clingo_options, 
                options,
                encoding_files,
                model_from_json, 
                relax,
                select_model)
        app.wait_for_backend_server_running()
        viasp.api.set_config(
            show_all_derived = options.get("show_all_derived", False),
            color_theme = options.get("color", DEFAULT_COLOR),
            viasp_backend_url=self.backend_url)
        if relax:
            self.run_relaxer(encoding_files, options, head_name,
                             no_collect_variables,
                             clingo_options, stdin_is_json)
        else:
            self.run_viasp(encoding_files, models, options)

        session_id = viasp.api.get_session_id(
            viasp_backend_url=self.backend_url)
        app.run(session_id)
