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
import signal
import shutil
from contextlib import suppress


from viasp import clingoApiClient
from viasp.api import deregister_session
from viasp.shared.simple_logging import error, warn, plain, info
from viasp.shared.defaults import DEFAULT_BACKEND_URL, _
from viasp.shared.defaults import (DEFAULT_BACKEND_HOST,
                                   DEFAULT_BACKEND_PORT,
                                   DEFAULT_BACKEND_PROTOCOL,
                                   DEFAULT_FRONTEND_HOST,
                                   DEFAULT_FRONTEND_PORT,
                                   SERVER_PID_FILE_PATH,
                                   FRONTEND_PID_FILE_PATH,
                                   CLINGRAPH_PATH,
                                   GRAPH_PATH,
                                   PROGRAM_STORAGE_PATH,
                                   STDIN_TMP_STORAGE_PATH)

LOG_FILE = None

def run(host=DEFAULT_BACKEND_HOST,
        port=DEFAULT_BACKEND_PORT,
        front_host=DEFAULT_FRONTEND_HOST,
        front_port=DEFAULT_FRONTEND_PORT,
        do_wait_for_server_ready=True):
    """ create the dash app, set layout and start the backend on host:port """
    backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{host}:{port}"

    app = ViaspServerLauncher(backend_url, host, port, front_host, front_port)
    app.start_backend_server()
    if do_wait_for_server_ready:
        app.wait_for_backend_server_running()
    app.start_serving_frontend_files()
    return app


class ViaspServerLauncher:

    def __init__(self,
                 backend_url=DEFAULT_BACKEND_URL,
                 back_host=DEFAULT_BACKEND_HOST,
                 back_port=DEFAULT_BACKEND_PORT,
                 front_host=DEFAULT_FRONTEND_HOST,
                 front_port=DEFAULT_FRONTEND_PORT):
        self.backend_url = backend_url
        self.backend_host = back_host
        self.backend_port = back_port
        self.frontend_host = front_host
        self.frontend_port = front_port
        self.frontend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{front_host}:{front_port}"
        self.backend_server_process = None
        self.frontend_server_process = None
        self.session_id = None
        signal.signal(signal.SIGINT, self.signal_handler)

    def signal_handler(self, sig, frame):
        self.deregister_session()
        sys.exit(0)

    def deregister_session(self):
        remaining_sessions = deregister_session(
            self.session_id, viasp_backend_url=self.backend_url)
        if remaining_sessions == 0:
            self.shutdown_server()
            self.shutdown_frontend_server()

    def shutdown_server(self):
        if os.path.exists(SERVER_PID_FILE_PATH):
            with open(SERVER_PID_FILE_PATH, "r") as pid_file:
                pid = int(pid_file.read().strip())
                with suppress(ProcessLookupError):
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
                with suppress(ProcessLookupError):
                    os.kill(pid, signal.SIGTERM)
            os.remove(FRONTEND_PID_FILE_PATH)

    def start_backend_server(self):
        if not clingoApiClient.server_is_running(self.backend_url):
            env = os.getenv("ENV", "production")
            if env == "production":
                command = [
                    "waitress-serve", "--host", self.backend_host, "--port",
                    str(self.backend_port), "--call",
                    "viasp.server.factory:create_app"
                ]
            else:
                command = [
                    "viasp_backend", "--host", self.backend_host, "--port",
                    str(self.backend_port)
                ]
            global LOG_FILE
            LOG_FILE = open('viasp.log', 'w', encoding="utf-8")
            self.backend_server_process = Popen(command,
                                                preexec_fn=os.setsid,
                                                stdout=LOG_FILE,
                                                stderr=LOG_FILE)
            with open(SERVER_PID_FILE_PATH, "w") as pid_file:
                pid_file.write(str(self.backend_server_process.pid))

    def wait_for_backend_server_running(self):
        try:
            wait_for_server(self.backend_url)
        except Exception as final_error:
            print(f"Error: {final_error}")
            if self.backend_server_process:
                self.backend_server_process.kill()
            raise final_error

    def start_serving_frontend_files(self):
        if not clingoApiClient.server_is_running(self.frontend_url):
            env = os.getenv("ENV", "production")
            if env == "production":
                os.environ['BACKEND_URL'] = self.backend_url
                command = [
                    "waitress-serve", "--host", self.frontend_host, "--port",
                    str(self.frontend_port), "--call",
                    "viasp_dash.react_server:create_app"
                ]
            else:
                command = [
                    "viasp_frontend", "--host", self.frontend_host, "--port",
                    str(self.frontend_port), "--backend-url", self.backend_url
                ]

            self.frontend_server_process = Popen(command,
                                                 preexec_fn=os.setsid,
                                                 stdout=DEVNULL,
                                                 stderr=DEVNULL)
            with open(FRONTEND_PID_FILE_PATH, "w") as pid_file:
                pid_file.write(str(self.frontend_server_process.pid))

    def run(self, session_id, open_browser=True):
        self.session_id = session_id
        if session_id == "":
            frontend_url_with_session_id = self.frontend_url
        else:
            frontend_url_with_session_id = self.frontend_url + f"?session={session_id}"
        plain(_("VIASP_RUNNING_INFO").format(frontend_url_with_session_id))
        plain(_("VIASP_HALT_HELP"))

        if not _is_running_in_notebook() and open_browser:
            wait_for_server(self.frontend_url)
            webbrowser.open(frontend_url_with_session_id)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            sys.exit(0)


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


@retry(
    wait_exponential_multiplier=100,
    wait_exponential_max=2000,
    stop_max_delay=20000,
)
def wait_for_server(server_url):
    try:
        assert clingoApiClient.server_is_running(server_url)
    except Exception as e:
        raise Exception("Server did not start in time.") from e
