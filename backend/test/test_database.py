import pytest
from typing import Tuple, List, Dict
import networkx as nx
from flask import current_app
from sqlalchemy.exc import MultipleResultsFound, IntegrityError

from conftest import db_session
from helper import get_clingo_stable_models
from viasp.shared.util import hash_from_sorted_transformations, hash_transformation_rules, get_start_node_from_graph
from viasp.server.blueprints.dag_api import get_node_positions
from viasp.shared.model import Transformation, TransformerTransport, TransformationError, FailedReason, RuleContainer, Node
from viasp.exampleTransformer import Transformer as ExampleTransfomer
from viasp.server.models import Encodings, Graphs, Recursions, DependencyGraphs, Models, Clingraphs, Warnings, Transformers, CurrentGraphs, GraphEdges, GraphNodes, AnalyzerConstants, AnalyzerFacts, AnalyzerNames


@pytest.fixture(
    params=["program_simple", "program_multiple_sorts", "program_recursive"])
def graph_info(request, get_sort_program_and_get_graph,
    app_context
) -> Tuple[nx.DiGraph, str, List[Transformation]]:
    program = request.getfixturevalue(request.param)
    return get_sort_program_and_get_graph(program)[0]


def test_program_database(db_session):
    encoding_id = "test"
    program1 = "a. b:-a."
    program2 = "c."
    assert len(db_session.query(Encodings).all()) == 0, "Database should be empty initially."
    db_session.add(Encodings(id=encoding_id, program=program1))
    db_session.commit()

    res = db_session.query(Encodings).all()
    assert len(res) == 1
    assert res[0].program == program1

    res = db_session.query(Encodings).filter_by(id=encoding_id).first()
    res.program += program2
    db_session.commit()

    res = db_session.query(Encodings).all()
    assert len(res) == 1
    assert res[0].program == program1 + program2

    db_session.query(Encodings).filter_by(id=encoding_id).delete()
    db_session.commit()
    assert len(db_session.query(Encodings).all()) == 0, "Database should be empty after clearing."


def test_encoding_id_is_unique(db_session):
    encoding_id = "test"
    program1 = "a. b:-a."
    program2 = "c."

    db_session.add(Encodings(id=encoding_id, program=program1))
    db_session.add(Encodings(id=encoding_id, program=program2))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(Encodings(id=encoding_id+"1", program=program1))
    db_session.add(Encodings(id=encoding_id+"2", program=program1))
    db_session.commit()
    res = db_session.query(Encodings).all()
    assert len(res) == 2


def test_models_database(app_context, db_session):
    encoding_id = "test"
    program1 = "a. b:-a."

    models = get_clingo_stable_models(program1)
    db_session.add_all([Models(encoding_id=encoding_id, model=current_app.json.dumps(m)) for m in models])
    db_session.commit()

    res = db_session.query(Models).all()
    assert len(res) == len(models)
    serialized = [current_app.json.loads(m.model) for m in res]
    assert all([m in models for m in serialized])

    assert len(set([m.id for m in res])) == len(res), "id must be unique"


def test_models_unique_constraint_database(app_context, db_session):
    encoding_id = "test"
    program = "a. b:-a."

    models = get_clingo_stable_models(program)
    db_session.add_all([
        Models(encoding_id=encoding_id, model=current_app.json.dumps(m))
        for m in models
    ])
    db_session.add(Models(encoding_id=encoding_id, model=current_app.json.dumps(models[0])))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(
        Models(encoding_id=encoding_id+"1",
               model=current_app.json.dumps(models[0])))
    db_session.add(
        Models(encoding_id=encoding_id + "2",
               model=current_app.json.dumps(models[0])))
    db_session.commit()
    res = db_session.query(Models).all()
    assert len(res) == 2


def test_graph_json_database(graph_info, db_session):
    encoding_id = "test"
    graph, hash, sort = graph_info

    db_graph = db_session.query(Graphs).filter_by(hash=hash, encoding_id=encoding_id).first()
    assert db_graph is None, "Database should be empty initially."

    db_session.add(Encodings(id=encoding_id, program=""))
    db_session.add(Graphs(hash=hash, sort=current_app.json.dumps(sort), encoding_id=encoding_id, data=current_app.json.dumps(nx.node_link_data(graph))))
    db_session.commit()
    r = db_session.query(Graphs).filter_by(hash=hash, encoding_id=encoding_id).first()
    assert type(r.data) == str
    assert len(r.data) > 0
    db_session.query(Graphs).delete()
    db_session.query(DependencyGraphs).delete()
    db_session.query(Encodings).delete()
    db_session.query(Models).delete()


