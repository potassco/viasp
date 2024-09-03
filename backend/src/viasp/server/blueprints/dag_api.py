from itertools import pairwise
import os
from collections import defaultdict
from typing import Union, Collection, Dict, List, Iterable, Optional
import uuid

import igraph
import networkx as nx
import numpy as np
from flask import Blueprint, current_app, request, jsonify, abort, Response, send_file
from clingo.ast import AST
from sqlalchemy.exc import MultipleResultsFound

from ...asp.reify import ProgramAnalyzer, reify_list
from ...asp.justify import build_graph
from ...shared.defaults import STATIC_PATH
from ...shared.model import SymbolIdentifier, Transformation, Node, Signature
from ...shared.util import get_start_node_from_graph, is_recursive, hash_from_sorted_transformations
from ...shared.io import StableModel
from ...shared.simple_logging import error
from ..database import get_or_create_encoding_id, db_session
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
    current_graph = db_session.query(CurrentGraphs).filter_by(encoding_id=encoding_id).one_or_none()
    if current_graph is None:
        return None
    return current_graph.hash

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
    result = db_session.query(GraphNodes).filter_by(encoding_id=encoding_id, graph_hash=current_graph_hash, transformation_hash=transformation_hash).order_by(GraphNodes.branch_position).all()
    ordered_children = [current_app.json.loads(n.node) for n in result]
    if ids_only:
        ordered_children = [node.uuid for node in ordered_children]
    return ordered_children

def clear_encoding_session_data(encoding_id: str):
    db_session.query(Encodings).filter_by(id = encoding_id).delete()
    db_session.query(Models).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Graphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(CurrentGraphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(GraphNodes).filter_by(encoding_id = encoding_id).delete()
    db_session.query(GraphEdges).filter_by(encoding_id = encoding_id).delete()
    db_session.query(DependencyGraphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Recursions).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Clingraphs).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Transformers).filter_by(encoding_id = encoding_id).delete()
    db_session.query(Warnings).filter_by(encoding_id = encoding_id).delete()
    db_session.commit()


@bp.route("/graph/children/<transformation_hash>", methods=["GET"])
def get_children(transformation_hash):
    if request.method == "GET":
        ids_only = request.args.get("ids_only", default=False, type=bool)
        to_be_returned = handle_request_for_children(transformation_hash,
                                                     ids_only, get_or_create_encoding_id())
        return jsonify(to_be_returned)
    raise NotImplementedError


def get_src_tgt_mapping_from_graph(encoding_id: str,
                                   shown_recursive_ids=[],
                                   shown_clingraph=False):
    graph = _get_graph(encoding_id)

    to_be_added = []

    for source, target, edge in graph.edges(data=True):
        to_be_added.append({
            "src": source.uuid,
            "tgt": target.uuid,
            "transformation": edge["transformation"].hash,
            "style": "solid"
        })

    for recursive_uuid in shown_recursive_ids:
        # get recursion super-node from graph
        try:
            node = next(n for n in graph.nodes if n.uuid == recursive_uuid)
        except StopIteration:
            continue
        _, _, edge = next(e for e in graph.in_edges(node, data=True))
        for source, target in pairwise(node.recursive):
            to_be_added.append({
                "src": source.uuid,
                "tgt": target.uuid,
                "transformation": edge["transformation"].hash,
                "style": "solid"
            })
        # add connections to outer node
        to_be_added.append({
            "src": node.uuid,
            "tgt": node.recursive[0].uuid,
            "transformation": edge["transformation"].hash,
            "recursion": "in",
            "style": "solid"
        })
        if graph.out_degree(node) > 0:
            # only add connection out if there are more nodes / clingraph
            to_be_added.append({
                "src": node.recursive[-1].uuid,
                "tgt": node.uuid,
                "transformation": edge["transformation"].hash,
                "recursion": "out",
                "style": "solid"
            })

    if shown_clingraph:
        clingraph_names = db_session.query(Clingraphs).where(Clingraphs.encoding_id == encoding_id).all()
        for src, tgt in list(zip(last_nodes_in_graph(graph), clingraph_names)):
            to_be_added.append({
                "src": src,
                "tgt": tgt.filename,
                "transformation": "boxrow_container",
                "style": "dashed"
            })
    return to_be_added


def find_reason_by_uuid(symbolid, nodeid):
    node = find_node_by_uuid(nodeid)

    symbolstr = str(
        getattr(next(filter(lambda x: x.uuid == symbolid, node.diff)),
                "symbol", ""))
    reasonids = [
        getattr(r, "uuid", "") for r in node.reason.get(symbolstr, [])
    ]
    return reasonids

