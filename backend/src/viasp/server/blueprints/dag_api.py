import os
from collections import defaultdict
from typing import Union, Collection, Dict, List, Iterable, Optional
import uuid

import igraph
import networkx as nx
import numpy as np
from flask import Blueprint, current_app, session, request, jsonify, abort, Response, send_file
from clingo.ast import AST
from sqlalchemy.exc import MultipleResultsFound, NoResultFound
from sqlalchemy import select, delete, update

from ...asp.reify import ProgramAnalyzer, reify_list
from ...asp.justify import build_graph, search_nonground_term_in_symbols
from ...shared.defaults import STATIC_PATH
from ...shared.model import SearchResultSymbolWrapper, Transformation, Node, Signature
from ...shared.util import get_start_node_from_graph, hash_from_sorted_transformations, pairwise, get_compatible_node_link_data
from ...shared.io import StableModel
from ...shared.simple_logging import error
from ..database import ensure_encoding_id, db_session
from ..models import *


bp = Blueprint("dag_api",
               __name__,
               template_folder='../templates',
               static_folder='../static/',
               static_url_path='/static')

class DatabaseInconsistencyError(Exception):
    def __init__(self, message="Database inconsistency found"):
        self.message = message
        super().__init__(self.message)

def nx_to_igraph(nx_graph: nx.DiGraph):
    return igraph.Graph.Adjacency((np.array(nx.to_numpy_array(nx_graph))
                                   > 0).tolist())

def get_current_graph_hash(encoding_id: str) -> Optional[str]:
    query = select(CurrentGraphs.hash).filter_by(encoding_id=encoding_id)
    return db_session.execute(query).scalars().one()

def _get_graph(encoding_id: str):
    current_graph_hash = get_current_graph_hash(encoding_id)
    result = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=current_graph_hash).first()
    if result is not None and result.data is not None and result.data != "":
        graph = nx.node_link_graph(current_app.json.loads(result.data))
    else:
        graph = generate_graph(encoding_id)
    return graph


def igraph_to_networkx_layout(i_layout, nx_map):
    nx_layout = {}
    for i, pos in enumerate(i_layout.coords):
        nx_layout[nx_map[i]] = pos
    return nx_layout


def make_node_positions(nx_graph: nx.DiGraph, i_graph: igraph.Graph):
    layout = i_graph.layout_reingold_tilford(root=[0])
    layout.rotate(180)
    nx_map = {i: node for i, node in enumerate(nx_graph.nodes())}
    pos = igraph_to_networkx_layout(layout, nx_map)
    return pos


def get_node_positions(nx_graph: nx.DiGraph):
    i_graph = nx_to_igraph(nx_graph)
    pos = make_node_positions(nx_graph, i_graph)
    return pos


def handle_request_for_children(
        transformation_hash: str,
        ids_only: bool,
        encoding_id: str) -> Collection[Union[Node, uuid.UUID]]:
    current_graph_hash = get_current_graph_hash(encoding_id)
    result = db_session.query(GraphNodes).filter_by(encoding_id=encoding_id, graph_hash=current_graph_hash, transformation_hash=transformation_hash, recursive_supernode_uuid = None).order_by(GraphNodes.branch_position).all()
    ordered_children = [current_app.json.loads(n.node) for n in result]
    if ids_only:
        ordered_children = [node.uuid for node in ordered_children]
    return ordered_children


def handle_request_for_children_with_sortHash(
        transformation_hash: str,
        current_hash: str,
        encoding_id: str) -> Collection[Node]:
    result = db_session.query(GraphNodes).filter_by(encoding_id=encoding_id, graph_hash=current_hash, transformation_hash=transformation_hash, recursive_supernode_uuid = None).order_by(GraphNodes.branch_position).all()
    ordered_children = [current_app.json.loads(n.node) for n in result]
    return ordered_children


