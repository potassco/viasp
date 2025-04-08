"""
This module can be used to interact with the viasp backend.

It provides similar functions to viASP's proxy Control class,
but works independently of a clingo Control object program.

In addition to the proxy's functions, this module provides functions to
interact with it outside of a clingo program. Models can be marked
directly from strings or files containing the corresponding facts.
"""

from inspect import signature
from typing import List, cast, Union

import clingo
from clingo import Control as InnerControl
from clingo import Model as clingo_Model
from clingo import ast
from clingo.ast import AST, ASTSequence, ASTType, Transformer
import clingo.ast
from clingo.symbol import Symbol
import clingo.util

from .shared.defaults import DEFAULT_COLOR
from .shared.io import clingo_symbols_to_stable_model
from .shared.model import StableModel
from .wrapper import ShowConnector, Control as viaspControl
from .exceptions import InvalidSyntax

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
    "get_relaxed_program",
    "relax_constraints",
    "clingraph",
    "register_transformer",
]

SHOWCONNECTOR = None

def _get_connector(**kwargs):
    global SHOWCONNECTOR
    if SHOWCONNECTOR is None:
        SHOWCONNECTOR = ShowConnector(**kwargs)
        SHOWCONNECTOR.register_function_call(
            "__init__", signature(InnerControl.__init__), [], kwargs={})
    return SHOWCONNECTOR


def _get_program_string(path: Union[str, List[str]]) -> str:
    prg = ""
    if isinstance(path, str):
        path = [path]
    for p in path:
        with open(p, encoding="utf-8") as f:
            prg += "".join(f.readlines())
    return prg


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


def _parse_input_program_for_files(input: Union[str, List[str]]) -> List[str]:
    files = []
    to_be_filtered = []

    def on_rule(ast: AST) -> None:
        nonlocal files
        file_begin = getattr(getattr(ast.location, "begin", None), "filename",
                             "")
        file_end = getattr(getattr(ast.location, "end", None), "filename", "")
        if file_begin not in files:
            files.append(file_begin)
        if file_end not in files:
            files.append(file_end)

    if isinstance(input, str):
        ast.parse_string(input, on_rule)
        return list(filter(lambda x: x != "<string>", files))
    else:
        ast.parse_files(input, on_rule)
        return list(filter(lambda x: x not in input, files))


def load_program_file(path: Union[str, List[str]], **kwargs) -> None:
    r"""
    Load a (non-ground) program file into the viasp backend

    Args:
        path (``str`` or ``list``) --
            path or list of paths to the program file
    
    Kwargs:
        viasp_backend_url (``str``) --
          url of the viasp backend
        _viasp_client (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``load_program_string``
    """
    connector = _get_connector(**kwargs)
    if isinstance(path, str):
        path = [path]
    program = _get_program_string(path)
    connector.register_function_call("load",
                                     signature(InnerControl.load), [],
                                     kwargs={
                                         "path": "<string>",
                                         "program": program
                                     })
    files_mentioned_in_program = _parse_input_program_for_files(path)
    for file in files_mentioned_in_program:
        program = _get_program_string(file)
        connector.register_function_call("load",
                                         signature(InnerControl.load), [],
                                         kwargs={
                                             "path": file,
                                             "program": program
                                         })


def load_program_string(program: str, **kwargs) -> None:
    r"""
    Load a (non-ground) program into the viasp backend

    Args:
        program (``str``) --
            the program to load
    
    Kwargs:
        *viasp_backend_url* (``str``) --
          url of the viasp backend
        *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``load_program_file``
    """
    connector = _get_connector(**kwargs)
    connector.register_function_call("load",
                                     signature(InnerControl.load), [],
                                     kwargs={
                                         "path": "<string>",
                                         "program": program
                                     })
    files_mentioned_in_program = _parse_input_program_for_files(program)
    for file in files_mentioned_in_program:
        program = _get_program_string(file)
        connector.register_function_call("load",
                                         signature(InnerControl.load), [],
                                         kwargs={
                                             "path": file,
                                             "program": program
                                         })



def add_program_file(*args, **kwargs):
    r"""
    Add a (non-ground) program file to the viasp backend.
    This function provides two overloads, similar to ``clingo.control.Control.add``.

    .. code-block:: python

        def add(self, name: str, parameters: Sequence[str], path: str) -> None:
            ...

        def add(self, path: str) -> None:
            return self.add("base", [], path)

    Args:
        name (``str``) --
            The name of program block to add.
        parameters (``Sequence[str]``) --
            The parameters of the program block to add.
        path (``str`` or ``list``) --
            The path or list of paths to the non-ground program.
    
    Kwargs:
        *viasp_backend_url* (``str``) --
          url of the viasp backend
        *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``add_program_string``
    """
    viasp_client = kwargs.pop("_viasp_client", None)

    n = len(args) + len(kwargs)
    if n == 1:
        kwargs["program"] = _get_program_string(args[0])
        args = []
    elif "program" in kwargs:
        kwargs["program"]= _get_program_string(kwargs["program"])
    else:
        kwargs["program"] = _get_program_string(args[2])

    if viasp_client is not None:
        kwargs["_viasp_client"] = viasp_client
    add_program_string(*args,**kwargs)



