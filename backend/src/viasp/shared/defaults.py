import pathlib
import os
import json

DEFAULT_BACKEND_PROTOCOL = "http"
DEFAULT_BACKEND_HOST = "127.0.0.1"
DEFAULT_BACKEND_PORT = 5050
DEFAULT_FRONTEND_PORT = 8050
DEFAULT_BACKEND_URL = f"{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}"
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
COLOR_PALETTE_PATH = SERVER_PATH / "colorPalette.json"
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
# # Messages Strings
# BACKEND_UNAVAILABLE = "Backend is unavailable at ({})"
# REGISTER_FUNCTION_CALL_SUCCESS = ""
# REGISTER_FUNCTION_CALL_FAILED = "Registering function call failed [{}] ({})"
# MARK_MODELS_SUCCESS = "Save stable model."
# MARK_MODELS_FAILED = "Setting models failed [{}] ({})"
# SHOW_SUCCESS = "Generate graph."
# SHOW_FAILED = "Drawing failed [{}] ({})"
# RELAX_CONSTRAINTS_SUCCESS = "Successfully transformed program constraints."
# RELAX_CONSTRAINTS_FAILED = "Failed to relax proram [{}] ({})"
# CLEAR_PROGRAM_SUCCESS = ""
# CLEAR_PROGRAM_FAILED = "Clearing program failed [{}] ({})"
# CLINGRAPH_SUCCESS = "Clingraph visualization in progress."
# CLINGRAPH_FAILED = "Failed Clingraph visualization [{}] ({})"
# TRANSFORMER_REGISTER_SUCCESS = "Transformer registered successfully."
# TRANSFORMER_REGISTER_FAILED = "Failed to register Transformer [{}] ({})"
# REGISTER_WARNING_SUCCESS = ""
# REGISTER_WARNING_FAILED = "Failed to register warning [{}] ({})"

# BACKENDHOST_HELP = 'The host for the backend'
# BACKENDPORT_HELP = 'The port for the backend'
# VIASP_BACKEND_TITLE_HELP = 'viasp backend'
# STARTING_VIASP_BACKEND_HELP = 'Starting viASP backend at {}:{}'

# UNKNOWN = "UNKNOWN"
# ERROR = "(viasp) {}"
# ERROR_INFO = "(viasp) Try '--help' for usage information"
# ERROR_OPEN = "<cmd>: error: file could not be opened:\n  {}\n"
# ERROR_PARSING = "parsing failed"
# WARNING_INCLUDED_FILE = "<cmd>: already included file:\n  {}\n"


# VIASP_VERSION_STR = "viasp version {}"
# VIASP_ARG_PARSE_ERROR_STRING = "{}"
# VIASP_NAME_STRING = "viasp "
# CLINGO_HELP_STRING = "Clingo Options:\n    --<option>[=<value>]\t: Set clingo <option> [to <value>]"
# USAGE_STRING = "usage"
# VIASP_USAGE_STRING = "viasp [options] [files]"
# EPILOG_STRING = "Default command-line:\nviasp --models 0 [files]\n\nviasp is part of Potassco: https://potassco.org/\nGet help/report bugs via : https://potassco.org/support"
# COPYTIGHT_STRING = "Copyright (C) Stephan Zwicknagl, Luis Glaser\nLicense: The MIT License <https://opensource.org/licenses/MIT>"
# INVALID_OPT_MODE_STRING = "Invalid value for opt-mode: {}"

# NO_DEFINITION_FOR_CONSTANT_STR = "No definition for constant: {}"
# CONSTANT_DEFINED_TWICE_STR = "constant {} defined twice"

# VIASP_FILES_HELP_STRING = ": Files containing ASP encodings\nOptionally, a single JSON file defining the answer set(s) in clingo's\n`--outf=2` format"
# VIASP_STDIN_HELP_STRING = ": Standard input in form of an ASP encoding or JSON in clingo's `--outf=2` format"

# VIASP_BASIC_OPTION = "Basic Options"
# VIASP_HELP_HELP = ": Print help and exit"
# HELP_CLINGO_HELP = ": Print {1=basic|2=more|3=full} clingo help and exit"
# VIASP_VERSION_HELP = ": Print version information and exit"
# VIASP_HOST_HELP = ": The host for the backend and frontend"
# VIASP_PORT_BACKEND_HELP = ": The port for the backend"
# VIASP_PORT_FRONTEND_HELP = ": The port for the frontend"
# VIASP_PRIMARY_COLOR_HELP = ": The primary color"
# VIASP_VERBOSE_LOGGING_HELP = ": Enable verbose logging"

# CLINGO_SOLVING_OPTION = "Solving Options"
# CLINGO_MODELS_HELP = ": Compute at most <n> models (0 for all)"
# CLINGO_SELECT_MODEL_HELP = ": Select only one of the models when using a json input\n  Defined by an index for accessing the models, starting in index 0\n  Can appear multiple times to select multiple models"

# CLINGRAPH_OPTION = "Clingraph Options"
# CLINGRAPH_OPTION_DESCRIPTION = "If included, a Clingraph visualization will be made."
# CLINGRAPH_PATH_HELP = ": Path to the visualization encoding"
# CLINGRAPH_ENGINE_HELP = ": The visualization engine (refer to clingraph documentation)"
# CLINGRAPH_TYPE_HELP = ": The graph type (refer to clingraph documentation)"

# RELAXER_OPTIONS = "Relaxation Options"
# RELAXER_PRINT_RELAX_HELP = ": Use the relaxer and output the transformed program"
# RELAXER_RELAX_HELP = ": Use the relaxer and visualize the transformed program"
# RELAXER_GROUP_HELP = "Options for the relaxation of integrity constraints in unsatisfiable programs."
# RELAXER_HEAD_NAME_HELP = ": The name of the head predicate"
# RELAXER_COLLECT_VARIABLE_NAME_HELP = ": Do not collect variables from body as a tuple in the head literal"
# RELAXER_OPT_MODE_HELP = ": Clingo optimization mode for the relaxed program"


# WARN_UNSATISFIABLE_STRING = f"The input program is unsatisfiable. To visualize the relaxed program use:\n    {RELAXER_GROUP_HELP}\n        --print-relax{RELAXER_PRINT_RELAX_HELP}\n        --relax      {RELAXER_RELAX_HELP}"

# READING_FROM_PROLOGUE = "Reading from {}"

# WARN_NO_STABLE_MODEL = "The relaxed program has no stable models."
# WARN_OPTIMALITY_NOT_GUARANTEED = "(clingo): #models not 0: optimality of last model not guaranteed."
# SWITCH_TO_TRANSFORMED_VISUALIZATION = "No answer sets found. Switching to transformed visualization."
# VIASP_RUNNING_INFO = "viASP is running at: {}"
# VIASP_HALT_HELP = "Press Ctrl+C to exit."