def clear_encoding_session_data(encoding_id: str):
    db_session.query(Encodings).filter_by(encoding_id=encoding_id).delete()
    db_session.query(Models).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Graphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(CurrentGraphs).filter_by(encoding_id = encoding_id).delete()
    db_graph_node_uuids = db_session.execute(
        select(GraphNodes.node_uuid).filter_by(
            encoding_id=encoding_id,
            recursive_supernode_uuid=None)).scalars().all()
    db_session.execute(delete(GraphSymbols).filter(GraphSymbols.node.in_(db_graph_node_uuids)))
    db_session.query(GraphNodes).filter_by(encoding_id = encoding_id).delete()
    db_session.query(GraphEdges).filter_by(encoding_id = encoding_id).delete()
    db_session.query(DependencyGraphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Recursions).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Clingraphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Transformers).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Warnings).filter_by(encoding_id = encoding_id).delete()
    db_session.execute(delete(AnalyzerNames).filter_by(encoding_id = encoding_id))
    db_session.execute(delete(AnalyzerFacts).filter_by(encoding_id = encoding_id))
    db_session.execute(delete(AnalyzerConstants).filter_by(encoding_id = encoding_id))
    db_session.commit()


@bp.route("/graph/children/<transformation_hash>", methods=["GET"])
@ensure_encoding_id
def get_children(transformation_hash):
    if request.method == "GET":
        ids_only = request.args.get("ids_only", default=False, type=bool)
        to_be_returned = handle_request_for_children(transformation_hash,
                                                     ids_only,
                                                     session['encoding_id'])
        return jsonify(to_be_returned)
    raise NotImplementedError


@bp.route("/graph/children", methods=["POST"])
@ensure_encoding_id
def get_children_of_transformation_hash_and_current_Sort():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "transformationHash" not in request.json:
            return jsonify({'error':
                            'Missing transformation_hash in request'}), 400
        transformation_hash = request.json["transformationHash"]
        if "currentSort" not in request.json:
            return jsonify({'error': 'Missing current_sort in request'}), 400
        current_hash = request.json["currentSort"]

        to_be_returned = handle_request_for_children_with_sortHash(
            transformation_hash, current_hash, session['encoding_id'])

        return jsonify(to_be_returned)
    raise NotImplementedError


def get_src_tgt_mapping_from_graph(encoding_id: str,
                                   current_hash=None,
                                   shown_recursive_ids=[],
                                   shown_clingraph=False):
    if current_hash is None:
        current_hash = get_current_graph_hash(encoding_id)
    db_edges = db_session.query(GraphEdges).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_hash,
        recursive_supernode_uuid=None).all()

    for recursive_uuid in shown_recursive_ids:
        db_edges.extend(
            db_session.query(GraphEdges).filter_by(
                encoding_id=encoding_id,
                graph_hash=current_hash,
                recursive_supernode_uuid=recursive_uuid).all())

    # Clingraph
    last_nodes = last_nodes_in_graph(encoding_id, current_hash)

    if shown_clingraph:
        clingraph_names = db_session.query(Clingraphs).where(Clingraphs.encoding_id == encoding_id).all()
        for src, tgt in list(zip(last_nodes, clingraph_names)):
            db_edges.append(GraphEdges(
                source=src,
                target=tgt.filename,
                transformation_hash="boxrow_container",
                style="dashed"
            ))
    return db_edges


def find_reason_by_uuid(symbolid, nodeid, encoding_id):
    node = find_node_by_uuid(nodeid, encoding_id)

    symbolstr = str(
        getattr(next(filter(lambda x: x.uuid == symbolid, node.diff)),
                "symbol", ""))
    reasonids = list(
        set(getattr(r, "uuid", "") for r in node.reason.get(symbolstr, [])
    ))
    return reasonids


def find_reason_rule_by_uuid(symbolid, nodeid, encoding_id) -> Optional[int]:
    current_graph_hash = get_current_graph_hash(encoding_id)
    matching_nodes = db_session.query(GraphNodes).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_graph_hash,
        node_uuid=nodeid).all()

    if len(matching_nodes) == 0:
        for node in db_session.query(GraphNodes).all():
            n = current_app.json.loads(node.node)
            if len(n.recursive) > 0:
                matching_nodes = [
                    x for x in n.recursive
                    if x.uuid == nodeid
                ]

    if len(matching_nodes) != 1:
        # raise ValueError(f"Couldn't find reason rule of {symbolid}.")
        return None
    node = current_app.json.loads(matching_nodes[0].node)

    symbolstr = str(
        getattr(next(filter(lambda x: x.uuid == symbolid, node.diff)),
                "symbol", ""))
    reasonrule = node.reason_rules.get(symbolstr, None)

    return reasonrule

