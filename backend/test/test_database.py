import pytest
import networkx as nx
from flask import current_app
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select, update
from clingo.ast import parse_string
import uuid

from helper import get_clingo_stable_models
from viasp.shared.model import TransformerTransport, TransformationError, FailedReason, Node
from viasp.server.models import Encodings, Graphs, Recursions, DependencyGraphs, Models, Clingraphs, Warnings, Transformers, CurrentGraphs, GraphEdges, GraphNodes, GraphSymbols, AnalyzerConstants, AnalyzerFacts, AnalyzerNames
from conftest import setup_client, register_clingraph, register_transformer, program_simple, program_multiple_sorts, program_recursive



def test_program_database(db_session):
    encoding_id = "test"
    filename = "<string>"
    program1 = "a. b:-a."
    program2 = "c."
    db_session.add(Encodings(encoding_id=encoding_id, filename=filename, program=program1))
    db_session.commit()

    res = db_session.query(Encodings).all()
    assert len(res) == 1
    assert res[0].program == program1

    res = db_session.query(Encodings).filter_by(encoding_id=encoding_id).first()
    res.program += program2
    db_session.commit()

    res = db_session.query(Encodings).all()
    assert len(res) == 1
    assert res[0].program == program1 + program2

    db_session.query(Encodings).filter_by(encoding_id=encoding_id).delete()
    db_session.commit()
    assert len(db_session.query(Encodings).all()) == 0, "Database should be empty after clearing."


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


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
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


@pytest.mark.parametrize("program, expected_length", [
    (program_simple, 1),
])
def test_graph_database_datatypes(encoding_id, unique_session, db_session, program, expected_length):
    setup_client(unique_session, program)
    res = db_session.execute(
        select(Graphs)
        .where(Graphs.encoding_id == encoding_id)
    ).scalars().all()
    assert len(res) == expected_length
    graph = res[0]

    assert isinstance(graph.encoding_id, str)
    assert len(graph.encoding_id) > 0
    assert isinstance(graph.hash, str)
    assert len(graph.hash) > 0

    assert isinstance(graph.data, str)
    assert len(graph.data) > 0
    assert isinstance(nx.node_link_graph(current_app.json.loads(graph.data)), nx.DiGraph)

    assert isinstance(graph.sort, str)
    assert len(graph.sort) > 0
    assert isinstance(current_app.json.loads(graph.sort), list)


