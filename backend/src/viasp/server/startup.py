"""
    The module can be imported to create the dash app,
    set the standard layout and start the backend.

    The backend is killed automatically on keyboard interruptions.

    Make sure to import it as the first viasp module,
    before other modules (which are dependent on the backend).

    The backend is started on the localhost on port 5050.
"""
import sys
import os
import time
import webbrowser
from subprocess import Popen, DEVNULL
from retrying import retry

from dash import Dash, jupyter_dash
from dash._jupyter import _jupyter_config

from viasp import clingoApiClient
from viasp.shared.simple_logging import error, warn, plain, info
from viasp.shared.defaults import DEFAULT_BACKEND_URL, _
from viasp.shared.defaults import (DEFAULT_BACKEND_HOST,
                                   DEFAULT_BACKEND_PORT,
                                   DEFAULT_BACKEND_PROTOCOL,
                                   DEFAULT_FRONTEND_HOST,
                                   DEFAULT_FRONTEND_PORT,
                                   SERVER_PID_FILE_PATH,
                                   FRONTEND_PID_FILE_PATH,
                                   DEFAULT_COLOR)

LOG_FILE = None

def run(host=DEFAULT_BACKEND_HOST,
        port=DEFAULT_BACKEND_PORT,
        primary_color=DEFAULT_COLOR):
    """ create the dash app, set layout and start the backend on host:port """

    # if running in binder, get proxy information
    # and set the backend URL, which will be used
    # by the frontend
    if 'BINDER_SERVICE_HOST' in os.environ:
        jupyter_dash.infer_jupyter_proxy_config()
    if ('server_url' in _jupyter_config and 'base_subpath' in _jupyter_config):
        _default_server_url = _jupyter_config['server_url']

        _default_requests_pathname_prefix = (
            _jupyter_config['base_subpath'].rstrip('/') + '/proxy/' +
            str(port))

        backend_url = _default_server_url + _default_requests_pathname_prefix
    elif 'google.colab' in sys.modules:
        from google.colab.output import eval_js  # type: ignore
        backend_url = eval_js(f"google.colab.kernel.proxyPort({port})")
    else:
        backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"

    if clingoApiClient.backend_is_running(backend_url):
        return ViaspDash(
            backend_url=backend_url,
            primary_color=primary_color)

    env = os.getenv("ENV", "production")
    if env == "production":
        command = ["waitress-serve", "--host", host, "--port", str(port), "--call", "viasp.server.factory:create_app"]
    else:
        command = ["viasp_server", "--host", host, "--port", str(port)]
    # if 'ipykernel_launcher.py' in sys.argv[0]:
    #     display_refresh_button()

    # print(f"Starting backend at {backend_url}")
    global LOG_FILE
    LOG_FILE = open('viasp.log', 'w', encoding="utf-8")
    server_process = Popen(command,
                                  preexec_fn=os.setsid,
                                  stdout=LOG_FILE, stderr=LOG_FILE)
    with open(SERVER_PID_FILE_PATH, "w") as pid_file:
        pid_file.write(str(server_process.pid))

    app = ViaspDash(
        backend_url=backend_url,
        primary_color=primary_color)
    app.start_serving_frontend_files()
    # suppress dash's flask server banner
    cli = sys.modules['flask.cli']
    cli.show_server_banner = lambda *x: None  # type: ignore

    # make sure the backend is up, before continuing with other modules
    @retry(
        wait_exponential_multiplier=100,
        wait_exponential_max=2000,
        stop_max_delay=20000,
    )
    def wait_for_backend():
        try:
            assert clingoApiClient.backend_is_running(backend_url)
        except Exception as e:
            raise Exception("Backend did not start in time.") from e

    try:
        wait_for_backend()
    except Exception as final_error:
        print(f"Error: {final_error}")
        server_process.terminate()
        raise final_error

    return app


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

class ViaspDash(Dash):

    def __init__(self,
                 backend_url=DEFAULT_BACKEND_URL,
                 primary_color=DEFAULT_COLOR):
        self.backend_url = backend_url
        self.primary_color = primary_color

    def start_serving_frontend_files(self,
                     host=DEFAULT_FRONTEND_HOST,
                     port=DEFAULT_FRONTEND_PORT):
        if not clingoApiClient.frontend_is_running(f"http://{host}:{port}"):
            env = os.getenv("ENV", "production")
            if env == "production":
                os.environ['BACKEND_URL'] = self.backend_url
                os.environ['VIASP_PRIMARY_COLOR'] = self.primary_color
                command = [
                    "waitress-serve", "--host", host, "--port",
                    str(port), "--call", "viasp_dash.react_server:create_app"
                ]
            else:
                command = [
                    "viasp_frontend", "--host", host, "--port",
                    str(port), "--backend-url", self.backend_url, "--color",
                    self.primary_color
                ]

            server_process = Popen(command,
                                   preexec_fn=os.setsid,
                                   stdout=DEVNULL,
                                   stderr=DEVNULL)
            with open(FRONTEND_PID_FILE_PATH, "w") as pid_file:
                pid_file.write(str(server_process.pid))

    def run(self,
            session_id,
            host=DEFAULT_FRONTEND_HOST,
            port=DEFAULT_FRONTEND_PORT):
        frontend_url_with_session_id = f"http://{host}:{port}?token={session_id}"
        plain(_("VIASP_RUNNING_INFO").format(frontend_url_with_session_id))
        plain(_("VIASP_HALT_HELP"))

        if not _is_running_in_notebook():
            while True:
                if clingoApiClient.frontend_is_running(f"http://{host}:{port}"):
                    break
                time.sleep(0.01)
            webbrowser.open(frontend_url_with_session_id)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            sys.exit(0)
