import pathlib
from inspect import Signature, signature
from typing import Any, Collection, Dict, Sequence
import io
import sys

from clingo import Control as InnerControl
from flask.testing import FlaskClient
from flask import current_app
import pytest

from viasp import wrapper
import viasp.api
from viasp.api import (FactParserError, add_program_file, add_program_string,
                       clear, load_program_file, load_program_string,
                       mark_from_clingo_model, mark_from_file,
                       mark_from_string, show, unmark_from_clingo_model,
                       unmark_from_file, unmark_from_string, get_relaxed_program, relax_constraints, clingraph,
                       register_transformer)
from viasp.shared.interfaces import ViaspClient
from viasp.shared.model import ClingoMethodCall, StableModel
from viasp.shared.io import clingo_model_to_stable_model

@pytest.fixture(autouse=True)
def delete_showconnector():
    viasp.api.SHOWCONNECTOR = None

class DebugClient(ViaspClient):

    def __init__(self, internal_client: FlaskClient, *args, **kwargs):
        self.client = internal_client
        self.register_function_call(
            "__init__", signature(InnerControl.__init__), args, kwargs)

    def show(self):
        pass

    def set_target_stable_model(self, stable_models: Collection[StableModel]):
        self.client.post("control/models", json=stable_models)

    def relax_constraints(self, *args, **kwargs):
        serialized = current_app.json.dumps({
            "args": args,
            "kwargs": kwargs
        })
        r = self.client.post("/control/relax",
                            data=serialized,
                            headers={'Content-Type': 'application/json'})
        return ''.join(r.json) # type: ignore

    def register_function_call(self, name: str, sig: Signature, args: Sequence[Any], kwargs: Dict[str, Any]):
        serializable_call = ClingoMethodCall.merge(name, sig, args, kwargs)
        self.client.post("control/add_call", json=serializable_call)

    def clingraph(self, viz_encoding, engine, graphviz_type):
        serialized = current_app.json.dumps(
            {
                "viz-encoding": viz_encoding,
                "engine": engine,
                "graphviz-type": graphviz_type
            })

        self.client.post("control/clingraph",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})

    def is_available(self):
        return True

    def register_warning(self, message: str):
        pass


def test_load_program_file(unique_session):
    sample_encoding = str(pathlib.Path(__file__).parent.resolve() / "resources" / "sample_encoding.lp")

    with unique_session.session_transaction() as sess:
        print(f"unique session encoding_id {sess['encoding_id']}")
    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample.\n", f"{res.data} should be equal to sample.encoding :- sample."


def test_load_program_file_with_include(unique_session):
    sample_encoding = str(
        pathlib.Path(__file__).parent.resolve() / "resources" /
        "sample_encoding_include.lp")

    with unique_session.session_transaction() as sess:
        print(f"unique session encoding_id {sess['encoding_id']}")
    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json == '#include "sample_encoding.lp".\nsample.{encoding} :- sample.\n', f"{res.json} should be equal to sample.encoding :- sample."

def test_load_program_string(unique_session):
    debug_client = DebugClient(unique_session)
    load_program_string("sample.{encoding} :- sample.", _viasp_client=debug_client)

    with unique_session.session_transaction() as sess:
        print(f"unique session encoding_id {sess['encoding_id']}")
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample."


def test_load_program_string_with_include(unique_session):
    debug_client = DebugClient(unique_session)
    load_program_string('#include "test/resources/sample_encoding.lp".',
                        _viasp_client=debug_client)

    with unique_session.session_transaction() as sess:
        print(f"unique session encoding_id {sess['encoding_id']}")
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json == '#include "test/resources/sample_encoding.lp".sample.{encoding} :- sample.\n'


def test_add_program_file_add1(unique_session):
    sample_encoding = str(pathlib.Path(__file__).parent.resolve() / "resources" / "sample_encoding.lp")

    with unique_session.session_transaction() as sess:
        print(f"unique session encoding_id {sess['encoding_id']}")
    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)


    add_program_file(sample_encoding, _viasp_client=debug_client)

    # Assert program was called correctly
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json ==\
        "sample.{encoding} :- sample.\nsample.{encoding} :- sample.\n"


def test_add_program_file_add2(unique_session):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_file("base", [], sample_encoding, _viasp_client=debug_client)

    # Assert program was called correctly
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json.replace('\n', '') ==\
        'sample.{encoding} :- sample.sample.{encoding} :- sample.'


    add_program_file("base", parameters=[], program=sample_encoding, _viasp_client=debug_client)
    # Assert program was called correctly
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample.sample.{encoding} :- sample."


def test_add_program_string_add1(unique_session):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_string("sample.{encoding} :- sample.", _viasp_client=debug_client)

    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample."


def test_add_program_string_add2(unique_session):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(unique_session)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_string("base", [], "sample.{encoding} :- sample.", _viasp_client=debug_client)

    # Assert program was called correctly
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample."

    add_program_string("base", parameters=[],
                       program="sample.{encoding} :- sample.",
                       _viasp_client=debug_client)
    # Assert program was called correctly
    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample.sample.{encoding} :- sample."

