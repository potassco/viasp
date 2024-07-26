from viasp.server.database import CallCenter, db_session
import pytest
from typing import Tuple, List
import networkx as nx
from flask import current_app

from helper import get_clingo_stable_models
from viasp.shared.util import hash_from_sorted_transformations, hash_transformation_rules
from viasp.shared.model import Transformation, TransformerTransport, TransformationError, FailedReason, RuleContainer
from viasp.exampleTransformer import Transformer as ExampleTransfomer
from viasp.server.models import Encodings, Graphs, Recursions, DependencyGraphs, Models, Clingraphs, Warnings, Transformers, CurrentGraphs, GraphEdges, GraphNodes


@pytest.fixture(
    params=["program_simple", "program_multiple_sorts", "program_recursive"])
def graph_info(request, get_sort_program_and_get_graph,
    app_context
) -> Tuple[nx.DiGraph, str, List[Transformation]]:
    program = request.getfixturevalue(request.param)
    return get_sort_program_and_get_graph(program)[0]

def test_add_a_call_to_database(clingo_call_run_sample):
    db = CallCenter()
    assert len(db.calls) == 0, "Database should be empty initially."
    assert len(db.get_all()) == 0, "Database should be empty initially."
    assert len(db.get_pending()) == 0, "Database should be empty initially."
    db.extend(clingo_call_run_sample)
    assert len(db.calls) == 4, "Database should contain 4 after adding 4."
    assert len(db.get_all()) == 4, "Database should contain 4 after adding 4."
    assert len(db.get_pending()) == 4, "Database should contain 4 pending after adding 4 and not consuming them."
    db.mark_call_as_used(clingo_call_run_sample[0])
    assert len(db.calls) == 4, "Database should contain 4 after adding 4."
    assert len(db.get_all()) == 4, "Database should contain 4 after adding 4."
    assert len(db.get_pending()) == 3, "Database should contain 3 pending after adding 4 and consuming one."


def test_program_database(db_session):
    encoding_id = "test"
    program1 = "a. b:-a."
    program2 = "c."
    # assert len(db.load_program(encoding_id)) == 0, "Database should be empty initially."
    assert len(db_session.query(Encodings).all()) == 0, "Database should be empty initially."
    # db.save_program(program1, encoding_id)
    db_session.add(Encodings(id=encoding_id, program=program1))
    db_session.commit()
    assert db_session.query(Encodings).all()[0].program == program1
    # assert db.load_program(encoding_id) == program1
    db_program = db_session.query(Encodings).filter_by(id=encoding_id).first()
    db_program.program += program2
    db_session.commit()
    # db.add_to_program(program2, encoding_id)
    assert db_session.query(Encodings).all()[0].program == program1 + program2
    # assert db.load_program(encoding_id) == program1 + program2
    db_session.query(Encodings).filter_by(id=encoding_id).delete()
    db_session.commit()
    # db.clear_program(encoding_id)
    assert len(db_session.query(Encodings).all()) == 0, "Database should be empty after clearing."
    # assert len(db.load_program(encoding_id)) == 0, "Database should be empty after clearing."

def test_models_database(client_with_a_graph, db_session):
    _, _, _, program = client_with_a_graph
    serialized = get_clingo_stable_models(program)
    assert [current_app.json.loads(m.model) for m in db_session.query(Models).all()] == serialized
    db_session.query(Models).delete()
    db_session.commit()
    assert len(db_session.query(Models).all()) == 0, "Database should be empty after clearing."