def add_program_string(*args, **kwargs) -> None:
    r"""
    Add a (non-ground) program to the viasp backend.
    This function provides two overloads, similar to ``clingo.control.Control.add``.

    .. code-block:: python

        def add(self, name: str, parameters: Sequence[str], program: str) -> None:
            ...

        def add(self, program: str) -> None:
            return self.add("base", [], program)

    Args:
        name (``str``) --
            The name of program block to add.
        parameters (``Sequence[str]``) --
            The parameters of the program block to add.
        program (``str``) --
            The non-ground program in string form.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See also
    ---------
    ``add_program_file``
    """
    connector = _get_connector(**kwargs)
    viasp_backend_url = None
    _viasp_client = None
    if "viasp_backend_url" in kwargs:
        viasp_backend_url = kwargs["viasp_backend_url"]
        del kwargs["viasp_backend_url"]
    if "_viasp_client" in kwargs:
        _viasp_client = kwargs["_viasp_client"]
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

    if viasp_backend_url:
        pass_kwargs["viasp_backend_url"] = viasp_backend_url
    if _viasp_client:
        pass_kwargs["_viasp_client"] = _viasp_client
    connector.register_function_call(
        "add", signature(InnerControl._add2), [], kwargs=pass_kwargs)


def show(**kwargs) -> None:
    r"""
    Propagate the marked models to the backend and Generate the graph.

    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    """
    connector = _get_connector(**kwargs)
    connector.show()


def mark_from_clingo_model(model: Union[clingo_Model, StableModel], **kwargs) -> None:
    r"""
    Mark a model to be visualized. Models can be unmarked and cleared.
    The marked models are propagated to the backend when ``show`` is called.

    Args:
        model (``clingo.solving.Model`` or ``viasp.model.StableModel``) --
            The model to mark.
    
    Kwargs:
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


def unmark_from_clingo_model(model: Union[clingo_Model, StableModel],
                             **kwargs) -> None:
    r"""
    Unmark a model.

    Args:
        model (``clingo.solving.Model`` or ``viasp.model.StableModel``) --
            The model to unmark.
   
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See Also
    --------
    ``mark_from_clingo_model``
    ``unmark_from_string``
    ``unmark_from_file``
    """
    connector = _get_connector(**kwargs)
    connector.unmark(model)


def clear(**kwargs) -> None:
    r"""
    Clear all marked models.

    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    """
    connector = _get_connector(**kwargs)
    connector.clear()


def clear_program(**kwargs) -> None:
    r"""
    Clear the program in the backend.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    """
    connector = _get_connector(**kwargs)
    connector.register_function_call(
        "clear", signature(InnerControl.add), [], kwargs={})


def get_relaxed_program(*args, **kwargs) -> Union[str, None]:
    r"""
    Relax constraints in the marked models. Returns
    the relaxed program as a string.

    Args:
        head_name (``str``, optional) --
            Name of head literal, defaults to "unsat"
        collect_variables (``bool``, optional) --
            Collect variables from body as a tuple in the head literal, defaults to True
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See also
    --------
    ``relax_constraints``
    """
    head_name = kwargs.pop("head_name", "unsat")
    collect_variables = kwargs.pop("collect_variables", True)
    connector = _get_connector(**kwargs)
    return connector.get_relaxed_program(head_name, collect_variables)

def relax_constraints(*args, **kwargs) -> viaspControl:
    r"""
    Relax constraints in the loaded program. Returns
    a new viasp.Control object with the relaxed program loaded
    and stable models marked.

    Args:
        head_name (``str``, optional) --
            Name of head literal. Defaults to "unsat"
        collect_variables (``bool``, optional) --
            Collect variables from body as a tuple in the head literal. Defaults to True
        
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    See also
    --------
    ``get_relaxed_program``
    """
    head_name = kwargs.pop("head_name", "unsat")
    collect_variables = kwargs.pop("collect_variables", True)
    connector = _get_connector(**kwargs)
    return connector.relax_constraints(head_name, collect_variables)

def clingraph(viz_encoding, engine="dot", graphviz_type="graph", **kwargs) -> None:
    r"""
    Generate the a clingraph from the marked models and the visualization encoding.

    Args:
        viz_encoding (``str``) --
            The path to the visualization encoding.
        engine (``str``) --
            The visualization engine. Defaults to "dot".
        graphviz_type (``str``) --
            The graph type. Defaults to "graph".
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    Note
    --------
    See https://github.com/potassco/clingraph for more details.
    """
    connector = _get_connector(**kwargs)
    connector.clingraph(viz_encoding, engine, graphviz_type)

def register_transformer(transformer: Transformer, imports: str = "", path: str = "", **kwargs) -> None:
    r"""
    Register a transformer to the backend. The program will be transformed
    in the backend before further processing is made.

    Args:
        transformer (``Transformer``) --
            The transformer to register.
        imports (``str``) --
            The imports usued by the transformer.
            (Can only be clingo imports and standard imports.
            String lines must be separated by newlines.)
        path (``str``) --
            The path to the transformer.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.register_transformer(transformer, imports, path)

