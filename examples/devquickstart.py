import sys
import os
import shutil

from clingo.script import enable_python
from viasp import Control
import atexit
from subprocess import Popen
from time import time, sleep
from viasp import clingoApiClient
from viasp.shared.defaults import (DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT,
                                   DEFAULT_BACKEND_PROTOCOL, CLINGRAPH_PATH, DEFAULT_FRONTEND_PORT,
                                   GRAPH_PATH, PROGRAM_STORAGE_PATH,
                                   STDIN_TMP_STORAGE_PATH)

enable_python()

session_id = ''

def main():
    options = [
        '0',
        ]

    ctl = Control(options, viasp_backend_url="http://localhost:5050")
    for path in sys.argv[1:]:
        ctl.load(path)
    if not sys.argv[1:]:
        ctl.load("-")
    ctl.ground([("base", [])])

    with ctl.solve(yield_=True) as handle:
        for m in handle:
            print("Answer:\n{}".format(m))
            ctl.viasp.mark(m)
        print(handle.get())
    ctl.viasp.show()
    ctl.viasp.clingraph(viz_encoding="viz_hamiltonian.lp",
                        engine="dot",
                        graphviz_type="digraph")
    global session_id
    session_id = ctl.viasp.get_session_id()


backend_url = f"{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}"

command = [
    "viasp_backend", "--host", "127.0.0.1", "--port",
    str(DEFAULT_BACKEND_PORT)
]

print(f"Starting backend at {backend_url}")
log = open('viasp.log', 'w', encoding="utf-8")
viasp_backend = Popen(command, stdout=log, stderr=log)

# make sure the backend is up, before continuing with other modules
t_start = time()
while True:
    if clingoApiClient.server_is_running(backend_url):
        break
    if time() - t_start > 30:
        raise Exception("Backend did not start in time.")


def terminate_process(process):
    """ kill the backend on keyboard interruptions"""
    print("\nKilling Backend")
    try:
        process.terminate()
    except OSError:
        print("Could not terminate viasp")


def close_file(file):
    """ close the log file"""
    file.close()


def del_files():
    """ when quitting app, remove all files in
            the static/clingraph folder
            and auxiliary program files
    """
    if os.path.exists(CLINGRAPH_PATH):
        shutil.rmtree(CLINGRAPH_PATH)
    for file in [GRAPH_PATH, PROGRAM_STORAGE_PATH, STDIN_TMP_STORAGE_PATH]:
        if os.path.exists(file):
            os.remove(file)


# kill the backend on keyboard interruptions
atexit.register(terminate_process, viasp_backend)
atexit.register(close_file, log)
atexit.register(del_files)

if __name__ == '__main__':
    main()
    print(
        f"Running at http://{DEFAULT_BACKEND_HOST}:{DEFAULT_FRONTEND_PORT}/?session={session_id}"
    )
    try:
        while True:
            sleep(1)
    except KeyboardInterrupt:
        print("Exiting...")