@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_graphs_data_is_nullable(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    db_graph = db_session.execute(
        select(Graphs)
        .where(Graphs.encoding_id == encoding_id)
    ).scalar()
    db_session.query(Graphs).filter_by(encoding_id=db_graph.encoding_id).update({"data": None})
    db_session.commit()
    db_graph = db_session.query(Graphs).first()
    assert db_graph.data is None


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_graphs_unique_constraint(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    db_graph = db_session.execute(
        select(Graphs)
        .where(Graphs.encoding_id == encoding_id)
    ).scalar()

    sort2 = current_app.json.loads(db_graph.sort)
    sort2.reverse()
    db_session.add(
        Graphs(hash=db_graph.hash,
                sort=current_app.json.dumps(sort2),
                encoding_id=encoding_id,
                data=None))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_current_graphs_datatypes(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    db_current_graphs = db_session.execute(
        select(CurrentGraphs)
        .where(CurrentGraphs.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_current_graphs) == 1
    assert isinstance(db_current_graphs[0].hash, str)
    assert isinstance(db_current_graphs[0].encoding_id, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_current_graph_uniqueness(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    db_current_graphs = db_session.execute(
        select(CurrentGraphs)
        .where(CurrentGraphs.encoding_id == encoding_id)
    ).scalar()
    db_session.add(CurrentGraphs(hash=db_current_graphs.hash+"2", encoding_id=db_current_graphs.encoding_id))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_session.add(CurrentGraphs(hash=db_current_graphs.hash, encoding_id=db_current_graphs.encoding_id+"2"))
    db_session.commit()
    db_current_graphs = db_session.execute(
        select(CurrentGraphs)
    ).scalars().all()
    assert len(db_current_graphs) == 2


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_nodes_datatypes(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)

    db_graph_nodes = db_session.execute(
        select(GraphNodes)
        .where(GraphNodes.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_graph_nodes) > 0
    for node in db_graph_nodes:
        assert isinstance(node.encoding_id, str)
        assert isinstance(node.graph_hash, str)
        assert isinstance(node.transformation_hash, str)
        assert isinstance(node.branch_position, float)
        assert isinstance(node.node, str)
        assert isinstance(current_app.json.loads(node.node), Node)
        assert isinstance(node.node_uuid, str)
        assert node.recursive_supernode_uuid == None or \
                type(node.recursive_supernode_uuid) == str


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_nodes_nullable(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)

    db_session.execute(
        update(GraphNodes)
        .where(GraphNodes.encoding_id == encoding_id)
        .values(recursive_supernode_uuid=None)
    )
    db_graph_nodes = db_session.execute(
        select(GraphNodes)
        .where(GraphNodes.encoding_id == encoding_id)
    ).scalars().all()
    for n in db_graph_nodes:
        assert n.recursive_supernode_uuid == None


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_nodes_uniqueness(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    db_node = db_session.execute(
        select(GraphNodes)
        .where(GraphNodes.encoding_id == encoding_id)
    ).scalar()

    db_session.add(GraphNodes(encoding_id=db_node.encoding_id+"1",
                                graph_hash=db_node.graph_hash+"1",
                                transformation_hash=db_node.transformation_hash+"1",
                                branch_position=db_node.branch_position+1,
                                node=db_node.node+"1",
                                node_uuid=db_node.node_uuid))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


@pytest.mark.parametrize("program, expected_n_symbols", [
    (program_simple, 10),
    (program_multiple_sorts, 14),
    (program_recursive, 36)
])
def test_graph_symbols_datatypes(encoding_id, unique_session, db_session, program, expected_n_symbols):
    setup_client(unique_session, program)

    db_graph_node_uuids = db_session.execute(
        select(GraphNodes.node_uuid)
        .where(GraphNodes.encoding_id == encoding_id)
    ).scalars().all()
    db_graph_symbols = db_session.execute(
        select(GraphSymbols)
        .filter(GraphSymbols.node.in_(db_graph_node_uuids))
    ).scalars().all()

    assert len(db_graph_symbols) == expected_n_symbols
    for sym in db_graph_symbols:
        assert isinstance(sym.id, int)
        assert isinstance(sym.node, str)
        assert isinstance(sym.symbol_uuid, str)
        assert isinstance(sym.symbol, str)


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_graph_edges_datatypes(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)

    db_graph_edges = db_session.execute(
        select(GraphEdges)
        .where(GraphEdges.encoding_id == encoding_id)
    ).scalars().all()

    for edge in db_graph_edges:
        assert isinstance(edge.id, int)
        assert isinstance(edge.encoding_id, str)
        assert isinstance(edge.graph_hash, str)
        assert isinstance(edge.source, str)
        assert isinstance(edge.target, str)
        assert isinstance(edge.transformation_hash, str)
        assert isinstance(edge.style, str)
        assert edge.recursion_anchor_keyword == None \
            or  isinstance(edge.recursion_anchor_keyword, str)
        assert edge.recursive_supernode_uuid == None \
            or  isinstance(edge.recursive_supernode_uuid, str)


@pytest.mark.parametrize("program", [
    (program_simple),
    (program_multiple_sorts),
    (program_recursive)
])
def test_dependency_graphs_database(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)

    db_dependency_graphs = db_session.execute(
        select(DependencyGraphs)
        .where(DependencyGraphs.encoding_id == encoding_id)
    ).scalars().all()

    assert len(db_dependency_graphs) == 1
    for graph in db_dependency_graphs:
        assert isinstance(graph.encoding_id, str)
        assert isinstance(graph.data, str)
        g = nx.node_link_graph(current_app.json.loads(graph.data))
        assert isinstance(g, nx.DiGraph)
        assert len(g.nodes) > 0


@pytest.mark.parametrize("program, n_recursions", [
    (program_simple, 0),
    (program_multiple_sorts, 0),
    (program_recursive, 1)
])
def test_recursion_datatypes(encoding_id, unique_session, db_session, program, n_recursions):
    setup_client(unique_session, program)

    db_recursions = db_session.execute(
        select(Recursions)
        .where(Recursions.encoding_id == encoding_id)
    ).scalars().all()

    assert len(db_recursions) == n_recursions
    for recursion in db_recursions:
        assert isinstance(recursion.encoding_id, str)
        assert isinstance(recursion.recursive_transformation_hash, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_recursive)
])
def test_recursion_unique_constraint(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)

    db_recursions = db_session.execute(
        select(Recursions)
        .where(Recursions.encoding_id == encoding_id)
    ).scalars().one()

    db_session.add(
        Recursions(
            encoding_id=db_recursions.encoding_id,
            recursive_transformation_hash=db_recursions.recursive_transformation_hash
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    db_session.add(
        Recursions(
            encoding_id=db_recursions.encoding_id+"1",
            recursive_transformation_hash=db_recursions.recursive_transformation_hash
        )
    )
    db_session.add(
        Recursions(
            encoding_id=db_recursions.encoding_id,
            recursive_transformation_hash=uuid.uuid4().hex
        )
    )
    db_session.commit()

    db_recursions = db_session.execute(
        select(Recursions)
    ).scalars().all()
    assert len(db_recursions) == 3


@pytest.mark.parametrize("program, expected_n_clingraphs", [
    (program_simple, 4),
    (program_multiple_sorts, 4),
    (program_recursive, 0)
])
def test_clingraphs_datatypes(encoding_id, unique_session, db_session, program, expected_n_clingraphs):
    setup_client(unique_session, program)
    register_clingraph(unique_session, "node(B):-a(B).attr(node,B,color,blue):-node(B).")

    db_clingraphs = db_session.execute(
        select(Clingraphs)
        .where(Clingraphs.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_clingraphs) == expected_n_clingraphs

    for clingraph in db_clingraphs:
        assert isinstance(clingraph.id, int)
        assert isinstance(clingraph.encoding_id, str)
        assert isinstance(clingraph.filename, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_clingraph_unique_constraint(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    register_clingraph(unique_session, "node(B):-a(B).attr(node,B,color,blue):-node(B).")

    db_clingraph = db_session.execute(
        select(Clingraphs)
        .where(Clingraphs.encoding_id == encoding_id)
    ).scalar()
    db_session.add(Clingraphs(
        encoding_id = db_clingraph.encoding_id,
        filename = db_clingraph.filename))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


@pytest.mark.skip("Error due to namespace mismatch clingoTransformer")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_transformer_datatypes(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    register_transformer(unique_session)

    res = db_session.execute(
        select(Transformers)
        .where(Transformers.encoding_id == encoding_id)
    ).scalars().all()
    assert isinstance(res, list)
    assert len(res) == 1
    for t in res:
        assert isinstance(t.encoding_id, str)
        assert isinstance(t.transformer, bytes)
        assert isinstance(current_app.json.loads(t.transformer), TransformerTransport)


@pytest.mark.skip("Error due to namespace mismatch clingoTransformer")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_transformers_uniqueness(encoding_id, unique_session, db_session, program):
    setup_client(unique_session, program)
    register_transformer(unique_session)

    res = db_session.execute(
        select(Transformers)
        .where(Transformers.encoding_id == encoding_id)
    ).scalar()

    db_session.add(Transformers(
        encoding_id = encoding_id,
        transformer = res.transformer
    ))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    encoding_id2 = uuid.uuid4().hex
    db_session.add(Transformers(
        encoding_id = encoding_id2,
        transformer = res.transformer
    ))
    db_session.commit()
    res = db_session.execute(
        select(Transformers)
        .where(Transformers.encoding_id == encoding_id or Transformers.encoding_id == encoding_id2)
    ).scalars().all()
    assert len(res) == 2


@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_warnings_datatypes(unique_session, db_session, program):
    setup_client(unique_session, program)

    test_ast = []
    parse_string(program, test_ast.append)

    te0 = TransformationError(ast=test_ast[0], reason=FailedReason.FAILURE)
    te1 = TransformationError(ast=test_ast[1], reason=FailedReason.WARNING)
    db_session.add(
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te0)
        )
    )
    db_session.commit()


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
@pytest.mark.parametrize("program", [
    (program_simple),
])
def test_warnings_uniqueness(unique_session, db_session, program):
    setup_client(unique_session, program)

    test_ast = []
    parse_string(program, test_ast.append)

    te0 = TransformationError(ast=test_ast[0], reason=FailedReason.FAILURE)
    te1 = TransformationError(ast=test_ast[1], reason=FailedReason.WARNING)
    db_session.add_all([
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te0)
        ),
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te0)
        )
    ])
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
    db_session.add_all([
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te0)
        ),
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te1)
        )
    ])
    db_session.flush()
    db_session.rollback()
    db_session.add_all([
        Warnings(
            encoding_id = "test",
            warning = current_app.json.dumps(te0)
        ),
        Warnings(
            encoding_id = "testother",
            warning = current_app.json.dumps(te0)
        )
    ])
    db_session.flush()
    db_session.rollback()


@pytest.mark.parametrize("program, expected_names_len", [
    (program_simple, 5),
    (program_multiple_sorts, 5),
    (program_recursive, 5)
])
def test_analyzer_names_datatypes(encoding_id, unique_session, db_session, program, expected_names_len):
    setup_client(unique_session, program)

    db_names = db_session.execute(
        select(AnalyzerNames)
        .where(AnalyzerNames.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_names) == expected_names_len
    for n in db_names:
        assert isinstance(n.encoding_id, str)
        assert isinstance(n.name, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
def test_analyzer_names_uniqueness(encoding_id, unique_session, db_session):
    db_name = {"encoding_id": encoding_id, "name": "example"}
    db_session.add(AnalyzerNames(**db_name))
    db_session.add(AnalyzerNames(**db_name))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_name2 = {"encoding_id": encoding_id, "name": "other"}
    encoding_id2 = uuid.uuid4().hex
    db_name3 = {"encoding_id": encoding_id2, "name": "other"}
    db_session.add(AnalyzerNames(**db_name))
    db_session.add(AnalyzerNames(**db_name2))
    db_session.add(AnalyzerNames(**db_name3))
    db_session.commit()
    res = db_session.execute(
        select(AnalyzerNames)
        .filter(AnalyzerNames.encoding_id.in_([encoding_id, encoding_id2])  )
    ).scalars().all()
    assert len(res) == 3


@pytest.mark.parametrize("program, expected_facts", [
    (program_simple, 1),
    (program_recursive, 0),
    (program_multiple_sorts, 1),
])
def test_facts_datatypes(encoding_id, unique_session, db_session, program, expected_facts):
    setup_client(unique_session, program)

    db_facts = db_session.execute(
        select(AnalyzerFacts)
        .where(AnalyzerFacts.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_facts) == expected_facts
    for f in db_facts:
        assert isinstance(f.encoding_id, str)
        assert isinstance(f.fact, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
def test_facts_uniqueness(encoding_id, unique_session, db_session):
    db_fact = {"encoding_id": encoding_id, "fact": "example fact"}
    db_session.add(AnalyzerFacts(**db_fact))
    db_session.add(AnalyzerFacts(**db_fact))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_fact2 = {"encoding_id": encoding_id, "fact": "other example fact"}
    encoding_id2 = uuid.uuid4().hex
    db_fact3 = {"encoding_id": encoding_id2, "fact": "example fact"}
    db_session.add(AnalyzerFacts(**db_fact))
    db_session.add(AnalyzerFacts(**db_fact2))
    db_session.add(AnalyzerFacts(**db_fact3))
    db_session.commit()
    res = db_session.execute(
        select(AnalyzerFacts)
        .where(AnalyzerFacts.encoding_id.in_([encoding_id, encoding_id2]))
    ).scalars().all()
    assert len(res) == 3


@pytest.mark.parametrize("program, expected_names_len", [
    (f"{program_simple}#const n=2.d(n).", 1),
    (program_simple, 0),
    (program_recursive, 0),
    (program_multiple_sorts, 0),
])
def test_analyzer_constants_datatypes(encoding_id, unique_session, db_session, program, expected_names_len):
    setup_client(unique_session, program)

    db_names = db_session.execute(
        select(AnalyzerConstants)
        .where(AnalyzerConstants.encoding_id == encoding_id)
    ).scalars().all()
    assert len(db_names) == expected_names_len
    for n in db_names:
        assert isinstance(n.encoding_id, str)
        assert isinstance(n.constant, str)


@pytest.mark.filterwarnings("ignore::sqlalchemy.exc.SAWarning")
def test_analyzer_constants_uniqueness(encoding_id, unique_session, db_session):
    db_const = {"encoding_id": encoding_id, "constant": "example"}
    db_session.add(AnalyzerConstants(**db_const))
    db_session.add(AnalyzerConstants(**db_const))
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    db_const2 = {"encoding_id": encoding_id, "constant": "other"}
    encoding_id2 = uuid.uuid4().hex
    db_const3 = {"encoding_id": encoding_id2, "constant": "example fact"}
    db_session.add(AnalyzerConstants(**db_const))
    db_session.add(AnalyzerConstants(**db_const2))
    db_session.add(AnalyzerConstants(**db_const3))
    db_session.commit()
    res = db_session.execute(
        select(AnalyzerConstants).
        where(AnalyzerConstants.encoding_id.in_([encoding_id, encoding_id2]))
    ).scalars().all()
    assert len(res) == 3
