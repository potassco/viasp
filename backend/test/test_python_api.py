import pathlib
from inspect import Signature, signature
from typing import Any, Collection, Dict, Sequence
import io
import sys

from clingo import Control as InnerControl
from flask.testing import FlaskClient
from flask import current_app
from pytest import raises

from viasp import wrapper
from viasp.api import (FactParserError, add_program_file, add_program_string,
                       clear, load_program_file, load_program_string,
                       mark_from_clingo_model, mark_from_file,
                       mark_from_string, show, unmark_from_clingo_model,
                       unmark_from_file, unmark_from_string, get_relaxed_program, relax_constraints, clingraph, register_transformer)
from viasp.shared.interfaces import ViaspClient
from viasp.shared.model import ClingoMethodCall, StableModel
from viasp.shared.io import clingo_model_to_stable_model


class DebugClient(ViaspClient):
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

    def is_available(self):
        return True
    
    def register_warning(self, message: str):
        pass

    def __init__(self, internal_client: FlaskClient, *args, **kwargs):
        self.client = internal_client
        self.register_function_call(
            "__init__", signature(InnerControl.__init__), args, kwargs)



def test_load_program_file(client, db_session):
    sample_encoding = str(pathlib.Path(__file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(client)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample.\n", f"{res.data} should be equal to sample.encoding :- sample."


def test_load_program_string(client, db_session):
    debug_client = DebugClient(client)
    load_program_string("sample.{encoding} :- sample.",_viasp_client=debug_client)

    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample."


def test_add_program_file_add1(client):
    sample_encoding = str(pathlib.Path(__file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(client)
    load_program_file(sample_encoding, _viasp_client=debug_client)


    add_program_file(sample_encoding)

    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json ==\
        "sample.{encoding} :- sample.\nsample.{encoding} :- sample.\n"


def test_add_program_file_add2(client):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(client)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_file("base", [], sample_encoding)

    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json.replace('\n', '') ==\
        'sample.{encoding} :- sample.sample.{encoding} :- sample.'


    add_program_file("base", parameters=[], program=sample_encoding)
    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    print(res.data)
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample.sample.{encoding} :- sample."


def test_add_program_string_add1(client):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(client)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_string("sample.{encoding} :- sample.")

    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample."


def test_add_program_string_add2(client):
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")

    debug_client = DebugClient(client)
    load_program_file(sample_encoding, _viasp_client=debug_client)

    add_program_string("base", [], "sample.{encoding} :- sample.")

    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample."

    add_program_string("base", parameters=[],
                       program="sample.{encoding} :- sample.")
    # Assert program was called correctly
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json.replace("\n", "") ==\
        "sample.{encoding} :- sample.sample.{encoding} :- sample.sample.{encoding} :- sample."

def test_mark_model_from_clingo_model(client):
    debug_client = DebugClient(client)

    load_program_string(r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m)
    show()

    # Assert the models were received
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2


def test_load_from_stdin(client):
    debug_client = DebugClient(client)
    ctl = wrapper.Control(_viasp_client=debug_client)
    sys.stdin = io.StringIO("sample.{encoding} :- sample.")
    ctl.load("-")

    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json == "sample.{encoding} :- sample."


def test_mark_model_from_string(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    show()
    # Assert the models were cleared
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

    mark_from_string("sample.encoding.")
    mark_from_string("sample.")
    show()

    # Assert the models were received
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2


def test_mark_model_not_a_fact_file(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")
    with raises(FactParserError) as exc_info:
        mark_from_file(sample_encoding)
    exception_raised = exc_info.value
    assert exception_raised.line == 1
    assert exception_raised.column == 8


def test_mark_model_from_file(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    mark_from_file(sample_model)
    show()

    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1


def test_unmark_model_from_clingo_model(client):
    debug_client = DebugClient(client)

    load_program_string(r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    last_model = None

    clear()
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m)
            last_model = clingo_model_to_stable_model(m)
    show()

    # Assert the models were received
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    if last_model is not None:
        unmark_from_clingo_model(last_model)
    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_unmark_model_from_string(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    mark_from_string("sample.encoding.")
    mark_from_string("sample.")
    unmark_from_string("sample.encoding.")
    show()

    # Assert the models were received
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1


def test_unmark_model_from_file(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    mark_from_file(sample_model)
    unmark_from_file(sample_model)
    show()

    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

def test_get_relaxed_program(client):
    debug_client = DebugClient(client)
    input_program = r"sample. :- sample.:-a(X)."
    relaxed_program = r"#program base.sample.unsat(r1) :- sample.unsat(r2,(X,)) :- a(X).:~ unsat(R,T). [1@0,R,T]"
    load_program_string(
        input_program, _viasp_client=debug_client)

    res = get_relaxed_program(_viasp_client=debug_client)
    assert res == relaxed_program

    res = get_relaxed_program(_viasp_client=debug_client, head_name="unsat2")
    assert res == relaxed_program.replace("unsat", "unsat2")

    res = get_relaxed_program(_viasp_client=debug_client, head_name="unsat3", collect_variables=False)
    assert res == relaxed_program\
        .replace("unsat","unsat3")\
        .replace(",(X,)", "")\
        .replace(",T", "")

def test_relax_constraints(client):
    debug_client = DebugClient(client)

    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    show()
    # Assert the models were cleared
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

    mark_from_string("sample.encoding.")
    mark_from_string("sample.")
    show()
    res = relax_constraints(_viasp_client=debug_client)
    assert isinstance(res, wrapper.Control)

def test_call_in_different_order(client):
    debug_client = DebugClient(client)
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")

    show(_viasp_client=debug_client)
    clear()
    mark_from_file(sample_model)
    show()
    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_mix_methods(client):
    debug_client = DebugClient(client)
    sample_model = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_model.lp")
    load_program_string(
        r"sample.{encoding} :- sample.", _viasp_client=debug_client)

    clear()
    mark_from_file(sample_model)
    show()
    mark_from_string("sample.")

    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    unmark_from_string("sample.encoding.")
    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1

def test_mix_methods2(client):
    debug_client = DebugClient(client)
    sample_encoding = str(pathlib.Path(
        __file__).parent.resolve() / "resources" / "sample_encoding.lp")
    clear(_viasp_client=debug_client)
    load_program_file(sample_encoding)
    ctl = InnerControl(['0'])
    ctl.add("base", [], r"sample.{encoding} :- sample.")
    ctl.ground([("base", [])])
    with ctl.solve(yield_=True) as handle:  # type: ignore
        for m in handle:
            mark_from_clingo_model(m)
    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 2

    unmark_from_string("sample.")
    show()
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 1