def test_graphs_data_is_nullable(graph_info, db_session):
    encoding_id = "test"
    _, hash, sort = graph_info

    db_session.add(Graphs(hash=hash, sort=current_app.json.dumps(sort), encoding_id=encoding_id, data=None))
    db_session.commit()


def test_graphs_encodingid_hash_unique_constraint(graph_info, db_session):
    encoding_id = "test"
    _, hash, sort = graph_info

    db_session.add(
        Graphs(hash=hash,
               sort=current_app.json.dumps(sort),
               encoding_id=encoding_id,
               data=None))
    sort2 = sort
    sort2.reverse()
    db_session.add(
        Graphs(hash=hash,
               sort=current_app.json.dumps(sort2),
               encoding_id=encoding_id,
               data=None))

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_graph_data_database(db_session, graph_info):
    encoding_id = "test"
    graph, hash, sort = graph_info

    res = db_session.query(Graphs).filter_by(hash = hash, encoding_id = encoding_id).one_or_none()
    assert res == None

    db_session.add(Graphs(data=current_app.json.dumps(nx.node_link_data(graph)), hash=hash, encoding_id=encoding_id, sort=current_app.json.dumps(sort)))
    db_session.commit()

    res = db_session.query(Graphs).filter_by(hash=hash, encoding_id=encoding_id).one_or_none()
    assert res != None
    assert type(res) == Graphs
    assert type(res.data) == str
    assert len(res.data) > 0
    assert type(nx.node_link_graph(current_app.json.loads(res.data))) == nx.DiGraph


def test_graph_data_is_unique(db_session, graph_info):
    encoding_id = "test"
    graph, hash, sort = graph_info

    db_session.add(
        Graphs(data=current_app.json.dumps(nx.node_link_data(graph)),
               hash=hash,
               encoding_id=encoding_id,
               sort=current_app.json.dumps(sort)))
    db_session.add(
        Graphs(data=current_app.json.dumps(nx.node_link_data(graph)),
               hash=hash,
               encoding_id=encoding_id,
               sort=current_app.json.dumps(sort)))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()



def test_current_graph_json_database(db_session, graph_info):
    encoding_id = "test"
    _, hash, _ = graph_info

    res = db_session.query(CurrentGraphs).filter_by(
        encoding_id=encoding_id).one_or_none()
    assert res == None

    db_session.add(CurrentGraphs(hash=hash, encoding_id=encoding_id))
    db_session.commit()

    res = db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).one_or_none()
    assert res != None
    assert type(res) == CurrentGraphs
    assert type(res.hash) == str
    assert len(res.hash) > 0


def test_current_graph_is_unique(db_session, graph_info):
    encoding_id = "test"
    _, hash, _ = graph_info

    res = db_session.query(CurrentGraphs).filter_by(
        encoding_id=encoding_id).one_or_none()
    assert res == None

    db_session.add(CurrentGraphs(hash=hash, encoding_id=encoding_id))
    db_session.add(CurrentGraphs(hash=hash+"2", encoding_id=encoding_id))

    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(CurrentGraphs(hash=hash, encoding_id=encoding_id))
    db_session.add(CurrentGraphs(hash=hash, encoding_id=encoding_id+"2"))
    db_session.commit()

    res = db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).all()
    assert len(res) == 1
    res = db_session.query(CurrentGraphs).filter_by(
        encoding_id=encoding_id+"2").all()
    assert len(res) == 1