def get_current_sort_by_hash(encoding_id, current_hash):
    db_current_sort = db_session.query(Graphs).filter_by(
        encoding_id=encoding_id, hash=current_hash).one_or_none()
    if db_current_sort is None or db_current_sort.sort is None:
        raise DatabaseInconsistencyError
    current_sort = current_app.json.loads(db_current_sort.sort)
    current_sort.sort(key=lambda x: x.id)
    return current_sort

def get_current_sort(encoding_id):
    current_hash = get_current_graph_hash(encoding_id)
    return get_current_sort_by_hash(encoding_id, current_hash)

def load_analyzer(encoding_id) -> ProgramAnalyzer:
    result = db_session.query(DependencyGraphs).filter_by(encoding_id=encoding_id).one_or_none()
    if result is not None:
        dependency_graph = nx.node_link_graph(current_app.json.loads(result.data))
    else:
        raise DatabaseInconsistencyError
    analyzer_names = {n.name for n in db_session.query(AnalyzerNames).filter_by(encoding_id=encoding_id).all()}
    analyzer_facts = {f.fact for f in db_session.query(AnalyzerFacts).filter_by(encoding_id=encoding_id).all()}
    analyzer_constants = {c.constant for c in db_session.query(AnalyzerConstants).filter_by(encoding_id=encoding_id).all()}

    return ProgramAnalyzer(dependency_graph=dependency_graph, names=analyzer_names, facts=analyzer_facts, constants=analyzer_constants)

@bp.route("/graph/sorts", methods=["GET", "POST"])
@ensure_encoding_id
def handle_new_sort():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        try:
            data = request.json
            moved_transformation = data["moved_transformation"]
            old_index = moved_transformation["old_index"]
            new_index = moved_transformation["new_index"]
            current_sort = data["current_sort"]
        except KeyError:
            return "Invalid Request", 400
        encoding_id = session['encoding_id']

        result = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=current_sort).one_or_none()
        if result is None:
            raise DatabaseInconsistencyError
        sorted_program_rules = [t.rules for t in current_app.json.loads(result.sort)]
        moved_item = sorted_program_rules.pop(moved_transformation["old_index"])
        sorted_program_rules.insert(moved_transformation["new_index"], moved_item)

        analyzer = load_analyzer(encoding_id)
        new_sorted_program_transformations = analyzer.make_transformations_from_sorted_program(sorted_program_rules)
        new_hash = hash_from_sorted_transformations(new_sorted_program_transformations)

        db_current_graph = db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).one_or_none()
        if db_current_graph != None:
            db_current_graph.hash = new_hash
        else:
            db_current_graph = CurrentGraphs(encoding_id=encoding_id,
                                         hash=new_hash)
            db_session.add(db_current_graph)
        try:
            db_session.commit()
        except Exception as e:
            return str(e), 500

        db_graph = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=new_hash).one_or_none()
        if db_graph is None:
            db_graph = Graphs(encoding_id = encoding_id, hash = new_hash, data = None, sort = current_app.json.dumps(new_sorted_program_transformations))
            db_session.add(db_graph)
            db_session.commit()
            generate_graph(encoding_id, analyzer)
        elif db_graph.data is None or db_graph.data == "":
            generate_graph(encoding_id, analyzer)
        return jsonify({"hash":new_hash})
    elif request.method == "GET":
        encoding_id = session['encoding_id']
        result = get_current_sort(encoding_id)
        return jsonify(result)
    raise NotImplementedError


@bp.route("/graph/edges", methods=["GET", "POST"])
@ensure_encoding_id
def get_edges():
    to_be_returned = []
    if request.method == "POST":
        if request.json is None:
            abort(Response("No json data provided.", 400))
        current_hash = request.json[
            "currentSort"] if "currentSort" in request.json else None
        shown_recursive_ids = request.json[
            "shownRecursion"] if "shownRecursion" in request.json else []
        shown_clingraph = request.json[
            "usingClingraph"] if "usingClingraph" in request.json else False
        to_be_returned = get_src_tgt_mapping_from_graph(
            session['encoding_id'], current_hash, shown_recursive_ids,
            shown_clingraph)
    elif request.method == "GET":
        to_be_returned = get_src_tgt_mapping_from_graph(session['encoding_id'])

    jsonified = jsonify(to_be_returned)
    return jsonified


@bp.route("/graph/transformation/<uuid>", methods=["GET"])
@ensure_encoding_id
def get_rule(uuid):
    graph = _get_graph(session['encoding_id'])
    for _, _, edge in graph.edges(data=True):
        transformation: Transformation = edge["transformation"]
        if str(transformation.id) == str(uuid):
            return jsonify(transformation)
    abort(404)

