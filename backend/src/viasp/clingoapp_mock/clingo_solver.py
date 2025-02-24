import subprocess

from viasp.shared.simple_logging import plain, plain_nolinewrap
from viasp.shared.util import get_json
from viasp.clingoapp_mock.util import _

class MockClingoApplicationCliOutputReturnJSON:

    def __init__(self, files, options, warn):
        self.files = files
        self.options = options
        self.warn = warn

    def run(self):
        clingo_solve_command = \
            ['clingo', '--outf=2'] + \
            self.files + \
            self.options

        with subprocess.Popen(clingo_solve_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as p:
            out, err = p.communicate()
            if err and self.warn == "all":
                plain_nolinewrap(err.decode('utf-8'))
            clingo_json_output, __ = get_json([], out.decode('utf-8'))
        plain(_("SOLVING"))
        self.mock_clingo_app_output(clingo_json_output)
        return clingo_json_output

    def mock_clingo_app_output(self, clingo_json_output):
        for model in clingo_json_output['Witnesses']:
            plain(_("ANSWER_NUMBER").format(model['number']))
            plain(model['representation'])
            if len(model['cost']) > 0:
                plain(_("OPTIMIZATION_VALUES").format(
                    ' '.join(map(str,model['cost']))
                ))

        plain(f"{clingo_json_output['Result']}\n")
        if clingo_json_output['Models']['More'] == "yes":
            plain(_("MODELS_NUM_MORE").format(clingo_json_output['Models']['Number']))
        else:
            plain(_("MODELS_NUM").format(clingo_json_output['Models']['Number']))
        if clingo_json_output['Result'] == "OPTIMUM FOUND":
            plain(_("OPTIMUM_YES"))
        if clingo_json_output['optimum'] != [] and clingo_json_output[
                'Result'] == "SATISFIABLE":
            plain(_("OPTIMUM_UNKNOWN"))
        plain(f"Calls        : {clingo_json_output['Calls']}")
        plain(_("TIME").format(
            clingo_json_output['Time']['Total'],
            clingo_json_output['Time']['Solve'],
            clingo_json_output['Time']['Model'],
            clingo_json_output['Time']['Unsat'],
        ))
        plain(_("CPU_TIME").format(clingo_json_output['Time']['CPU']))
