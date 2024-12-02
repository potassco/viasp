import pathlib
import os

DEFAULT_BACKEND_PROTOCOL = "http"
DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 5050
DEFAULT_FRONTEND_PORT = 8050
DEFAULT_BACKEND_URL = f"{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}"
DEFAULT_COLOR = "blue"
SHARED_PATH = pathlib.Path(__file__).parent.resolve()
GRAPH_PATH = SHARED_PATH / "viasp_graph_storage.db"
SERVER_PATH =  pathlib.Path(__file__).parent.parent.resolve() / "server/"
STATIC_PATH =  os.path.join(SERVER_PATH, "static")
CLINGRAPH_PATH = os.path.join(STATIC_PATH, "clingraph")
PROGRAM_STORAGE_PATH = SHARED_PATH / "prg.lp"
STDIN_TMP_STORAGE_PATH = SHARED_PATH / "viasp_stdin_tmp.lp"
COLOR_PALETTE_PATH = SERVER_PATH / "colorPalette.json"
SORTGENERATION_TIMEOUT_SECONDS = 10
SORTGENERATION_BATCH_SIZE = 1000


# Messages Strings
BACKEND_UNAVAILABLE_STR = "Backend is unavailable at ({})"
REGISTER_FUNCTION_CALL_SUCCESS_STR = ""
REGISTER_FUNCTION_CALL_FAILED_STR = "Registering function call failed [{}] ({})"
MARK_MODELS_SUCCESS_STR = "Save stable model."
MARK_MODELS_FAILED_STR = "Setting models failed [{}] ({})"
SHOW_SUCCESS_STR = "Generate graph."
SHOW_FAILED_STR = "Drawing failed [{}] ({})"
RELAX_CONSTRAINTS_SUCCESS_STR = "Successfully transformed program constraints."
RELAX_CONSTRAINTS_FAILED_STR = "Failed to relax proram [{}] ({})"
CLEAR_PROGRAM_SUCCESS_STR = ""
CLEAR_PROGRAM_FAILED_STR = "Clearing program failed [{}] ({})"
CLINGRAPH_SUCCESS_STR = "Clingraph visualization in progress."
CLINGRAPH_FAILED_STR = "Failed Clingraph visualization [{}] ({})"
TRANSFORMER_REGISTER_SUCCESS_STR = "Transformer registered successfully."
TRANSFORMER_REGISTER_FAILED_STR = "Failed to register Transformer [{}] ({})"
REGISTER_WARNING_SUCCESS_STR = ""
REGISTER_WARNING_FAILED_STR = "Failed to register warning [{}] ({})"