@bp.route("/graph/transformations", methods=["POST"])
@ensure_encoding_id
def get_transformation_by_id_and_current_sort():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "id" not in request.json:
            return jsonify({'error': 'Missing id in request'}), 400
        if "currentSort" not in request.json:
            return jsonify({'error': 'Missing current_sort in request'}), 400
        id = request.json["id"]
        current_hash = request.json["currentSort"]

        current_sort = get_current_sort_by_hash(session['encoding_id'], current_hash)
        for t in current_sort:
            if t.id == id:
                return jsonify(t)
    raise NotImplementedError

@bp.route("/graph/model/<uuid>", methods=["GET"])
@ensure_encoding_id
def get_node(uuid):
    graph_nodes = db_session.query(GraphNodes).filter_by(encoding_id=session['encoding_id']).order_by(GraphNodes.branch_position).all()
    if graph_nodes is None:
        raise DatabaseInconsistencyError

    for node in graph_nodes:
        n = current_app.json.loads(node.node)
        if n.uuid == uuid:
            return jsonify(n)
    abort(400)


@bp.route("/graph/facts", methods=["GET"])
@ensure_encoding_id
def get_facts():
    encoding_id = session['encoding_id']

    current_graph_hash = get_current_graph_hash(encoding_id)
    facts = db_session.query(GraphNodes).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_graph_hash,
        transformation_hash="-1").order_by(GraphNodes.branch_position).all()
    facts = [current_app.json.loads(n.node) for n in facts]

    return jsonify(facts)


@bp.route("/graph/sorted_program", methods=["GET"])
@ensure_encoding_id
def get_sorted_program():
    result = get_current_sort(session['encoding_id'])
    return jsonify(result)

@bp.route("/transformations/current", methods=["GET"])
@ensure_encoding_id
def number_of_transformations():
    encoding_id = session['encoding_id']
    try:
        current_graph_hash = get_current_graph_hash(encoding_id)
    except MultipleResultsFound and NoResultFound as e:
        return f"Database error: {e}", 500
    db_graph = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=current_graph_hash).one_or_none()
    if db_graph is None:
        return jsonify(0)
    sorted_program = current_app.json.loads(db_graph.sort)
    return jsonify(len(sorted_program))


@bp.route("/graph/current", methods=["GET", "POST", "DELETE"])
@ensure_encoding_id
def current_graph():
    encoding_id = session['encoding_id']
    if request.method == "GET":
        try:
            current_hash = get_current_graph_hash(encoding_id)
        except MultipleResultsFound and NoResultFound as e:
            return f"Database error: {e}", 500
        return jsonify(current_hash)
    if request.method == "POST":
        if request.json is None:
            return "Invalid request", 400
        if not isinstance(request.json, str):
            return "Expected graph hash of type str", 400
        new_hash = request.json
        try:
            db_current_graph = db_session.query(CurrentGraphs).filter_by(encoding_id = encoding_id).one_or_none()
        except MultipleResultsFound as e:
            return "Database error", 500
        if db_current_graph == None:
            db_current_graph = CurrentGraphs(encoding_id=encoding_id,
                                             hash=new_hash)
        else:
            db_current_graph.hash = new_hash
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
    if request.method == "DELETE":
        db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).delete()
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
    return "ok", 200


@bp.route("/graph", methods=["POST", "GET", "DELETE"])
@ensure_encoding_id
def entire_graph():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        data = request.json['data']
        data = nx.node_link_graph(data) if type(data) == dict else data
        hash = request.json['hash']
        sort = request.json['sort']
        sort = current_app.json.loads(sort) if type(sort) == str else sort

        current_hash = get_current_graph_hash(session['encoding_id'])
        if current_hash == None:
            db_session.add(CurrentGraphs(encoding_id=session['encoding_id'],
                                         hash=hash))
        else:
            db_session.execute(
                update(CurrentGraphs)
                .where(CurrentGraphs.encoding_id == session['encoding_id'])
                .values(hash=hash)
            )
        db_session.commit()
        save_graph(data, session['encoding_id'], sort)
        return "ok", 200
    elif request.method == "GET":
        result = _get_graph(session['encoding_id'])
        return jsonify(result)
    elif request.method == "DELETE":
        try:
            # clear_encoding_session_data(get_or_create_encoding_id())
            encoding_id = session['encoding_id']
            current_graph_hash = get_current_graph_hash(encoding_id)
            # db_session.query(Graphs).filter_by(
            #     encoding_id=encoding_id, hash=current_graph_hash).delete()
            db_graph = db_session.query(Graphs).filter_by(
                encoding_id=encoding_id, hash=current_graph_hash).first()
            if db_graph is not None and db_graph.data is not None and db_graph.data != "":
                db_graph.data = ""
            # db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).delete()
            # db_session.query(GraphNodes).filter_by(encoding_id=encoding_id, graph_hash=current_graph_hash).delete()
            db_session.commit()
        except Exception as e:
            return str(e), 500
        return "ok", 200
    raise NotImplementedError


