import pytest
from flask import current_app

from conftest import setup_client, register_clingraph, program_simple, program_multiple_sorts, program_recursive

@pytest.mark.parametrize("program", [
    (program_simple),
    (program_recursive),
    (program_multiple_sorts),
])
def test_clingraph_delete(encoding_id, unique_session, program):
    setup_client(unique_session, program)
    register_clingraph(unique_session,
        "node(B):-a(B).attr(node,B,color,blue):-node(B).")

    res = unique_session.delete("/control/clingraph")
    assert res.status_code == 200
    res = unique_session.get("/control/clingraph")
    assert res.status_code == 200
    assert res.data == b'{"using_clingraph": false}'


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_recursive),
    (program_multiple_sorts),
])
def test_using_clingraph(encoding_id, unique_session, program):
    setup_client(unique_session, program)
    prg = """
        node(X):-a(X).
        attr(node,a,color,blue) :- node(a), not b(a).
        attr(node,a,color,red)  :- node(a), b(a).
    """

    serialized = current_app.json.dumps({
        "viz-encoding":prg,
        "engine":"dot",
        "graphviz-type": "graph"
    })
    res = unique_session.post("/control/clingraph",
        data=serialized,
        headers={'Content-Type': 'application/json'})
    assert res.status_code == 200
    assert res.data == b'ok'

    res = unique_session.get("/control/clingraph")
    assert res.status_code == 200
    if "{b(X)}" in program:
        assert res.data == b'{"using_clingraph": true}'
    else:
        assert res.data == b'{"using_clingraph": false}'

@pytest.mark.parametrize("program", [
    (program_simple),
    (program_recursive),
    (program_multiple_sorts),
])
def test_clingraph_children(encoding_id, unique_session, program):
    setup_client(unique_session, program)
    prg = """
        node(X):-a(X).
        attr(node,a,color,blue) :- node(a), not b(a).
        attr(node,a,color,red)  :- node(a), b(a).
    """

    serialized = current_app.json.dumps({
        "viz-encoding":prg,
        "engine":"dot",
        "graphviz-type": "graph"
    })
    res = unique_session.post("/control/clingraph",
        data=serialized,
        headers={'Content-Type': 'application/json'})
    assert res.status_code == 200
    assert res.data == b'ok'
    res = unique_session.get("/clingraph/children")
    assert res.status_code == 200
    clingraph_nodes = current_app.json.loads(res.data)
    if "{b(X)}" in program:
        # program_simple and program_multiple_sorts
        assert len(clingraph_nodes) == 4
        res = unique_session.get(f"/clingraph/{clingraph_nodes[0].uuid}.svg")
        assert res.status_code == 200
        assert res.content_type == 'image/svg+xml; charset=utf-8'
    else:
        # program_recursive
        assert len(clingraph_nodes) == 0


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_recursive),
    (program_multiple_sorts),
])
def test_clingraph_image(encoding_id, unique_session, program):
    setup_client(unique_session, program)
    prg = """
        node(X):-a(X).
        attr(node,a,color,blue) :- node(a), not b(a).
        attr(node,a,color,red)  :- node(a), b(a).
    """

    serialized = current_app.json.dumps({
        "viz-encoding":prg,
        "engine":"dot",
        "graphviz-type": "graph"
    })
    res = unique_session.post("/control/clingraph",
        data=serialized,
        headers={'Content-Type': 'application/json'})
    assert res.status_code == 200
    assert res.data == b'ok'
    res = unique_session.get("/clingraph/children")
    assert res.status_code == 200
    clingraph_nodes = current_app.json.loads(res.data)

    if "{b(X)}" in program:
        res = unique_session.get(f"/clingraph/{clingraph_nodes[0].uuid}.svg")
        assert res.status_code == 200
        assert res.content_type == 'image/svg+xml; charset=utf-8'


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_recursive),
    (program_multiple_sorts),
])
def test_clingraph_edges(encoding_id, unique_session, program):
    setup_client(unique_session, program)
    prg = """
        node(X):-a(X).
        attr(node,a,color,blue) :- node(a), not b(a).
        attr(node,a,color,red)  :- node(a), b(a).
    """

    serialized = current_app.json.dumps({
        "viz-encoding": prg,
        "engine": "dot",
        "graphviz-type": "graph"
    })
    res = unique_session.post("/control/clingraph",
                      data=serialized,
                      headers={'Content-Type': 'application/json'})
    assert res.status_code == 200
    assert res.data == b'ok'

    res = unique_session.post("/graph/edges",
        json={
            "shownRecursion": [],
            "usingClingraph": "true"
        })
    assert res.status_code == 200
    assert type(res.json) == list
    if "{b(X)}" in program:
        # program_simple and program_multiple_sorts
        assert len(res.json) == 12
    else:
        assert len(res.json) == 2
