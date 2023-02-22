"""
This module can be used to interact with the viasp backend.

The module provides similar functions to viASP's proxy Control class,
but independently of a clingo program.

In addition to the proxy's functions, this module provides functions to
interact with it outside of a clingo program. Models can be marked
directly from strings or files containing the corresponding facts.
"""

from inspect import signature
from typing import List, cast

import clingo
from clingo import Control as InnerControl
from clingo import Model as clingo_Model
from clingo import ast
from clingo.ast import AST, ASTSequence, ASTType, Symbol

from .shared.defaults import STDIN_TMP_STORAGE_PATH
from .shared.io import clingo_symbols_to_stable_model
from .wrapper import ShowConnector

__all__ = [
    "load_program_file",
    "load_program_string",
    "add_program_file",
    "add_program_string",
    "mark_from_clingo_model",
    "mark_from_string",
    "mark_from_file",
    "unmark_from_clingo_model",
    "unmark_from_string",
    "unmark_from_file",
    "clear",
    "show",
    "relax_constraints",
    "clingraph"
]

SHOWCONNECTOR = None

def _get_connector(**kwargs):
    global SHOWCONNECTOR
    if SHOWCONNECTOR is None:
        SHOWCONNECTOR = ShowConnector(**kwargs)
        SHOWCONNECTOR.register_function_call(
            "__init__", signature(InnerControl.__init__), [], kwargs={})
    return SHOWCONNECTOR


def _get_program_string(path):
    prg = ""
    with open(path, encoding="utf-8") as f:
        prg = "".join(f.readlines())
    return prg


def load_program_file(path: str, **kwargs) -> None:
    r"""
    Load a (non-ground) program file into the viasp backend

    :param path: ``str``
        path to the program file
    :param kwargs: 
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.register_function_call("load", signature(
        InnerControl.load), [], kwargs={"path": path})


def load_program_string(program: str, **kwargs) -> None:
    r"""
    Load a (non-ground) program into the viasp backend

    :param program: ``str``
        the program to load
    :param kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    with open(STDIN_TMP_STORAGE_PATH, "w", encoding="utf-8") as f:
        f.write(program)
    connector.register_function_call("load", signature(
        InnerControl.load), [], kwargs={"path": STDIN_TMP_STORAGE_PATH})



def add_program_file(*args, **kwargs):
    r"""
    Add a (non-ground) program file to the viasp backend.
    This function provides two overloads, similar to ``clingo.control.Control.add``.

    ```python
    def add(self, name: str, parameters: Sequence[str], path: str) -> None:
        ...

    def add(self, path: str) -> None:
        return self.add("base", [], path)
    ```

    :param name: ``str``
        The name of program block to add.
    :param parameters: ``Sequence[str]``
        The parameters of the program block to add.
    :param path: ``str``
        The path to the non-ground program.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    add_program_string
    """
    if "_viasp_client" in kwargs:
        del kwargs["_viasp_client"]

    n = len(args) + len(kwargs)
    if n == 1:
        kwargs["program"] = _get_program_string(args[0])
        args = []
    elif "program" in kwargs:
        kwargs["program"]= _get_program_string(kwargs["program"])
    else:
        kwargs["program"] = _get_program_string(args[2])

    add_program_string(*args,**kwargs)


def add_program_string(*args, **kwargs) -> None:
    r"""
    Add a (non-ground) program file to the viasp backend.
    This function provides two overloads, similar to ``clingo.control.Control.add``.

    ```python
    def add(self, name: str, parameters: Sequence[str], program: str) -> None:
        ...

    def add(self, program: str) -> None:
        return self.add("base", [], program)
    ```

    :param name: ``str``
        The name of program block to add.
    :param parameters: ``Sequence[str]``
        The parameters of the program block to add.
    :param program: ``str``
        The non-ground program in string form.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See also:
    ---------
    ``add_program_file``
    """
    connector = _get_connector(**kwargs)
    if "_viasp_client" in kwargs:
        del kwargs["_viasp_client"]


    n = len(args) + len(kwargs)
    if n == 1:
        pass_kwargs = dict(zip(['name', 'parameters', 'program'], \
                               ["base", [], kwargs["program"] \
                                    if "program" in kwargs else args[0]]))
    else:
        pass_kwargs = dict()
        pass_kwargs["name"] = kwargs["name"] \
                    if "name" in kwargs else args[0]
        pass_kwargs["parameters"] = kwargs["parameters"] \
                    if "parameters" in kwargs else args[1]
        pass_kwargs["program"] = kwargs["program"] \
                    if "program" in kwargs else args[2]

    connector.register_function_call(
        "add", signature(InnerControl._add2), [], kwargs=pass_kwargs)