def register_constant(name: str, value: str, **kwargs) -> None:
    r"""
    Register a constant to the backend. The constant will be used in the program.

    Args:
        name (``str``) --
            The name of the constant.
        value (``str``) --
            The value of the constant.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.register_constant(name, value)

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
        getattr(ASTType, "Guard" if isinstance(clingo.version(), tuple) and clingo.version() >= (5, 6, 0)
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

    Args:
        model (``str``) --
            The facts of the model to mark.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    :raises: :py:class:`InvalidSyntax` if the string contains non-facts.

    See Also
    --------
    ``mark_from_clingo_model``
    ``mark_from_file``
    ``unmark_from_string``
    """
    try:
        symbols = parse_fact_string(model, raise_nonfact=True)
        connector = _get_connector(**kwargs)
        stable_model = clingo_symbols_to_stable_model(symbols)
        connector.mark(stable_model)
    except RuntimeError as e:
        msg = "Syntactic error the input string can't be read as facts. \n"
        raise InvalidSyntax(msg,str(e)) from None


def mark_from_file(path: Union[str, List[str]], **kwargs) -> None:
    r"""
    Parse a file containing a string of ASP facts and mark them as a model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).")

    Models can be unmarked and cleared.
    The marked models are propagated to the backend when ``show`` is called.

    Args:
        path (``str`` or ``list``) --
            The path or list of paths to the file containing the facts of the model to mark.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    :raises: :py:class:`InvalidSyntax` if the string contains non-facts.

    See Also
    --------
    ``mark_from_clingo_model``
    ``mark_from_string``
    ``unmark_from_file``
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

    Args:
        model (``str``) --
            The facts of the model to unmark.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    :raises: :py:class:`InvalidSyntax` if the string contains non-facts.

    See Also
    --------
    ``unmark_from_clingo_model``
    ``unmark_from_file``
    """
    try:
        symbols = parse_fact_string(model, raise_nonfact=True)
        connector = _get_connector(**kwargs)
        stable_model = clingo_symbols_to_stable_model(symbols)
        connector.unmark(stable_model)
    except RuntimeError as e:
        msg = "Syntactic error the input string can't be read as facts. \n"
        raise InvalidSyntax(msg,str(e)) from None


def unmark_from_file(path: str, **kwargs) -> None:
    r"""
    Parse a file containing a string of ASP facts and unmark the corresponding model.

    The string must be an exact match to the model.

    Facts must be of a simple form. Rules that are NOT simple facts include: any
    rule with a body, a disjunctive fact, a choice rule, a theory atom, a literal
    with an external @-function reference, a literal that requires some mathematical
    calculation (eg., "p(1+1).").

    Changes to marked models are propagated to the backend when ``show`` is called.

    Args:
        path (``str``) --
            The path to the file containing the facts of the model to unmark.
    
    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object

    :raises: :py:class:`InvalidSyntax` if the string contains non-facts.

    See Also
    --------
    ``unmark_from_clingo_model``
    ``unmark_from_string``
    """
    unmark_from_string(_get_program_string(path), **kwargs)

def get_session_id(**kwargs) -> str:
    r"""
    Get the session id.

    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    session_id = connector.get_session_id()
    if session_id == None:
        return ""
    return session_id

def deregister_session(session_id, **kwargs) -> int:
    r"""
    Deregister the session id.

    Kwargs:
        * *session_id* (``str``) --
          the session id to deregister
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    active_sessions = connector.deregister_session(session_id)
    return active_sessions


def set_config(show_all_derived=False,
               color_theme=DEFAULT_COLOR,
               **kwargs):
    r"""
    Get the value of the show_all_derived flag.

    Kwargs:
        * *viasp_backend_url* (``str``) --
          url of the viasp backend
        * *_viasp_client* (``ClingoClient``) --
          a viasp client object
    """
    connector = _get_connector(**kwargs)
    connector.show_all_derived(show_all_derived, color_theme)
