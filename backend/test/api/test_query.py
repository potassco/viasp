from viasp.shared.model import Node, Signature, Transformation

def test_query_endpoints_methods(client_with_a_graph):
    client  = client_with_a_graph
    res = client.get("query")
    assert res.status_code == 200
    res = client.post("query")
    assert res.status_code == 405
    res = client.delete("query")
    assert res.status_code == 405
    res = client.put("query")
    assert res.status_code == 405


def test_query_for_symbol(client_with_a_graph):
    client = client_with_a_graph
    program = client.get("control/program").json
    q = "a(1)"
    res = client.get(f"query?q={q}")
    assert res.status_code == 200
    if "{b(X)}" in program:
        # program_simple and program_multiple_sorts
        assert any(any(str(atom.symbol) == q for atom in result.atoms) for result in res.json if isinstance(result, Node))
    else:
        # program_recursive
        assert all(all(str(atom.symbol) != q for atom in result.atoms) for result in res.json if isinstance(result, Node))


def test_query_for_signature(client_with_a_graph):
    client = client_with_a_graph
    program = client.get("control/program").json
    q = "a/1"
    res = client.get(f"query?q={q}")
    assert res.status_code == 200
    if "{b(X)}" in program:
        # program_simple and program_multiple_sorts
        assert any(result.args == 1 and result.name == "a" for result in res.json if isinstance(result, Signature))
    else:
        # program_recursive
        assert all(result.args != 1 and result.name != "a" for result in res.json if isinstance(result, Signature))



def test_query_for_rule(client_with_a_graph):
    client = client_with_a_graph
    program = client.get("control/program").json
    searched_rule = "{b(X)} :- a(X)."
    q = "b(X)"
    res = client.get(f"query?q={q}")
    print(res.json)
    assert res.status_code == 200
    if "{b(X)}" in program:
        # program_simple and program_multiple_sorts
        assert any(any(searched_rule in rules for rules in result.rules.str_) for result in res.json if
                isinstance(result, Transformation))
    else:
        # program_recursive
        assert all(all(searched_rule not in rules for rules in result.rules.str_) for result in res.json if
                isinstance(result, Transformation))


def test_query_multiple_sorts(client_with_a_graph):
    from random import sample
    client = client_with_a_graph
    results = []
    q = "c(X) :- a(X)."
    sorted_program = client.get("graph/sorts").json
    switch_from, switch_to = (None, None)
    for _ in range(3):
        for t in sample(sorted_program, k=len(sorted_program)):
            if t.adjacent_sort_indices["upper_bound"] - t.adjacent_sort_indices["lower_bound"]>0:
                switch_to = sample(range(t.adjacent_sort_indices["lower_bound"], t.adjacent_sort_indices["upper_bound"]+1), 1)[0]
                switch_from = t.id
                break
        if switch_from is not None:
            res = client.post("graph/sorts", json={"moved_transformation":{"old_index": switch_from, "new_index": switch_to}})
            assert res.status_code == 200
            res = client.get(f"query?q={q}")
            assert res.status_code == 200

            res = client.get("graph/sorts")
            sorted_program = res.json
            switch_from, switch_to = (None, None)
