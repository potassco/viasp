from typing import Any, Dict, Sequence, Optional, Callable

from clingo import Control

from ..shared.model import ClingoMethodCall
from ..shared.simple_logging import info, warn


def handler(cls):
    cls.handlers = {}
    for methodname in dir(cls):
        method = getattr(cls, methodname)
        if hasattr(method, '_handles'):
            for name in method._handles:
                cls.handlers[name] = method
    return cls


def handles(*args):
    def wrapper(func):
        func._handles = args
        return func

    return wrapper


@handler
class MagicThingythatwraps:

    def _get_handling_function(self, func_name: str) -> Optional[Callable]:
        for func, responsive_for in self.handlers.items():
            if func_name in responsive_for:
                return func

    def apply(self, ctl: Control, call: ClingoMethodCall) -> Control:
        func = self.handlers.get(call.name, None)
        if func is None:
            warn(f"No function for {call.name} found. Defaulting to NOOP.")
            return self.no_op(ctl, call)
        info(f"Handling {call.name} with {func.__name__}()")
        return func(self, ctl, call)

    @handles("DEFAULT")
    def no_op(self, ctl, _) -> Control:
        return ctl

    @handles("ground", "add")
    def identity(self, ctl: Control, call: ClingoMethodCall) -> Control:
        func = getattr(ctl, call.name)  # TODO: Error handling
        func(**call.kwargs)
        return ctl

    @handles("__init__")
    def create_(self, _, call: ClingoMethodCall):
        return Control(**call.kwargs)


def replay(calls: Sequence[ClingoMethodCall]) -> Control:
    player = MagicThingythatwraps()
    next = None
    for call in calls:
        next = player.apply(next, call)
    return next
