from enum import Enum

VERBOSE = False

class Level(Enum):
    ERROR = 0
    WARN = 1
    INFO = 2
    DEBUG = 3
    TRACE = 4
    PLAIN = 5
    NOLINEWRAP = 6


def log(text: str, level=Level.INFO) -> None:
    if level == Level.ERROR:
        print(f"*** ERROR: (viasp): {text}")
    elif level == Level.WARN:
        print(f"*** WARNING: (viasp): {text}")
    elif level == Level.INFO:
        print(f"*** INFO: (viasp): {text}")
    elif level == Level.DEBUG:
        print(f"*** ERROR: (viasp): {text}")
    elif level == Level.TRACE:
        print(f"*** ERROR: (viasp): {text}")
    elif level == Level.PLAIN:
        print(text)
    elif level == Level.NOLINEWRAP:
        print(text, end="")
    else:
        print(text)

def prevent_none_execution(f):
    def wrapper(*args, **kwargs):
        if len(args) > 0 and len(args[0]) == 0:
            return
        else:
            f(*args, **kwargs)
    return wrapper

def isEnabledFor(level: Level) -> bool:
    global VERBOSE
    if VERBOSE:
        return True
    return level.value <= Level.WARN.value

@prevent_none_execution
def error(text: str) -> None:
    if isEnabledFor(Level.ERROR):
        log(text, Level.ERROR)


@prevent_none_execution
def warn(text: str) -> None:
    if isEnabledFor(Level.WARN):
        log(text, Level.WARN)


@prevent_none_execution
def info(text: str) -> None:
    if isEnabledFor(Level.INFO):
        log(text, Level.INFO)


@prevent_none_execution
def debug(text: str) -> None:
    if isEnabledFor(Level.DEBUG):
       log(text, Level.DEBUG)


@prevent_none_execution
def trace(text: str) -> None:
    if isEnabledFor(Level.TRACE):
        log(text, Level.TRACE)


@prevent_none_execution
def plain(text: str) -> None:
    log(text, Level.PLAIN)

@prevent_none_execution
def plain_nolinewrap(text: str) -> None:
    log(text, Level.NOLINEWRAP)
