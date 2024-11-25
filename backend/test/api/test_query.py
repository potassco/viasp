import pytest
from viasp.shared.model import SearchResultSymbolWrapper
from helper import get_clingo_stable_models
import uuid
from urllib.parse import quote_plus

from conftest import setup_client

program_simple = "a(1..2). {b(X)} :- a(X). c(X) :- b(X)."
program_multiple_sorts = "a(1..2). {b(X)} :- a(X). c(X) :- a(X)."
program_recursive = "j(X, X+1) :- X=0..5.j(X,  Y) :- j(X,Z), j(Z,Y)."


@pytest.fixture()
def client(app_context, db_session):
    with app_context.test_client() as client:
        yield client

@pytest.fixture
def unique_session(client):
    with client.session_transaction() as sess:
        sess['encoding_id'] = uuid.uuid4().hex
    yield client

def setup_for_query(c, program):
    c.post("control/program", json=program)
    saved_models = get_clingo_stable_models(program)
    c.post("control/models", json=saved_models)
    c.post("control/show")



@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_query_endpoints_methods(unique_session, program):
    client = setup_client(unique_session, program)
    res = client.get("query")
    assert res.status_code == 200
    res = client.post("query")
    assert res.status_code == 405
    res = client.delete("query")
    assert res.status_code == 405
    res = client.put("query")
    assert res.status_code == 405

@pytest.mark.parametrize("program, query, expected_length", [
    (program_simple, "a", 2),
    (program_simple, "a(", 2),
    (program_simple, "a(1", 1),
    (program_simple, "a(1)", 1),
    (program_simple, "a(3)", 0),
    (program_multiple_sorts, "c(1)", 1),
    (program_multiple_sorts, "(", 6),
    (program_multiple_sorts, ")", 6),
    (program_multiple_sorts, "1", 3),
    (program_multiple_sorts, "1)", 3),
    (program_multiple_sorts, "(1)", 3),
    (program_multiple_sorts, "c(1))", 0),
    (program_multiple_sorts, "c(1)e", 0),
    (program_multiple_sorts, "c(1)*", 0),
    (program_multiple_sorts, "c(1)X", 0),
    (program_multiple_sorts, "c()", 0),
    (program_multiple_sorts, "c)", 0),
    (program_multiple_sorts, "cd", 0),
    (program_multiple_sorts, "c1", 0),
    (program_multiple_sorts, "d", 0),
    (program_recursive, "j(1,2)", 1),
    (program_recursive, "1,2", 1),
    (program_recursive, "1, 2", 1),
])
def test_ground_atoms_suggestions(unique_session, program, query,
                                  expected_length):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    suggestions = list(filter(lambda x: x.hide_in_suggestions == False, res.json))
    assert len(suggestions) == expected_length

@pytest.mark.parametrize("program, query, expected_awaiting_input", [
    (program_simple, "a", True),
    (program_simple, "d", False),
    (program_multiple_sorts, "b", True),
    (program_multiple_sorts, "c()*", True),
    (program_multiple_sorts, "c1", False),
    (program_multiple_sorts, "d(X)", False),
    (program_multiple_sorts, "c(X)", False),
    (program_multiple_sorts, "c(X))", True),
])
def test_ground_atoms_response_awaiting_input(unique_session, program, query,
                                      expected_awaiting_input):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    res = res.json
    assert res[0].awaiting_input == expected_awaiting_input


@pytest.mark.parametrize("program, query, expected_hide_in_suggestions", [
    (program_simple, "a", False),
    (program_simple, "a(1)", False),
    (program_simple, "a(X)", False),
    (program_simple, "d", True),
    (program_multiple_sorts, "d(X)", True),
    (program_multiple_sorts, "c(X))", True),
])
def test_ground_atoms_response_hidden(unique_session, program, query,
                                      expected_hide_in_suggestions):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    res = res.json
    assert res[0].hide_in_suggestions == expected_hide_in_suggestions


@pytest.mark.parametrize("program, query, expected_length", [
    (program_simple, "a(1)", 1),
    (program_multiple_sorts, "c(1)", 4),
    (program_recursive, "j(1,2)", 1),
])
def test_ground_atoms_symbolwrapper(unique_session, program, query,
                                  expected_length):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    search_result_symbol_wrapper = res.json[0]
    assert isinstance(search_result_symbol_wrapper, SearchResultSymbolWrapper)
    assert isinstance(search_result_symbol_wrapper.repr, str)
    assert query in search_result_symbol_wrapper.repr
    assert isinstance(search_result_symbol_wrapper.includes, list)
    assert isinstance(search_result_symbol_wrapper.includes[0], str)
    assert len(search_result_symbol_wrapper.includes) == expected_length


########################################
### Non-ground search: ALTERNATIVE 1 ###
########################################
@pytest.mark.parametrize("program, query, expected_length", [
    (program_simple, "a(X)", 2),
    (program_multiple_sorts, "c(X)", 2),
    (program_recursive, "j(X,Y)", 21),
    (program_recursive, "j(X,X+1)", 6),
    (program_recursive, "j(X,X+2)", 5),
])
def test_nonground_atoms_alternative1(unique_session, program, query, expected_length):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    assert len(res.json) == expected_length

@pytest.mark.parametrize("program, query, expected", [
    (program_simple, "a", True),
    (program_simple, "a(", True),
    (program_simple, "a()", False),
    (program_simple, "a(X", True),
    (program_multiple_sorts, "c(X)", False),
    (program_multiple_sorts, "d(X", True),
    (program_multiple_sorts, "d(X)", False),
    (program_recursive, "j(X,Y)", False),
])
def test_awaiting_input(unique_session, program, query, expected):
    setup_for_query(unique_session, program)
    res = unique_session.get(f"query?q={quote_plus(query)}")
    assert res.status_code == 200
    assert (res.json[0].awaiting_input) == expected