def test_graph_nodes_database(db_session, graph_info):
    encoding_id = "test"
    graph, hash, sort = graph_info

    res = db_session.query(GraphNodes).filter_by(
        encoding_id=encoding_id).all()
    assert len(res) == 0

    pos: Dict[Node, List[float]] = get_node_positions(graph)
    db_nodes = [
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=hash,
                   transformation_hash=d["transformation"].hash,
                   branch_position=pos[node][0],
                   node=current_app.json.dumps(node),
                   node_uuid=node.uuid.hex)
    for _, node, d in graph.edges(data=True)]
    fact_node = get_start_node_from_graph(graph)
    db_nodes.append(
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=hash,
                   transformation_hash="-1",
                   branch_position=0,
                   node=current_app.json.dumps(fact_node),
                   node_uuid=fact_node.uuid.hex))

    db_session.add_all(db_nodes)
    db_session.commit()

    res = db_session.query(GraphNodes).filter_by(encoding_id=encoding_id).order_by(GraphNodes.branch_position).all()
    assert len(res) == len(graph.nodes)
    assert len(set([r.node for r in res])) == len(res)


@pytest.mark.skip(reason="Not implemented yet")
def test_graph_edges_database(db_session, graph_info):
    pass


def test_dependency_graphs_database(db_session, load_analyzer):
    encoding_id = "test"
    program1 = "a. b:-a."

    analyzer = load_analyzer(program1)

    res = db_session.query(DependencyGraphs).filter_by(
        encoding_id=encoding_id).all()
    assert len(res) == 0

    db_session.add(DependencyGraphs(encoding_id=encoding_id, data=current_app.json.dumps(analyzer.dependency_graph)))
    db_session.commit()

    res = db_session.query(DependencyGraphs).filter_by(encoding_id=encoding_id).all()
    assert len(res) == 1
    assert type(res[0].data) == str
    assert len(res[0].data) > 0


def test_recursion_database(app_context, db_session):
    encoding_id = "test"
    recursion = [hash_transformation_rules(("a :- b.",)), hash_transformation_rules(("b :- c.",))]

    res = db_session.query(Recursions).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add_all([
        Recursions(encoding_id=encoding_id,
                   recursive_transformation_hash=r_hash)
    for r_hash in recursion])
    db_session.commit()

    res = db_session.query(Recursions).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 2


def test_recursion_unique_constraint_database(app_context, db_session):
    encoding_id = "test"
    recursion = hash_transformation_rules(("a :- b.", ))

    db_session.add(Recursions(encoding_id=encoding_id,
                   recursive_transformation_hash=recursion))
    db_session.add(
        Recursions(encoding_id=encoding_id,
                   recursive_transformation_hash=recursion))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(Recursions(encoding_id=encoding_id+"1",
                    recursive_transformation_hash=recursion))
    db_session.add(Recursions(encoding_id=encoding_id+"2",
                    recursive_transformation_hash=recursion))
    db_session.commit()
    res = db_session.query(Recursions).all()
    assert len(res) == 2


def test_clingraph_database(db_session):
    encoding_id = "test"
    clingraph_names = ["test1", "test2"]

    r = db_session.query(Clingraphs).all()
    assert type(r) == list
    assert len(r) == 0

    for n in clingraph_names:
        db_session.add(Clingraphs(encoding_id=encoding_id, filename=n))
    db_session.commit()

    r = db_session.query(Clingraphs).filter_by(encoding_id=encoding_id).all()
    assert type(r) == list
    assert len(r) == 2


def test_clingraph_unique_constraint_database(db_session):
    encoding_id = "test"
    clingraph_name = "test1"

    res = db_session.query(Clingraphs).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add(Clingraphs(encoding_id=encoding_id,
                              filename=clingraph_name))
    db_session.add(Clingraphs(encoding_id=encoding_id,
                              filename=clingraph_name))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(Clingraphs(encoding_id=encoding_id+"1",
                                filename=clingraph_name))
    db_session.add(Clingraphs(encoding_id=encoding_id+"2",
                                filename=clingraph_name))
    db_session.commit()
    res = db_session.query(Clingraphs).all()
    assert type(res) == list
    assert len(res) == 2


def test_warnings_database(app_context, load_analyzer, program_simple, db_session):
    encoding_id = "test"
    analyzer = load_analyzer(program_simple)
    warnings = [
        TransformationError(ast=analyzer.rules[0],
                            reason=FailedReason.FAILURE),
        TransformationError(ast=analyzer.rules[1], reason=FailedReason.FAILURE)
    ]

    res = db_session.query(Warnings).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add_all([Warnings(encoding_id=encoding_id, warning=current_app.json.dumps(w)) for w in warnings])
    db_session.commit()

    res = db_session.query(Warnings).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 2