def test_graph_json_database(graph_info, db_session):
    encoding_id = "test"

    db_graph = db_session.query(Graphs).filter_by(hash=graph_info[1], encoding_id=encoding_id).first()
    assert db_graph is None, "Database should be empty initially."
    # with pytest.raises(KeyError):
    #     db.load_graph_json(graph_info[1], encoding_id)

    db_session.add(Encodings(id=encoding_id, program=""))
    db_session.add(Graphs(hash=graph_info[1], sort=current_app.json.dumps(graph_info[2]), encoding_id=encoding_id, data=current_app.json.dumps(nx.node_link_data(graph_info[0]))))
    db_session.commit()
    r = db_session.query(Graphs).filter_by(hash=graph_info[1], encoding_id=encoding_id).first()
    # r = db.load_graph_json(graph_info[1], encoding_id)
    assert type(r.data) == str
    assert len(r.data) > 0
    db_session.query(Graphs).delete()
    db_session.query(DependencyGraphs).delete()
    db_session.query(Encodings).delete()
    db_session.query(Models).delete()


# def test_graph_database(graph_info):
#     db = GraphAccessor()
#     encoding_id = "test"

#     with pytest.raises(KeyError):
#         db.load_graph(graph_info[1], encoding_id)
#     db.save_graph(graph_info[0], graph_info[1], graph_info[2], encoding_id)
#     r = db.load_graph(graph_info[1], encoding_id)
#     assert type(r) == nx.DiGraph
#     assert len(r) > 0


# def test_current_graph_json_database(graph_info):
#     db = GraphAccessor()
#     encoding_id = "test"

#     with pytest.raises(KeyError):
#         db.load_current_graph_json(encoding_id)
#     db.save_graph(graph_info[0], graph_info[1], graph_info[2], encoding_id)
#     db.set_current_graph(graph_info[1], encoding_id)
#     assert len(db.load_current_graph_json(encoding_id)) > 0


# def test_current_graph_database(graph_info):
#     db = GraphAccessor()
#     encoding_id = "test"

#     with pytest.raises(KeyError):
#         db.load_current_graph(encoding_id)
#     db.save_graph(graph_info[0], graph_info[1], graph_info[2], encoding_id)
#     db.set_current_graph(graph_info[1], encoding_id)
#     r = db.load_current_graph(encoding_id)
#     assert len(r) > 1
#     assert type(r) == nx.DiGraph

#     # encoding_id = "test2"
#     db.save_graph(graph_info[0], graph_info[1][:5], graph_info[2], encoding_id)
#     db.set_current_graph(graph_info[1][:5], encoding_id)
#     r = db.load_current_graph(encoding_id)
#     assert len(r) > 1
#     assert type(r) == nx.DiGraph



# def test_sorts_database(get_sort_program, program_multiple_sorts):
#     # TODO: rewrite / remove this test
#     # test adjacent tests instead
#     db = GraphAccessor()
#     encoding_id = "test"
#     program = program_multiple_sorts
#     sort, _ = get_sort_program(program)

#     with pytest.raises(KeyError):
#         db.load_current_graph(encoding_id)
#     r = db.load_all_sorts(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0

#     db.save_sort(hash_from_sorted_transformations(sort), sort, encoding_id)
#     r = db.load_all_sorts(encoding_id)
#     assert len(r) == 1
#     assert type(r) == list

#     db.set_current_graph(hash_from_sorted_transformations(sort),
#                          encoding_id)
#     with pytest.raises(ValueError):
#         db.load_current_graph(encoding_id)
#     db.clear_all_sorts(encoding_id)
#     r = db.load_all_sorts(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0


# def test_current_sort_database(graph_info):
#     db = GraphAccessor()
#     encoding_id = "test"

#     r = db.load_all_sorts(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0
#     db.save_graph(graph_info[0], graph_info[1], graph_info[2], encoding_id)
#     db.set_current_graph(graph_info[1], encoding_id)
#     r = db.get_current_sort(encoding_id)
#     assert len(r) == 2
#     assert type(r) == list
#     for i in range(len(r)):
#         assert type(r[i]) == Transformation
#         assert r[i].id == i

# def test_recursion_database(app_context):
#     db = GraphAccessor()
#     encoding_id = "test"
#     recursion = {hash_transformation_rules(("a :- b.",)), hash_transformation_rules(("b :- c.",))}

#     r = db.load_recursive_transformations_hashes(encoding_id)
#     assert type(r) == set
#     assert len(r) == 0