def save_graph(graph: nx.DiGraph, encoding_id: str,
               sorted_program: List[Transformation]):
    graph_hash = hash_from_sorted_transformations(sorted_program)

    db_graph = db_session.query(Graphs).filter_by(
        encoding_id=encoding_id, hash=graph_hash).one_or_none()
    if db_graph is not None:
        db_graph.data = current_app.json.dumps(
            get_compatible_node_link_data(graph))
    else:
        db_graph = Graphs(encoding_id=encoding_id,
                          hash=graph_hash,
                          data=current_app.json.dumps(
                              get_compatible_node_link_data(graph)),
                          sort=current_app.json.dumps(sorted_program))
        db_session.add(db_graph)

    pos: Dict[Node, List[float]] = get_node_positions(graph)
    db_nodes = []
    db_symbols = []
    db_edges = []
    for source, target, edge in graph.edges(data=True):
        db_edges.append(GraphEdges(
            encoding_id=encoding_id,
            graph_hash=graph_hash,
            source=source.uuid.hex,
            target=target.uuid.hex,
            transformation_hash=edge["transformation"].hash,
            style="solid"
        ))

        branch_position = pos[target][0]
        db_nodes.append(
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=graph_hash,
                   transformation_hash=edge["transformation"].hash,
                   branch_position=branch_position,
                   node=current_app.json.dumps(target),
                   node_uuid=target.uuid.hex,
                   space_multiplier=target.space_multiplier)
        )
        for symbol in target.diff:
            db_symbols.append(
                GraphSymbols(node=target.uuid.hex,
                             symbol_uuid=symbol.uuid.hex,
                             symbol=str(symbol.symbol)))

        if len(target.recursive) > 0:
            for subnode in target.recursive:
                db_nodes.append(
                    GraphNodes(encoding_id=encoding_id,
                               graph_hash=graph_hash,
                               transformation_hash=edge["transformation"].hash,
                               branch_position=branch_position,
                               node=current_app.json.dumps(subnode),
                               node_uuid=subnode.uuid.hex,
                               recursive_supernode_uuid=target.uuid.hex,
                               space_multiplier=1)
                )
                for symbol in subnode.diff:
                    db_symbols.append(
                        GraphSymbols(node=subnode.uuid.hex,
                                     symbol_uuid=symbol.uuid.hex,
                                     symbol=str(symbol.symbol)))
            db_edges.append(GraphEdges(
                encoding_id=encoding_id,
                graph_hash=graph_hash,
                source=target.uuid.hex,
                target=target.recursive[0].uuid.hex,
                transformation_hash=edge["transformation"].hash,
                style="solid",
                recursion_anchor_keyword="in",
                recursive_supernode_uuid=target.uuid.hex
            ))
            for s, t in pairwise(target.recursive):
                db_edges.append(GraphEdges(
                    encoding_id=encoding_id,
                    graph_hash=graph_hash,
                    source=s.uuid.hex,
                    target=t.uuid.hex,
                    transformation_hash=edge["transformation"].hash,
                    style="solid",
                    recursive_supernode_uuid=target.uuid.hex
                ))
            if graph.out_degree(target) > 0:
                db_edges.append(
                    GraphEdges(encoding_id=encoding_id,
                               graph_hash=graph_hash,
                               source=target.recursive[-1].uuid.hex,
                               target=target.uuid.hex,
                               transformation_hash=edge["transformation"].hash,
                               style="solid",
                               recursion_anchor_keyword="out",
                               recursive_supernode_uuid=target.uuid.hex))
    fact_node = get_start_node_from_graph(graph)
    db_nodes.append(
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=graph_hash,
                   transformation_hash="-1",
                   branch_position=0,
                   node=current_app.json.dumps(fact_node),
                   node_uuid=fact_node.uuid.hex,
                   space_multiplier=1))
    for symbol in fact_node.diff:
        db_symbols.append(
            GraphSymbols(node=fact_node.uuid.hex,
                         symbol_uuid=symbol.uuid.hex,
                         symbol=str(symbol.symbol)))
    db_session.add_all(db_nodes)
    db_session.add_all(db_symbols)
    db_session.add_all(db_edges)

    db_session.commit()