def get_current_sort():
    encoding_id = get_or_create_encoding_id()
    current_hash = get_current_graph_hash(encoding_id)

    db_current_sort = db_session.query(Graphs).filter_by(
        encoding_id=encoding_id, hash=current_hash).one_or_none()
    if db_current_sort is None or db_current_sort.sort is None:
        raise DatabaseInconsistencyError
    current_sort = current_app.json.loads(db_current_sort.sort)
    current_sort.sort(key=lambda x: x.id)
    return current_sort

@bp.route("/graph/sorts", methods=["GET", "POST"])
def handle_new_sort():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "moved_transformation" not in request.json:
            return "Invalid Request", 400
        moved_transformation = request.json["moved_transformation"]
        if "old_index" not in moved_transformation or "new_index" not in moved_transformation:
            return "Invalid Request", 400
        if moved_transformation["old_index"] == moved_transformation["new_index"]:
            return "ok", 200
        encoding_id = get_or_create_encoding_id()

        current_graph_hash = get_current_graph_hash(encoding_id)
        result = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=current_graph_hash).one_or_none()
        if result is None:
            raise DatabaseInconsistencyError
        sorted_program_rules = [t.rules for t in current_app.json.loads(result.sort)]
        result = db_session.query(DependencyGraphs).filter_by(encoding_id=encoding_id).one_or_none()
        if result is not None:
            dependency_graph = nx.node_link_graph(current_app.json.loads(result.data))
        else:
            raise DatabaseInconsistencyError
        analyzer_names = {n.name for n in db_session.query(AnalyzerNames).filter_by(encoding_id=encoding_id).all()}
        analyzer_facts = {f.fact for f in db_session.query(AnalyzerFacts).filter_by(encoding_id=encoding_id).all()}
        analyzer_constants = {c.constant for c in db_session.query(AnalyzerConstants).filter_by(encoding_id=encoding_id).all()}

        moved_item = sorted_program_rules.pop(moved_transformation["old_index"])
        sorted_program_rules.insert(moved_transformation["new_index"], moved_item)

        analyzer = ProgramAnalyzer(dependency_graph=dependency_graph, names=analyzer_names, facts=analyzer_facts, constants=analyzer_constants)
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
        result = get_current_sort()
        return jsonify(result)
    raise NotImplementedError


@bp.route("/graph/edges", methods=["GET", "POST"])
def get_edges():
    to_be_returned = []
    if request.method == "POST":
        if request.json is None:
            abort(Response("No json data provided.", 400))
        shown_recursive_ids = request.json[
            "shownRecursion"] if "shownRecursion" in request.json else []
        shown_clingraph = request.json[
            "usingClingraph"] if "usingClingraph" in request.json else False
        to_be_returned = get_src_tgt_mapping_from_graph(
            get_or_create_encoding_id(), shown_recursive_ids, shown_clingraph)
    elif request.method == "GET":
        to_be_returned = get_src_tgt_mapping_from_graph(get_or_create_encoding_id())

    jsonified = jsonify(to_be_returned)
    return jsonified


@bp.route("/graph/transformation/<uuid>", methods=["GET"])
def get_rule(uuid):
    graph = _get_graph(get_or_create_encoding_id())
    for _, _, edge in graph.edges(data=True):
        transformation: Transformation = edge["transformation"]
        if str(transformation.id) == str(uuid):
            return jsonify(transformation)
    abort(404)


@bp.route("/graph/model/<uuid>", methods=["GET"])
def get_node(uuid):
    graph_nodes = db_session.query(GraphNodes).filter_by(encoding_id=get_or_create_encoding_id()).order_by(GraphNodes.branch_position).all()
    if graph_nodes is None:
        raise DatabaseInconsistencyError

    for node in graph_nodes:
        n = current_app.json.loads(node.node)
        if n.uuid == uuid:
            return jsonify(n)
    abort(400)


@bp.route("/graph/facts", methods=["GET"])
def get_facts():
    encoding_id = get_or_create_encoding_id()

    current_graph_hash = get_current_graph_hash(encoding_id)
    facts = db_session.query(GraphNodes).filter_by(
        encoding_id=encoding_id,
        graph_hash=current_graph_hash,
        transformation_hash="-1").order_by(GraphNodes.branch_position).all()
    facts = [current_app.json.loads(n.node) for n in facts]

    return jsonify(facts)