def show(**kwargs) -> None:
    r"""
    Propagate the marked models to the backend and Generate the graph.
    """
    connector = _get_connector(**kwargs)
    connector.show()


def mark_from_clingo_model(model: clingo_Model, **kwargs) -> None:
    r"""
    Mark a model to be visualized. Models can be unmarked and cleared.
    The marked models are propagated to the backend when ``show`` is called.

    :param model: ``clingo.solving.Model``
        The model to mark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``unmark_from_clingo_model``
    ``mark_from_string``
    ``mark_from_file``
    """
    connector = _get_connector(**kwargs)
    connector.mark(model)


def unmark_from_clingo_model(model: clingo_Model, **kwargs) -> None:
    r"""
    Unmark a model.

    :param model: ``clingo.solving.Model``
        The model to unmark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.unmark(model)


def clear(**kwargs) -> None:
    """
    Clear all marked models.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.clear()


def relax_constraints(*args, **kwargs) -> str:
    r"""
    Relax constraints in the marked models.


    """
    connector = _get_connector()
    return connector.relax_constraints(*args, **kwargs)


def clingraph(viz_encoding, engine) -> None:
    r"""
    Generate the a clingraph from the marked models. And the visualization encoding

    :param viz_encoding: ``str``
        The path to the visualization encoding.
    :param engine: ``str``
        The visualization engine. See ``clingraph`` for more details.
    """
    connector = _get_connector()
    connector.clingraph(viz_encoding, engine)


# ------------------------------------------------------------------------------
# Parse ASP facts from a string or files into a clingo model
# ------------------------------------------------------------------------------


class ClingoParserWrapperError(Exception):
    r"""A special exception for returning from the clingo parser.

    I think the clingo parser is assuming all exceptions behave as if they have
    a copy constructor.

    """
    def __init__(self, arg):
        if type(arg) == type(self):
            self.exc = arg.exc
        else:
            self.exc = arg
        super().__init__()


class FactParserError(Exception):
    def __init__(self,message: str, line: int, column: int):
        self.line = line
        self.column = column
        super().__init__(message)