def get_atoms_in_path_by_signature(uuid: str, encoding_id: str):
    signature_to_atom_mapping = defaultdict(set)
    node = find_node_by_uuid(uuid, encoding_id)
    for s in node.atoms:
        signature = Signature(s.symbol.name, len(s.symbol.arguments))
        signature_to_atom_mapping[signature].add(s.symbol)
    return [(s, signature_to_atom_mapping[s])
            for s in signature_to_atom_mapping.keys()]


def find_node_by_uuid(uuid: str, encoding_id: str) -> Node:
    current_graph_hash = get_current_graph_hash(encoding_id)
    matching_nodes = db_session.query(GraphNodes).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_graph_hash,
        node_uuid=uuid).all()

    if len(matching_nodes) == 0:
        raise ValueError(f"No node with uuid {uuid}.")
    return current_app.json.loads(matching_nodes[0].node)


def is_recursive(node: str) -> bool:
    """
    Checks if the node is recursive.
    :param node: The node to check.
    :return: True if the node is recursive, False otherwise.
    """
    graph_node = db_session.query(GraphNodes).filter(GraphNodes.node_uuid == node).first()
    if graph_node is None:
        return False
    return graph_node.recursive_supernode_uuid != None


def get_kind(uuid: str, encoding_id: str) -> str:
    graph = _get_graph(encoding_id)
    node = find_node_by_uuid(uuid, encoding_id)
    recursive = is_recursive(node.uuid.hex)
    if recursive:
        return "Partial Answer Set"
    if len(graph.out_edges(node)) == 0:
        return "Answer Set"
    elif len(graph.in_edges(node)) == 0:
        return "Facts"
    else:
        return "Partial Answer Set"


@bp.route("/detail/<uuid>", methods=["GET"])
@ensure_encoding_id
def model(uuid):
    if uuid is None:
        abort(Response("Parameter 'key' required.", 400))
    encoding_id = session['encoding_id']
    kind = get_kind(uuid, encoding_id)
    path = get_atoms_in_path_by_signature(uuid, encoding_id)
    return jsonify((kind, path))


@bp.route("/detail/explain/<uuid>", methods=["GET"])
@ensure_encoding_id
def explain(uuid):
    if uuid is None:
        abort(Response("Parameter 'key' required.", 400))
    node = find_node_by_uuid(uuid, session['encoding_id'])
    explain = node.reason
    return jsonify(explain)


def get_all_signatures(graph: nx.Graph):
    signatures = set()
    for n in graph.nodes():
        for a in n.diff:
            signatures.add(Signature(a.symbol.name, len(a.symbol.arguments)))
    return signatures


def get_all_atoms(graph: nx.Graph):
    atoms = set()
    for n in graph.nodes():
        for a in n.diff:
            atoms.add(a.symbol)
    return atoms

def get_atoms_from_nodes(nodes: List[Node]):
    atoms = set()
    for n in nodes:
        for a in n.diff:
            atoms.add(a.symbol)
    return atoms


def get_all_symbols_in_graph(encoding_id, current_graph_hash):
    db_graph_node_uuids = db_session.execute(
        select(GraphNodes.node_uuid).filter_by(
            encoding_id=encoding_id,
            graph_hash=current_graph_hash,
            recursive_supernode_uuid=None)).scalars().all()
    db_graph_symbols = db_session.execute(
        select(GraphSymbols, GraphNodes.branch_position).join(
            GraphNodes, GraphNodes.node_uuid == GraphSymbols.node).filter(
                GraphSymbols.node.in_(db_graph_node_uuids)).order_by(
                    GraphNodes.branch_position.desc())
        ).all()
    return db_graph_symbols