@bp.route("/graph/sorted_progam", methods=["GET"])
def get_sorted_program():
    result = get_current_sort()
    return jsonify(result)


@bp.route("/graph/current", methods=["GET", "POST", "DELETE"])
def current_graph():
    encoding_id = get_or_create_encoding_id()
    if request.method == "GET":
        try:
            current_hash = get_current_graph_hash(encoding_id)
        except MultipleResultsFound as e:
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
def entire_graph():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        data = request.json['data']
        data = nx.node_link_graph(data) if type(data) == dict else data
        hash = request.json['hash']
        sort = request.json['sort']
        sort = current_app.json.loads(sort) if type(sort) == str else sort

        # db_current_graph = CurrentGraphs(encoding_id=get_or_create_encoding_id(), hash=hash)
        # db_session.add(db_current_graph)
        db_session.commit()
        save_graph(data, get_or_create_encoding_id(), sort)
        return "ok", 200
    elif request.method == "GET":
        result = _get_graph(get_or_create_encoding_id())
        return jsonify(result)
    elif request.method == "DELETE":
        try:
            # clear_encoding_session_data(get_or_create_encoding_id())
            encoding_id = get_or_create_encoding_id()
            current_graph_hash = get_current_graph_hash(encoding_id)
            db_graph = db_session.query(Graphs).filter_by(encoding_id=encoding_id, hash=current_graph_hash).first()
            if db_graph is not None and db_graph.data is not None and db_graph.data != "":
                db_graph.data = ""
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
        db_graph.data = current_app.json.dumps(nx.node_link_data(graph))
    else:
        db_graph = Graphs(encoding_id=encoding_id,
                          hash=graph_hash,
                          data=current_app.json.dumps(
                              nx.node_link_data(graph)),
                          sort=current_app.json.dumps(sorted_program))
        db_session.add(db_graph)

    pos: Dict[Node, List[float]] = get_node_positions(graph)
    db_nodes = [
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=graph_hash,
                   transformation_hash=d["transformation"].hash,
                   branch_position=pos[node][0],
                   node=current_app.json.dumps(node))
        for _, node, d in graph.edges(data=True)
    ]
    db_nodes.append(
        GraphNodes(encoding_id=encoding_id,
                   graph_hash=graph_hash,
                   transformation_hash="-1",
                   branch_position=0,
                   node=current_app.json.dumps(
                       get_start_node_from_graph(graph))))
    db_session.add_all(db_nodes)

    db_session.commit()


def get_atoms_in_path_by_signature(uuid: str):
    signature_to_atom_mapping = defaultdict(set)
    node = find_node_by_uuid(uuid)
    for s in node.atoms:
        signature = Signature(s.symbol.name, len(s.symbol.arguments))
        signature_to_atom_mapping[signature].add(s.symbol)
    return [(s, signature_to_atom_mapping[s])
            for s in signature_to_atom_mapping.keys()]


def find_node_by_uuid(uuid: str) -> Node:
    graph = _get_graph(get_or_create_encoding_id())
    matching_nodes = [x for x, _ in graph.nodes(data=True) if x.uuid == uuid]

    if len(matching_nodes) != 1:
        for node in graph.nodes():
            if len(node.recursive) > 0:
                matching_nodes = [
                    x for x in node.recursive
                    if x.uuid == uuid
                ]
                if len(matching_nodes) == 1:
                    return matching_nodes[0]
        abort(Response(f"No node with uuid {uuid}.", 404))
    return matching_nodes[0]


def get_kind(uuid: str) -> str:
    graph = _get_graph(get_or_create_encoding_id())
    node = find_node_by_uuid(uuid)
    recursive = is_recursive(node, graph)
    if recursive:
        return "Partial Answer Set"
    if len(graph.out_edges(node)) == 0:
        return "Answer Set"
    elif len(graph.in_edges(node)) == 0:
        return "Facts"
    else:
        return "Partial Answer Set"


@bp.route("/detail/<uuid>", methods=["GET"])
def model(uuid):
    if uuid is None:
        abort(Response("Parameter 'key' required.", 400))
    kind = get_kind(uuid)
    path = get_atoms_in_path_by_signature(uuid)
    return jsonify((kind, path))


@bp.route("/detail/explain/<uuid>", methods=["GET"])
def explain(uuid):
    if uuid is None:
        abort(Response("Parameter 'key' required.", 400))
    node = find_node_by_uuid(uuid)
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