def test_warnings_unique_constraint_database(app_context, load_analyzer, program_simple,
                           db_session):
    encoding_id = "test"
    analyzer = load_analyzer(program_simple)
    warning = TransformationError(ast=analyzer.rules[0],
                            reason=FailedReason.FAILURE)

    db_session.add(
        Warnings(encoding_id=encoding_id,
                 warning=current_app.json.dumps(warning)))
    db_session.add(
        Warnings(encoding_id=encoding_id,
                 warning=current_app.json.dumps(warning)))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(
        Warnings(encoding_id=encoding_id+"1",
                 warning=current_app.json.dumps(warning)))
    db_session.add(
        Warnings(encoding_id=encoding_id+"2",
                 warning=current_app.json.dumps(warning)))
    db_session.commit()
    res = db_session.query(Warnings).all()
    assert len(res) == 2


@pytest.mark.skip(reason="Transformer not registered bc of base exception?")
def test_transformer_database(app_context, db_session):
    encoding_id = "test"
    transformer = ExampleTransfomer()
    path = str(
        pathlib.Path(__file__).parent.parent.resolve() / "src" / "viasp" / "exampleTransformer.py") # type: ignore
    transformer_transport = TransformerTransport.merge(transformer, "", path)
    db_session.add(Transformers(encoding_id=encoding_id, transformer=current_app.json.dumps(transformer_transport)))
    res = db_session.query(Transformers).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 1
    res = current_app.json.loads(res[0].transformer)
    assert res == transformer


def test_facts_database(app_context, db_session):
    encoding_id = "test"
    facts = {"a", "b"}

    res = db_session.query(AnalyzerFacts).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add_all([AnalyzerFacts(encoding_id=encoding_id, fact=f) for f in facts])
    db_session.commit()

    res = db_session.query(AnalyzerFacts).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 2

def test_facts_unique_constraint_database(app_context, db_session):
    encoding_id = "test"
    fact = "a"

    db_session.add(AnalyzerFacts(encoding_id=encoding_id, fact=fact))
    db_session.add(AnalyzerFacts(encoding_id=encoding_id, fact=fact))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(AnalyzerFacts(encoding_id=encoding_id+"1", fact=fact))
    db_session.add(AnalyzerFacts(encoding_id=encoding_id+"2", fact=fact))
    db_session.commit()
    res = db_session.query(AnalyzerFacts).all()
    assert len(res) == 2


def test_constants_database(app_context, db_session):
    encoding_id = "test"
    constants = {"#const n=2.", "#const b=3."}

    res = db_session.query(AnalyzerConstants).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add_all([AnalyzerConstants(encoding_id=encoding_id, constant=c) for c in constants])
    db_session.commit()

    res = db_session.query(AnalyzerConstants).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 2


def test_constants_unique_constraint_database(app_context, db_session):
    encoding_id = "test"
    constant = "#const n=2."

    db_session.add(AnalyzerConstants(encoding_id=encoding_id, constant=constant))
    db_session.add(AnalyzerConstants(encoding_id=encoding_id, constant=constant))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(AnalyzerConstants(encoding_id=encoding_id+"1", constant=constant))
    db_session.add(AnalyzerConstants(encoding_id=encoding_id+"2", constant=constant))
    db_session.commit()
    res = db_session.query(AnalyzerConstants).all()
    assert len(res) == 2


def test_analyzer_names_database(app_context, db_session):
    encoding_id = "test"
    names = {"a", "b"}

    res = db_session.query(AnalyzerNames).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 0

    db_session.add_all([AnalyzerNames(encoding_id=encoding_id, name=n) for n in names])
    db_session.commit()

    res = db_session.query(AnalyzerNames).filter_by(encoding_id=encoding_id).all()
    assert type(res) == list
    assert len(res) == 2


def test_analyzer_names_unique_constraint_database(app_context, db_session):
    encoding_id = "test"
    name = "a"

    db_session.add(AnalyzerNames(encoding_id=encoding_id, name=name))
    db_session.add(AnalyzerNames(encoding_id=encoding_id, name=name))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(AnalyzerNames(encoding_id=encoding_id+"1", name=name))
    db_session.add(AnalyzerNames(encoding_id=encoding_id+"2", name=name))
    db_session.commit()
    res = db_session.query(AnalyzerNames).all()
    assert len(res) == 2