class NonFactVisitor:
    ERROR_AST = set({
        ASTType.Id,
        ASTType.Variable,
        ASTType.BinaryOperation,
        ASTType.Interval,
        ASTType.Pool,
        ASTType.BooleanConstant,
        ASTType.Comparison,
        getattr(ASTType, "Guard" if clingo.version() >= (5, 6, 0)
                         else "AggregateGuard"),
        ASTType.ConditionalLiteral,
        ASTType.Aggregate,
        ASTType.BodyAggregateElement,
        ASTType.BodyAggregate,
        ASTType.HeadAggregateElement,
        ASTType.HeadAggregate,
        ASTType.Disjunction,
        ASTType.TheorySequence,
        ASTType.TheoryFunction,
        ASTType.TheoryUnparsedTermElement,
        ASTType.TheoryUnparsedTerm,
        ASTType.TheoryGuard,
        ASTType.TheoryAtomElement,
        ASTType.TheoryAtom,
        ASTType.TheoryOperatorDefinition,
        ASTType.TheoryTermDefinition,
        ASTType.TheoryGuardDefinition,
        ASTType.TheoryAtomDefinition,
        ASTType.Definition,
        ASTType.ShowSignature,
        ASTType.ShowTerm,
        ASTType.Minimize,
        ASTType.Script,
        ASTType.External,
        ASTType.Edge,
        ASTType.Heuristic,
        ASTType.ProjectAtom,
        ASTType.ProjectSignature,
        ASTType.Defined,
        ASTType.TheoryDefinition})

    def __call__(self, stmt: AST) -> None:
        self._stmt = stmt
        self._visit(stmt)

    def _visit(self, ast_in: AST) -> None:
        '''
        Dispatch to a visit method.
        '''
        if (ast_in.ast_type in NonFactVisitor.ERROR_AST or
                (ast_in.ast_type == ASTType.Function and ast_in.external)):
            line = cast(ast.Location, ast_in.location).begin.line
            column = cast(ast.Location, ast_in.location).begin.column
            exc = FactParserError(message=f"Non-fact '{self._stmt}'",
                                  line=line, column=column)
            raise ClingoParserWrapperError(exc)

        for key in ast_in.child_keys:
            subast = getattr(ast_in, key)
            if isinstance(subast, ASTSequence):
                for x in subast:
                    self._visit(x)
            if isinstance(subast, AST):
                self._visit(subast)


def parse_fact_string(aspstr: str, raise_nonfact: bool = False) -> List[Symbol]:
    ctl = InnerControl()
    try:
        if raise_nonfact:
            with ast.ProgramBuilder(ctl) as bld:
                nfv = NonFactVisitor()

                def on_rule(ast: AST) -> None:
                    nonlocal nfv, bld
                    if nfv: nfv(ast)
                    bld.add(ast)
                ast.parse_string(aspstr, on_rule)
        else:
            ctl.add("base", [], aspstr)
    except ClingoParserWrapperError as e:
        raise e.exc

    ctl.ground([("base", [])])

    return [sa.symbol for sa in ctl.symbolic_atoms if sa.is_fact]


def mark_from_string(model: str, **kwargs) -> None:
    r"""
    Parse a string of ASP facts and mark them as a model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).")

    Models can be unmarked and cleared.
    The marked models are propagated to the backend when ``show`` is called.

    :param model: ``str``
        The facts of the model to mark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``mark_from_clingo_model``
    ``mark_from_file``
    """
    symbols = parse_fact_string(model, raise_nonfact=True)
    connector = _get_connector(**kwargs)
    model = clingo_symbols_to_stable_model(symbols)
    connector.mark(model)


def mark_from_file(path: str, **kwargs) -> None:
    r"""
    Parse a file containing a string of ASP facts and mark them as a model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).")

    Models can be unmarked and cleared.
    The marked models are propagated to the backend when ``show`` is called.

    :param path: ``str``
        The path to the file containing the facts of the model to mark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``mark_from_clingo_model``
    ``mark_from_string``
    """
    mark_from_string(_get_program_string(path), **kwargs)


def unmark_from_string(model: str, **kwargs) -> None:
    r"""
    Parse a string of ASP facts and unmark the corresponding model.

    The string must be an exact match to the model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).").

    Changes to marked models are propagated to the backend when ``show`` is called.

    :param model: ``str``
        The facts of the model to unmark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``unmark_from_clingo_model``
    ``unmark_from_string``
    """
    symbols = parse_fact_string(model, raise_nonfact=True)
    connector = _get_connector(**kwargs)
    model = clingo_symbols_to_stable_model(symbols)
    connector.unmark(model)


def unmark_from_file(path: str, **kwargs) -> None:
    r"""
    Parse a file containing a string of ASP facts and unmark the corresponding model.

    The string must be an exact match to the model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).").

    Changes to marked models are propagated to the backend when ``show`` is called.


    :param path: ``str``
        The path to the file containing the facts of the model to unmark.
    :param kwargs:
        * *viasp_backend_url* (``str``) --
            url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``unmark_from_clingo_model``
    ``unmark_from_string``
    """
    unmark_from_string(_get_program_string(path), **kwargs)