#     db.save_recursive_transformations_hashes(recursion, encoding_id)
#     r = db.load_recursive_transformations_hashes(encoding_id)
#     assert type(r) == set
#     assert len(r) == 2

#     db.save_recursive_transformations_hashes({recursion.pop()}, encoding_id)
#     r = db.load_recursive_transformations_hashes(encoding_id)
#     assert type(r) == set
#     assert len(r) == 2

#     db.clear_recursive_transformations_hashes(encoding_id)
#     r = db.load_recursive_transformations_hashes(encoding_id)
#     assert type(r) == set
#     assert len(r) == 0

# def test_clingraph_database():
#     db = GraphAccessor()
#     encoding_id = "test"
#     clingraph_names = ["test1", "test2"]

#     r = db.load_all_clingraphs(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0
#     for n in clingraph_names:
#         db.save_clingraph(n, encoding_id)
#     r = db.load_all_clingraphs(encoding_id)
#     assert type(r) == list
#     assert len(r) == 2

#     db.clear_clingraph(encoding_id)
#     r = db.load_all_clingraphs(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0


# def test_warnings(app_context, load_analyzer, program_simple):
#     db = GraphAccessor()

#     encoding_id = "test"
#     analyzer = load_analyzer(program_simple)
#     some_ast = analyzer.rules[0]
#     warnings = [
#         TransformationError(ast=some_ast, reason=FailedReason.FAILURE),
#         TransformationError(ast=some_ast, reason=FailedReason.FAILURE)
#     ]
#     r = db.load_warnings(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0
#     db.save_warnings(warnings, encoding_id)
#     r = db.load_warnings(encoding_id)
#     assert type(r) == list
#     assert len(r) == 2
#     db.clear_warnings(encoding_id)
#     r = db.load_warnings(encoding_id)
#     assert type(r) == list
#     assert len(r) == 0


# def test_related_graphs(app_context):
#     db = GraphAccessor()

#     encoding_id = "test"
#     hash_1 = "hash1"
#     hash_2 = "hash2"

#     elements = ['x:-a.', 'y:-a.', 'z:-a.']
#     sort_1 = [Transformation(i, RuleContainer(str_=(elements[i], ))) for i in range(len(elements))]
#     sort_2 = [
#         Transformation(i, RuleContainer(str_=(elements[(i + 1) % len(elements)], )))
#         for i in range(len(elements))
#     ]

#     db.save_sort(hash_1, sort_1, encoding_id)
#     r = db.get_adjacent_graphs_hashes(hash_1, encoding_id)
#     assert r == []

#     db.insert_graph_adjacency(hash_1, hash_2, sort_2, encoding_id)

#     r = db.get_adjacent_graphs_hashes(hash_1, encoding_id)
#     assert type(r) == list
#     assert len(r) == 1
#     assert hash_2 in r

#     # assert bi-directional, many-to-many
#     hash_3 = "hash3"
#     sort_3 = [
#         Transformation(i, RuleContainer(str_=(elements[(i + 2) % len(elements)], )))
#         for i in range(len(elements))
#     ]
#     db.insert_graph_adjacency(hash_2, hash_3, sort_3, encoding_id)

#     r = db.get_adjacent_graphs_hashes(hash_2, encoding_id)
#     assert type(r) == list
#     assert len(r) == 2
#     assert hash_3 in r
#     assert hash_1 in r


# @pytest.mark.skip(reason="Transformer not registered bc of base exception?")
# def test_transformer_database(app_context):
#     db = GraphAccessor()

#     encoding_id = "test"
#     transformer = ExampleTransfomer()
#     path = str(
#         pathlib.Path(__file__).parent.parent.resolve() / "src" / "viasp" / "exampleTransformer.py") # type: ignore
#     transformer_transport = TransformerTransport.merge(transformer, "", path)
#     db.save_transformer(transformer_transport, encoding_id)
#     r = db.load_transformer(encoding_id)
#     assert type(r) == ExampleTransfomer
#     assert r == transformer