@bp.route("/query", methods=["GET"])
def search():
    if request.method == "POST":
        if request.json is None:
            abort(Response("No json data provided.", 400))
        shown_recursive_ids = request.json[
            "shownRecursion"] if "shownRecursion" in request.json else []
        query = request.json["query"] if "query" in request.json else ""
    if "q" in request.args.keys():
        encoding_id = get_or_create_encoding_id()
        current_graph_hash = get_current_graph_hash(encoding_id)

        query = request.args["q"]
        query = query.replace(" ", "")
        result = []

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

        db_graph_nodes = db_session.query(GraphNodes).filter_by(encoding_id=encoding_id, graph_hash=current_graph_hash).all()
        nodes = [current_app.json.loads(n.node) for n in db_graph_nodes]
        atoms = get_atoms_from_nodes(nodes)
        for atom in atoms:
            if query in str(atom) and atom not in result:
                result.append(atom)

        result.sort(key=lambda x: str(x))
        return jsonify(result[:10])
    return jsonify([])


@bp.route("/clingraph/<uuid>", methods=["GET"])
def get_image(uuid):
    # check if file with name uuid exists in static folder
    filename = os.path.join("clingraph", f"{uuid}.png")
    file_path = os.path.join(STATIC_PATH, filename)
    if not os.path.isfile(file_path):
        return abort(Response(f"No clingraph with uuid {uuid}.", 404))
    return send_file(file_path, mimetype='image/png')


def last_nodes_in_graph(graph):
    return [n.uuid for n in graph.nodes() if graph.out_degree(n) == 0]


@bp.route("/clingraph/children", methods=["POST", "GET"])
def get_clingraph_children():
    if request.method == "GET":
        db_clingraph = db_session.query(Clingraphs).filter_by(encoding_id=get_or_create_encoding_id()).all()
        to_be_returned = [{
            "_type": "ClingraphNode",
            "uuid": c.filename
        } for c in db_clingraph[::-1]]
        return jsonify(to_be_returned)
    raise NotImplementedError


@bp.route("/graph/reason", methods=["POST"])
def get_reasons_of():
    if request.method == "POST":
        if request.json is None:
            return jsonify({'error': 'Missing JSON in request'}), 400
        if "sourceid" not in request.json or "nodeid" not in request.json:
            return jsonify({'error': 'Missing sourceid or nodeid in request'}), 400
        source_uuid = request.json["sourceid"]
        node_uuid = request.json["nodeid"]
        try:
            reason_uuids = find_reason_by_uuid(source_uuid, node_uuid)
        except Exception as e:
            return jsonify({'error': str(e)}), 404
        return jsonify([{
            "src": source_uuid,
            "tgt": reason_uuid
        } for reason_uuid in reason_uuids])
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
    db_program = db_session.query(Encodings).filter_by(id=encoding_id).one_or_none()
    if db_program is None:
        raise DatabaseInconsistencyError

    transformer = None
    db_transformer = db_session.query(Transformers).filter_by(encoding_id=encoding_id).one_or_none()
    if db_transformer is not None:
        transformer = current_app.json.loads(db_transformer.transformer)

    if analyzer is None:
        analyzer = ProgramAnalyzer()
        analyzer.add_program(db_program.program, transformer)
        if not analyzer.will_work():
            error("Input program contains forbidden part of clingo language.")
            return nx.DiGraph()

    db_models = db_session.query(Models).filter_by(encoding_id=encoding_id).all()
    marked_models = [current_app.json.loads(m.model) for m in db_models]
    marked_models = wrap_marked_models(marked_models,
                                       analyzer.get_conflict_free_showTerm())
    db_recursions = db_session.query(Recursions).filter_by(encoding_id=encoding_id).all()
    recursion_rules = {
        r.recursive_transformation_hash for r in db_recursions
    }
    sorted_program = get_current_sort()
    reified: Collection[AST] = reify_list(
        sorted_program,
        h=analyzer.get_conflict_free_h(),
        h_showTerm=analyzer.get_conflict_free_h_showTerm(),
        model=analyzer.get_conflict_free_model(),
        conflict_free_showTerm=analyzer.get_conflict_free_showTerm(),
        get_conflict_free_variable=analyzer.get_conflict_free_variable,
        clear_temp_names=analyzer.clear_temp_names)
    g = build_graph(marked_models, reified, sorted_program, analyzer,
                    recursion_rules)

    save_graph(g, encoding_id, sorted_program)

    return g
