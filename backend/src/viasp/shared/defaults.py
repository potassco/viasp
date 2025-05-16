import pathlib
import os
import json

DEFAULT_BACKEND_PROTOCOL = "http"
DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_FRONTEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 5050
DEFAULT_FRONTEND_PORT = 8050
DEFAULT_BACKEND_URL = f"{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}"
DEFAULT_FRONTEND_URL = f"{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_FRONTEND_HOST}:{DEFAULT_FRONTEND_PORT}"
DEFAULT_COLOR = "blue"
DEFAULT_LOCALE = "en" + ".json"
LOCALES_PATH = pathlib.Path(__file__).parent.parent.resolve() / "locales" / DEFAULT_LOCALE
SHARED_PATH = pathlib.Path(__file__).parent.resolve()
GRAPH_PATH = SHARED_PATH / "viasp_graph_storage.db"
SERVER_PATH =  pathlib.Path(__file__).parent.parent.resolve() / "server/"
STATIC_PATH =  os.path.join(SERVER_PATH, "static")
CLINGRAPH_PATH = os.path.join(STATIC_PATH, "clingraph")
PROGRAM_STORAGE_PATH = SHARED_PATH / "prg.lp"
STDIN_TMP_STORAGE_PATH = SHARED_PATH / "viasp_stdin_tmp.lp"
SERVER_PID_FILE_PATH = SERVER_PATH / "viasp_server.pid"
FRONTEND_PID_FILE_PATH = SERVER_PATH / "viasp_frontend.pid"
SORTGENERATION_TIMEOUT_SECONDS = 10
SORTGENERATION_BATCH_SIZE = 1000


def load_messages(json_path):
    with open(json_path, 'r') as file:
        messages = json.load(file)
    return messages

# Load messages from the JSON file
MESSAGES = load_messages(LOCALES_PATH)

def _(message_key):
    return MESSAGES.get(message_key, f"Message key '{message_key}' not found.")
