from flask import json

import pytest
import requests

from viasp.shared.util import get_compatible_node_link_data
from viasp.asp.justify import build_graph
from viasp.asp.reify import ProgramAnalyzer, reify_list
from helper import get_stable_models_for_program


@pytest.mark.skip(reason="Not for pipeline.")
def test_writing_to_server():
    program = "c(1). c(2). b(X) :- c(X). a(X) :- b(X). {d(X)} :- b(X). {e(X)} :- a(X)."
    # program = "a(1). a(2). {b(X)} :- a(X). d(X) :- b(X). {c(X)} :- b(X)."
    program = "a(1..2). {b(X)} :- a(X). d(X) :- b(X). {c(X)} :- b(X)."
    # program = "a. b :- not c, a. c :- not b, a."
    with open("../../tests/sudoku.lp", encoding="UTF-8") as f:
        program = "\n".join(f.readlines())
    analyzer = ProgramAnalyzer()
    analyzer.add_program(program)
    sorted_program = analyzer.get_sorted_program(program)
    saved_models = get_stable_models_for_program(program)
    reified = reify_list(sorted_program)

    g = build_graph(saved_models, reified, sorted_program, analyzer, set())

    backend_url = "http://127.0.0.1:5000/"

    serializable_graph = get_compatible_node_link_data(g)
    serialized = json.dumps(serializable_graph)

    r = requests.post(f"{backend_url}graph",
                      data=serialized,
                      headers={'Content-Type': 'application/json'})