def test_mark_model_from_clingo_model(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m, _viasp_client=debug_client)
    show(_viasp_client=debug_client)

    # Assert the models were received
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2


def test_load_from_stdin(unique_session):
    debug_client = DebugClient(unique_session)
    ctl = wrapper.Control(_viasp_client=debug_client)
    sys.stdin = io.StringIO("sample.{encoding} :- sample.")
    ctl.load("-")

    res = unique_session.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample."


def test_mark_model_from_string(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear(_viasp_client=debug_client)
    show(_viasp_client=debug_client)
    # Assert the models were cleared
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

    mark_from_string("sample.encoding.", _viasp_client=debug_client)
    mark_from_string("sample.", _viasp_client=debug_client)
    show(_viasp_client=debug_client)

    # Assert the models were received
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2


def test_mark_model_not_a_fact_file(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")
    with pytest.raises(FactParserError) as exc_info:
        mark_from_file(sample_encoding, _viasp_client=debug_client)
    exception_raised = exc_info.value
    assert exception_raised.line == 1
    assert exception_raised.column == 8


def test_mark_model_from_file(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    mark_from_file(sample_model, _viasp_client=debug_client)
    show()

    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1


def test_unmark_model_from_clingo_model(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    last_model = None

    clear(_viasp_client=debug_client)
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m, _viasp_client=debug_client)
            last_model = clingo_model_to_stable_model(m)
    show(_viasp_client=debug_client)

    # Assert the models were received
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    if last_model is not None:
        unmark_from_clingo_model(last_model, _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_unmark_model_from_string(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear(_viasp_client=debug_client)
    mark_from_string("sample.encoding.", _viasp_client=debug_client)
    mark_from_string("sample.", _viasp_client=debug_client)
    unmark_from_string("sample.encoding.", _viasp_client=debug_client)
    show(_viasp_client=debug_client)

    # Assert the models were received
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1


def test_unmark_model_from_file(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear(_viasp_client=debug_client)
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    mark_from_file(sample_model, _viasp_client=debug_client)
    unmark_from_file(sample_model, _viasp_client=debug_client)
    show(_viasp_client=debug_client)

    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

def test_get_relaxed_program(unique_session):
    debug_client = DebugClient(unique_session)
    input_program = r"sample. :- sample.:-a(X)."
    relaxed_program = r"#program base.sample.unsat(r1,()) :- sample.unsat(r2,(X,)) :- a(X).:~ unsat(R,T). [1@0,R,T]"
    load_program_string(input_program, _viasp_client=debug_client)

    res = get_relaxed_program(_viasp_client=debug_client)
    assert res == relaxed_program

    res = get_relaxed_program(_viasp_client=debug_client, head_name="unsat2")
    assert res == relaxed_program.replace("unsat", "unsat2")

    res = get_relaxed_program(_viasp_client=debug_client, head_name="unsat3", collect_variables=False)
    assert res == relaxed_program\
        .replace("unsat","unsat3")\
        .replace(",()", "")\
        .replace(",(X,)", "")\
        .replace(",T", "")

def test_relax_constraints(unique_session):
    debug_client = DebugClient(unique_session)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    show(_viasp_client=debug_client)
    # Assert the models were cleared
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

    mark_from_string("sample.encoding.")
    mark_from_string("sample.")
    show(_viasp_client=debug_client)
    res = relax_constraints(_viasp_client=debug_client)
    assert isinstance(res, wrapper.Control)

def test_clingraph(unique_session):
    debug_client = DebugClient(unique_session)
    input_program = r"a(1..2)."
    clingraph_enc = r"node(B):-a(B).attr(node,B,color,blue):-node(B)."
    load_program_string(input_program, _viasp_client=debug_client)
    mark_from_string("a(1).", _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    clingraph(
        viz_encoding = clingraph_enc,
        _viasp_client=debug_client)

    res = unique_session.get("control/clingraph")
    assert res.status_code == 200
    assert res.json == {"using_clingraph": True}

def test_call_in_different_order(unique_session):
    debug_client = DebugClient(unique_session)
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")

    show(_viasp_client=debug_client)
    clear(_viasp_client=debug_client)
    mark_from_file(sample_model, _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_mix_methods(unique_session):
    debug_client = DebugClient(unique_session)
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    mark_from_file(sample_model, _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    mark_from_string("sample.", _viasp_client=debug_client)

    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    unmark_from_string("sample.encoding.", _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_mix_methods2(unique_session):
    debug_client = DebugClient(unique_session)
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")
    load_program_file(sample_encoding, _viasp_client=debug_client)
    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m, _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    unmark_from_string("sample.", _viasp_client=debug_client)
    show(_viasp_client=debug_client)
    res = unique_session.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1