def search_ground_term_in_symbols(query, db_graph_symbols, is_autocomplete=False):
    all_filtered_symbols = list(
        filter(lambda x: query in x[0].symbol, db_graph_symbols))
    all_filtered_symbols.reverse()
    symbols_results = []
    for symbol, _ in all_filtered_symbols:
        if symbol.symbol not in symbols_results:
            symbols_results.append(
                SearchResultSymbolWrapper(
                    repr=symbol.symbol,
                    includes=[symbol.symbol_uuid],
                    is_autocomplete=is_autocomplete
                ))
        else:
            symbols_results[symbols_results.index(
                symbol.symbol)].includes.append(symbol.symbol_uuid)
    return symbols_results


@bp.route("/query", methods=["GET"])
@ensure_encoding_id
def search():
    if request.method == "POST":
        if request.json is None:
            abort(Response("No json data provided.", 400))
        shown_recursive_ids = request.json[
            "shownRecursion"] if "shownRecursion" in request.json else []
        query = request.json["query"] if "query" in request.json else ""
    if "q" in request.args.keys():
        encoding_id = session['encoding_id']
        current_graph_hash = get_current_graph_hash(encoding_id)

        query = request.args["q"]
        query = query.replace(" ", "")
        # signatures = get_all_signatures(graph)
        # for signature in signatures:
        #     if query in signature.name \
        #         and signature not in result:
        #         result.append(signature)

        # for node in graph.nodes():
        #     if any(query in str(atm.symbol)
        #            for atm in node.atoms) and node not in result:
        #         result.append(node)

        # for _, _, edge in graph.edges(data=True):
        #     transformation = edge["transformation"]
        #     if any(query in rule for rule in
        #            transformation.rules.str_) and transformation not in result:
        #         result.append(transformation)

        db_graph_symbols = get_all_symbols_in_graph(encoding_id,
                                                    current_graph_hash)
        results = search_ground_term_in_symbols(query,
                                                db_graph_symbols,
                                                is_autocomplete=True)
        if len(results) == 0:
            results = search_nonground_term_in_symbols(query, db_graph_symbols)
        results.sort()
        return jsonify(results)

    return jsonify([])


@bp.route("/clingraph/<filename>", methods=["GET"])
def get_image(filename):
    # check if file with name uuid exists in static folder
    filename = os.path.join("clingraph", filename)
    file_path = os.path.join(STATIC_PATH, filename)
    if not os.path.isfile(file_path):
        return abort(Response(f"No clingraph with filename {filename}.", 404))
    return send_file(file_path, mimetype='image/svg+xml')


def last_nodes_in_graph(encoding_id, current_hash):
    distinct_sources = db_session.query(GraphEdges.source).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_hash,
        recursive_supernode_uuid = None).distinct()
    return [
        e.target for e in db_session.query(GraphEdges).filter(
            GraphEdges.encoding_id == encoding_id,
            GraphEdges.graph_hash == current_hash,
            GraphEdges.recursive_supernode_uuid == None,
            ~GraphEdges.target.in_(distinct_sources)).all()
    ]

def handle_get_clingraph_children(encoding_id, current_hash):
    db_clingraph = db_session.query(Clingraphs).filter_by(encoding_id=session['encoding_id']).all()

    last_nodes = last_nodes_in_graph(encoding_id, current_hash)
    last_space_multiplier = [
        db_session.query(
            GraphNodes.space_multiplier).filter_by(encoding_id=encoding_id,
                                                   graph_hash=current_hash,
                                                   node_uuid=n).one()
        for n in last_nodes
    ]
    to_be_returned = [{
        "_type": "ClingraphNode",
        "uuid": c.filename,
        "space_multiplier": last_space_multiplier[i][0]
    } for i, c in enumerate(db_clingraph[::-1])]
    return to_be_returned

@bp.route("/clingraph/children", methods=["POST", "GET"])
@ensure_encoding_id
def get_clingraph_children():
    if request.method == "GET":
        db_clingraph = db_session.query(Clingraphs).filter_by(encoding_id=session['encoding_id']).all()
        to_be_returned = [{
            "_type": "ClingraphNode",
            "uuid": c.filename
        } for c in db_clingraph[::-1]]
        return jsonify(to_be_returned)
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "currentSort" not in request.json:
            return jsonify({'error': 'Missing current_sort in request'}), 400
        current_hash = request.json["currentSort"]
        encoding_id = session['encoding_id']

        to_be_returned = handle_get_clingraph_children(encoding_id,
                                                       current_hash)
        return jsonify(to_be_returned)
    raise NotImplementedError


