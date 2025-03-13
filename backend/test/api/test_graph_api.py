import pytest
import uuid

from viasp.shared.util import hash_from_sorted_transformations
from viasp.shared.model import Node, Transformation
from conftest import setup_client, program_simple, program_multiple_sorts, program_recursive


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_sorted_program(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph/sorts")
    assert res.status_code == 200
    assert type(res.json) == list
    assert len(res.json) == 2

@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_children_allows_get_only(unique_session, program):
    client = setup_client(unique_session, program)
    sorted_program = client.get("graph/sorts").json
    for t in sorted_program:
        res = client.get(f"graph/children/{t.hash}?ids_only=True")
        assert res.status_code == 200
        assert len(res.json) > 0
        res = client.post(f"graph/children/{t.hash}?ids_only=True")
        assert res.status_code == 405
        res = client.delete(f"graph/children/{t.hash}?ids_only=True")
        assert res.status_code == 405
        res = client.put(f"graph/children/{t.hash}?ids_only=True")
        assert res.status_code == 405


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_current_graph(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph/current")
    assert res.status_code == 200
    assert len(res.json) > 0

    new_hash = "0123"
    res = client.post("graph/current", json=new_hash)
    assert res.status_code == 200
    res = client.get("graph/current")
    assert res.status_code == 200
    assert res.json == new_hash

    res = client.delete("graph/current")
    assert res.status_code == 200
    res = client.get("graph/current")
    assert res.status_code == 500
    assert res.json == None


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_set_graph(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph/sorts")
    sorted_program = res.json
    res = client.get("graph")
    graph = res.json
    assert len(res.json) >= 0.
    req = {
        "data": graph,
        "hash": hash_from_sorted_transformations(sorted_program),
        "sort": sorted_program
    }

    res = client.delete("graph")
    assert res.status_code == 200
    res = client.get("graph")
    assert res.status_code == 200
    assert len(res.json) >= 0, "Graph should be regenerated, if queried after deletion."



@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_set_sort_with_bad_values(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph")
    res = client.post("graph/sorts", json={"foo": "bar"})
    assert res.status_code == 400
    res = client.post("graph/sorts", json={"moved_transformation": {"bar": "foo"}})
    assert res.status_code == 400


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_set_sort(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph/sorts")
    sorted_program = res.json

    res = client.get("graph/current")
    current_sort = res.json

    res = client.post("graph/sorts", json={"current_sort": current_sort, "moved_transformation": {"old_index": 1, "new_index": 1}})
    assert res.status_code == 200
    current_sort = res.json["hash"]

    for old_index, t in enumerate(sorted_program):
        for new_index in range(t.adjacent_sort_indices["lower_bound"], t.adjacent_sort_indices["upper_bound"]+1):
            res = client.post("graph/sorts",
                              json={
                                  "current_sort": current_sort,
                                  "moved_transformation": {
                                      "old_index": old_index,
                                      "new_index": new_index
                                  }
                              })
            assert res.status_code == 200
            current_sort = res.json["hash"]
            res = client.get("graph/sorts")
            assert (res.json == sorted_program) == (old_index == new_index)
            sorted_program = res.json



@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_edges_endpoint(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph")
    graph = res.json

    res = client.get("/graph/edges")
    assert res.status_code == 200
    assert type(res.json) == list
    assert len(res.json) == len(graph.edges)

    res = client.post("/graph/edges", json={})
    assert res.status_code == 200
    assert type(res.json) == list
    assert len(res.json) == len(graph.edges)


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_edges_with_recursion_endpoint(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph")
    graph = res.json
    recursions = []
    recursion_nodes = 0
    for u in graph.nodes:
        if len(u.recursive) > 0:
            recursions.append(u.uuid)
            recursion_nodes += len(u.recursive) + 2
            print(len(u.recursive))

    res = client.post("graph/edges", json={"shownRecursion": list(recursions)})
    assert res.status_code == 200
    assert type(res.json) == list
    assert len(res.json) > 0


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_detail_endpoint_requires_key(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("detail/")
    assert res.status_code == 404


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_detail_endpoint_returns_details_on_valid_uuid(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph")
    graph = res.json

    for node in graph.nodes:
        uuid = node.uuid.hex
        res = client.get(f"detail/{uuid}")
        assert res.status_code == 200
        assert type(res.json[0]) == str
        assert res.json[0] in ["Facts", "Answer Set", "Partial Answer Set"]
        assert len(res.json[1]) >= 0


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_get_transformation(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("/graph/transformation/1")
    assert res.status_code == 200
    assert type(res.json) == Transformation

    res = client.get("/graph/transformation/100")
    assert res.status_code == 404


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_get_facts(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("/graph/facts")
    assert res.status_code == 200
    assert type(res.json) == list
    assert type(res.json[0]) == Node


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_reason_endpoints(unique_session, program):
    client = setup_client(unique_session, program)
    assert client.get("graph/reason").status_code == 405
    assert client.delete("graph/reason").status_code == 405
    assert client.put("graph/reason").status_code == 405
    assert client.post("graph/reason",
                       json={
                           "sourceid": uuid.uuid4(),
                           "nodeid": uuid.uuid4()
                       }).status_code == 200

@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_reason(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("graph")
    graph = res.json

    for node in graph.nodes:
        for source in node.diff:
            res = client.post("graph/reason", json={"sourceid": source.uuid, "nodeid": node.uuid})
            assert res.status_code == 200
            assert type(res.json) == dict
            assert "rule" in res.json
            assert type(res.json["rule"]) == str or res.json["rule"] == None
            assert "symbols" in res.json
            assert len(res.json["symbols"]) >= 0
            for reason in res.json["symbols"]:
                assert type(reason) == dict
                assert "src" in reason
                assert "tgt" in reason
