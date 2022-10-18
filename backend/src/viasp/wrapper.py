import json
import sys
import shutil
import re
from inspect import signature
from typing import List

from clingo import Control as InnerControl, Model
from dataclasses import asdict, is_dataclass

from .clingoApiClient import ClingoClient
from .shared.defaults import STDIN_TMP_STORAGE_PATH, SHARED_PATH
from .shared.io import clingo_model_to_stable_model
from .shared.model import StableModel


def is_non_cython_function_call(attr: classmethod):
    return hasattr(attr, "__call__") and not attr.__name__.startswith("_") and not attr.__name__.startswith("<")


class ShowConnector:

    def __init__(self, **kwargs):
        self._marked: List[StableModel] = []
        if "_viasp_client" in kwargs:
            self._database = kwargs["_viasp_client"]
        else:
            self._database = ClingoClient(**kwargs)
        self._connection = None

    def show(self):
        self._database.set_target_stable_model(self._marked)
        self._database.show()

    def unmark(self, model: Model):
        serialized = clingo_model_to_stable_model(model)
        self._marked.remove(serialized)

    def mark(self, model: Model):
        serialized = clingo_model_to_stable_model(model)
        self._marked.append(serialized)

    def clear(self):
        self._marked.clear()

    def register_function_call(self, name, sig, args, kwargs):
        self._database.register_function_call(name, sig, args, kwargs)

    def relax_constraints(self, *args, **kwargs):
        r"""This method relaxes integrity constraints and returns a modified program.
        Parameters
        ----------
        **kwargs:
            Valid keyword arguments are:

            head_name: str
                default="unsat" (name of the head literal)
            collect_variables: bool
                default=True (collect variables from body as a tuple in the head literal)
        """
        r = self._database.relax_constraints(*args, **kwargs)
        with open("transform.log", "a") as f:
                f.write("\n\n")
                f.write(r["program"])
        
        return self.ast_from_str(r["program"])


    def ast_from_str(self, program: str):

# Id, Variable, SymbolicTerm, UnaryOperation, BinaryOperation, Interval, Function, Pool, BooleanConstant, SymbolicAtom, Comparison, Guard, ConditionalLiteral, Aggregate, BodyAggregateElement, BodyAggregate, HeadAggregateElement, HeadAggregate, Disjunction, TheorySequence, TheoryFunction, TheoryUnparsedTermElement, TheoryUnparsedTerm, TheoryGuard, TheoryAtomElement,TheoryAtom, Literal,TheoryOperatorDefinition, TheoryTermDefinition, TheoryGuardDefinition, TheoryAtomDefinition, Rule, Definition, ShowSignature, ShowTerm, Minimize, Script, Program, External, Edge, Heuristic, ProjectAtom, ProjectSignature, Defined, TheoryDefinition
        x = f"""
from clingo import ast, Symbol, Function
from clingo import *
from clingo.ast import Location, Position
self.arr={program}
print("tada")
"""
        exec(x)
        return self.arr

    
    def clingraph(self, viz_encoding, engine="dot"):
        self._database.clingraph(viz_encoding, engine)



class Control(InnerControl):

    def __init__(self, *args, **kwargs):
        self.viasp = ShowConnector(**kwargs)
        if "_viasp_client" in kwargs:
            del kwargs["_viasp_client"]
        if "viasp_backend_url" in kwargs:
            del kwargs["viasp_backend_url"]
        self.viasp.register_function_call("__init__", signature(super().__init__), args, kwargs)
        super().__init__(*args, **kwargs)

    def load(self, path: str) -> None:
        if path == "-":
            path = STDIN_TMP_STORAGE_PATH
            tmp = sys.stdin.readlines()
            with open(path, "w", encoding="utf-8") as f:
                f.writelines(tmp)
        else:
            shutil.copy(path, STDIN_TMP_STORAGE_PATH)
            path = STDIN_TMP_STORAGE_PATH
        self.viasp.register_function_call("load", signature(self.load), [], kwargs={"path": path})
        super().load(path=str(path))

    def __getattribute__(self, name):
        attr = InnerControl.__getattribute__(self, name)
        if is_non_cython_function_call(attr) and name != "load":
            def wrapper_func(*args, **kwargs):
                self.viasp.register_function_call(attr.__name__, signature(attr), args, kwargs)
                result = attr(*args, **kwargs)
                return result

            return wrapper_func
        else:
            return attr


class Control2:
    
    
    def __init__(self, *args, **kwargs):
        if 'files' in kwargs:
            arguments = ([opt for opt in sys.argv[1:] if opt not in kwargs['files']])
            args = (arguments,)
            del kwargs['files']
        if 'control' in kwargs:
            self.passed_control = kwargs['control']
            del kwargs['control']
        else:
            self.passed_control = InnerControl(*args)
        self.viasp = ShowConnector(**kwargs)

        if "_viasp_client" in kwargs:
            del kwargs["_viasp_client"]
        if "viasp_backend_url" in kwargs:
            del kwargs["viasp_backend_url"]
        
        self.viasp.register_function_call("__init__", signature(self.passed_control.__init__), args, kwargs)

    def load(self, path: str) -> None:
        if path == "-":
            path = STDIN_TMP_STORAGE_PATH
            tmp = sys.stdin.readlines()
            with open(path, "w", encoding="utf-8") as f:
                f.writelines(tmp)
        else:
            shutil.copy(path, STDIN_TMP_STORAGE_PATH)
            path = STDIN_TMP_STORAGE_PATH
        self.viasp.register_function_call("load", signature(self.passed_control.load), [], kwargs={"path": path}) #? or self.passed_control.load
        self.passed_control.load(path=str(path))

    def add(self, *args, **kwargs):
        self.viasp.register_function_call("add", signature(self.passed_control._add2), [], kwargs=dict(zip(['name', 'parameters', 'program'], args)))
        self.passed_control.add(*args, **kwargs)

    def __getattribute__(self, name):
        try:
            attr = object.__getattribute__(self, name)
        except AttributeError:
            attr = self.passed_control.__getattribute__(name) 
        if is_non_cython_function_call(attr) and name != "load" and name != "add":
            def wrapper_func(*args, **kwargs):
                self.viasp.register_function_call(attr.__name__, signature(attr), args, kwargs)
                result = attr(*args, **kwargs)
                return result

            return wrapper_func
        else:
            return attr

class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if is_dataclass(o):
            return asdict(o)
        return super().default(o)