@bp.route("/graph/reason", methods=["POST"])
@ensure_encoding_id
def get_reasons_of():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "sourceid" not in request.json or "nodeid" not in request.json:
            return jsonify({'error':
                            'Missing sourceid or nodeid in request'}), 400
        source_uuid = uuid.UUID(request.json["sourceid"])
        node_uuid = uuid.UUID(request.json["nodeid"])
        encoding_id = session['encoding_id']
        try:
            reason_uuids = find_reason_by_uuid(source_uuid, node_uuid,
                                               encoding_id)
            reason_rule_uuid = find_reason_rule_by_uuid(
                source_uuid, node_uuid, encoding_id)
        except Exception as e:
            return jsonify({
                "symbols": [{
                    "src": None,
                    "tgt": None
                }],
                "rule": None
            })
        return jsonify({
            "symbols": [{
                "src": source_uuid,
                "tgt": reason_uuid
            } for reason_uuid in reason_uuids],
            "rule":
            reason_rule_uuid
        })
    raise NotImplementedError


def wrap_marked_models(
        marked_models: Iterable[StableModel],
        conflict_free_showTerm: str = "showTerm",
        clingraph: bool = False) -> List[List[str]]:
    result = []
    for model in marked_models:
        wrapped = []
        for part in model.atoms:
            wrapped.append(f"{part}.")
        for part in model.terms:
            if clingraph:
                wrapped.append(f"{part}.")
            else:
                wrapped.append(f"{conflict_free_showTerm}({part}).")
        result.append(wrapped)
    return result


def generate_graph(encoding_id: str, analyzer: Optional[ProgramAnalyzer] = None) -> nx.DiGraph:
    encoding = db_session.execute(
            select(Encodings.program).where(
                Encodings.encoding_id == encoding_id)).scalars().all()
    if len(encoding) != 0:
        program = "".join(encoding)
    else:
        raise DatabaseInconsistencyError

    transformer = None
    db_transformer = db_session.query(Transformers).filter_by(encoding_id=encoding_id).one_or_none()

    transformer = current_app.json.loads(
        db_transformer.transformer) if db_transformer is not None else None

    commandline_constants = dict()
    db_constants = db_session.execute(
        select(Constants.name, Constants.value).where(
            Constants.encoding_id == encoding_id).order_by(
                Constants.id)).all()
    for const in db_constants:
        commandline_constants[const.name] = const.value

    if analyzer is None:
        analyzer = ProgramAnalyzer()
        analyzer.add_program(program, transformer)
        if not analyzer.will_work():
            error("Input program contains forbidden part of clingo language.")
            return nx.DiGraph()

    show_all_derived = db_session.execute(
        select(
            SessionInfo.show).where(SessionInfo.encoding_id ==
                                    session['encoding_id'])).scalar() or False

    db_models = db_session.query(Models).filter_by(encoding_id=encoding_id).all()
    marked_models = [current_app.json.loads(m.model) for m in db_models]
    marked_models = wrap_marked_models(marked_models,
                                       analyzer.get_conflict_free_showTerm())
    db_recursions = db_session.query(Recursions).filter_by(encoding_id=encoding_id).all()
    recursion_rules = {
        r.recursive_transformation_hash for r in db_recursions
    }
    sorted_program = get_current_sort(encoding_id)
    reified: Collection[AST] = reify_list(
        sorted_program,
        h_str=analyzer.get_conflict_free_h(),
        h_showTerm_str=analyzer.get_conflict_free_h_showTerm(),
        model_str=analyzer.get_conflict_free_model(),
        conflict_free_showTerm_str=analyzer.get_conflict_free_showTerm(),
        get_conflict_free_variable_str=analyzer.get_conflict_free_variable,
        clear_temp_names=analyzer.clear_temp_names)
    g = build_graph(marked_models, reified, sorted_program, analyzer,
                    recursion_rules, commandline_constants, show_all_derived)

    save_graph(g, encoding_id, sorted_program)

    return g

@bp.route("/graph/color_theme", methods=["GET"])
@ensure_encoding_id
def get_color_theme():
    if request.method == "GET":
        encoding_id = session['encoding_id']
        db_primary_color = db_session.execute(
            select(SessionInfo.color_theme).where(
                SessionInfo.encoding_id == encoding_id)).scalar()
        if db_primary_color is None:
            db_primary_color = "blue"
        return jsonify(db_primary_color)
    raise NotImplementedError
