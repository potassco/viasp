from enum import Enum


class Level(Enum):
    ERROR = 0
    WARN = 1
    INFO = 2
    DEBUG = 3
    TRACE = 4
    PLAIN = 5


def log(text: str, level=Level.INFO) -> None:
    if level == Level.ERROR:
        print(f"[ERROR] {text}")
    elif level == Level.WARN:
        print(f"[WARNING] {text}")
    elif level == Level.INFO:
        print(f"[INFO] {text}")
    elif level == Level.DEBUG:
        print(f"[ERROR] {text}")
    elif level == Level.TRACE:
        print(f"[ERROR] {text}")
    elif level == Level.PLAIN:
        print(text)
    else:
        print(text)

def prevent_none_execution(f):
    def wrapper(*args, **kwargs):
        if len(args) > 0 and len(args[0]) == 0:
            return
        else:
            f(*args, **kwargs)
    return wrapper

@prevent_none_execution
def error(text: str) -> None:
    log(text, Level.ERROR)


@prevent_none_execution
def warn(text: str) -> None:
    log(text, Level.WARN)


@prevent_none_execution
def info(text: str) -> None:
    log(text, Level.INFO)


@prevent_none_execution
def debug(text: str) -> None:
    log(text, Level.DEBUG)


@prevent_none_execution
def trace(text: str) -> None:
    log(text, Level.TRACE)


@prevent_none_execution
def plain(text: str) -> None:
    log(text, Level.PLAIN)
