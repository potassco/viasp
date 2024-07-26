import os
import pytest

from helper import get_clingo_stable_models, Transformer
from viasp.shared.model import ClingoMethodCall, TransformerTransport
from flask import current_app
def test_add_call_endpoint(client, clingo_call_run_sample, db_session):
    bad_value = {"foo": "bar"}
    res = client.post("control/add_call", json=bad_value)
    assert res.status_code == 400
    res = client.post("control/add_call", json=clingo_call_run_sample)
    assert res.status_code == 200
    res = client.delete("control/add_call")
    assert res.status_code == 405
    res = client.put("control/add_call")
    assert res.status_code == 405

def test_model_endpoint(client, db_session):
    program = "{b;c}."
    res = client.post("control/models", json=get_clingo_stable_models(program))
    assert res.status_code == 200

    res = client.get("control/models")
    assert len(res.json) > 0
    assert len(get_clingo_stable_models(program)) == len(res.json)

    res = client.post("control/models", json=get_clingo_stable_models(program))
    assert res.status_code == 200

    res = client.get("control/models")
    assert len(res.json) > 0
    assert len(get_clingo_stable_models(program)) == len(res.json), "Duplicate models should not be added"

    res = client.delete("control/models")
    assert res.status_code == 200
    res = client.put("control/models")
    assert res.status_code == 405
    res = client.get("control/models")
    assert res.status_code == 200
    assert len(res.json) == 0

    res = client.post("control/models", json={"foo": "bar"})
    assert res.status_code == 400

    res = client.post("control/models", json="foobar")
    assert res.status_code == 400
    assert res.text == "Received unexpected data type, consider using viasp.shared.io.clingo_model_to_stable_model()"

def test_program_endpoint(client, db_session):
    program = "{b;c}."

    res = client.post("control/program", json=program)
    assert res.status_code == 200

    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json == program

    res = client.post("control/program", json="foobar")
    assert res.status_code == 200
    res = client.get("control/program")
    assert res.status_code == 200
    assert res.json == program + "foobar"


    res = client.delete("control/program")
    assert res.status_code == 200

    res = client.put("control/program")
    assert res.status_code == 405

    res = client.get("control/program")
    assert res.status_code == 200


def test_show_endpoint(client, db_session):
    program = "{b;c}."
    client.delete("graph")
    client.post("control/program", json=program)
    client.post("control/models", json=get_clingo_stable_models(program))
    res = client.post("control/show")
    assert res.status_code == 200
    res = client.get("graph")
    assert len(list(res.json.nodes)) > 0

def test_relax_endpoint(client, db_session):
    program = "b.:-b."

    res = client.post("control/program", json=program)
    res = client.post("control/relax", json=program)
    assert res.status_code == 200
    assert len(res.json) > 0

def test_clingraph_endpoint(client, db_session):
    program = "{b;c}."

    client.post("control/program", json=program)
    client.post("control/models", json=get_clingo_stable_models(program))

    res = client.get("control/clingraph")
    assert res.status_code == 200
    assert res.json["using_clingraph"] == False

    res = client.post("control/clingraph", json={"viz-encoding": "node(b)."})
    assert res.status_code == 200

    res = client.get("control/clingraph")
    assert res.status_code == 200
    assert res.json["using_clingraph"] == True

    res = client.delete("control/clingraph")
    assert res.status_code == 200

    res = client.get("control/clingraph")
    assert res.status_code == 200
    assert res.json["using_clingraph"] == False


@pytest.mark.skip(reason="Transformer not registered bc of base exception?")
def test_transformer_endpoint(client, db_session, app_context):
    serializable_transformer = TransformerTransport.merge(Transformer(), "", str(os.path.abspath(__file__)))
    serialized = current_app.json.dumps(serializable_transformer)

    res = client.post("control/transformer", json=serialized)
    assert res.status_code == 200

    res = client.get("control/transformer")
    assert res.status_code == 200
    assert len(res.json) > 0

    res = client.delete("control/transformer")
    assert res.status_code == 200

    res = client.get("control/transformer")
    assert res.status_code == 200
    assert len(res.json) == 0


def test_warnings_endpoint(client, db_session):
    program = "{b;c}."

    client.post("control/program", json=program)
    client.post("control/models", json=get_clingo_stable_models(program))

    res = client.get("control/warnings")
    assert res.status_code == 200
    assert len(res.json) == 0

    res = client.post("control/warnings", json="foobar")
    assert res.status_code == 400

    res = client.post("control/warnings", json=["foobar"])
    assert res.status_code == 200

    res = client.get("control/warnings")
    assert res.status_code == 200
    assert len(res.json) > 0

    res = client.delete("control/warnings")
    assert res.status_code == 200

    res = client.get("control/warnings")
    assert res.status_code == 200
    assert len(res.json) == 0

