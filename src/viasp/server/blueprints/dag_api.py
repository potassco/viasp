import json
from collections import defaultdict
from typing import Union

import networkx as nx
from flask import Blueprint, request, render_template, Response, make_response, jsonify

from ...shared.io import DataclassJSONDecoder, DataclassJSONEncoder
from ...shared.util import get_start_node_from_graph

bp = Blueprint("dag_api", __name__, template_folder='server/templates')


class GraphDataBaseKEKL:

    def __init__(self):
        self.path = "/Users/bianchignocchi/Developer/cogsys/0_ma/gasp/src/viasp/server/graph.json"

    def save(self, graph: Union[nx.Graph, dict]):
        if isinstance(graph, nx.Graph):
            serializable_graph = nx.node_link_data(graph)
        else:
            serializable_graph = graph
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(serializable_graph, f, cls=DataclassJSONEncoder, ensure_ascii=False, indent=2)

    def load(self, as_json=True) -> Union[nx.DiGraph, dict]:
        try:
            with open(self.path, encoding="utf-8") as f:
                result = json.load(f, cls=DataclassJSONDecoder)
            if as_json:
                return result
            loaded_graph = nx.node_link_graph(result)
            return loaded_graph
        except FileNotFoundError:
            return nx.DiGraph()


def get_database():
    return GraphDataBaseKEKL()


def handle_request_for_children(data):
    graph = get_database().load(as_json=False)
    rule_id = data["rule_id"]
    children = list()
    for u, v, d in graph.edges(data=True):
        edge = d['transformation']
        print(f"{u}-[{d}]->{v}")
        if str(edge["id"]) == rule_id:
            children.append(v)
    print(f"Returning {children} as children of {data}")
    return children


@bp.route("/children/", methods=["GET"])
def get_children():
    if request.method == "GET":
        to_be_returned = handle_request_for_children(request.args)
        return jsonify(to_be_returned)
    raise NotImplementedError


def get_src_tgt_mapping_from_graph(ids=None):
    ids = set(ids) if ids != None else None
    graph = get_database().load(as_json=False)
    nodes = set(graph.nodes)
    to_be_deleted = set(existing for existing in nodes if existing.uuid not in ids)
    for node in to_be_deleted:
        for source, _, _ in graph.in_edges(node, data=True):
            for _, target, _ in graph.out_edges(node, data=True):
                graph.add_edge(source, target)
        graph.remove_node(node)
    return [{"src": src.uuid, "tgt": tgt.uuid} for src, tgt in graph.edges()]


@bp.route("/edges", methods=["GET", "POST"])
def get_edges():
    if request.method == "POST":
        to_be_returned = get_src_tgt_mapping_from_graph(request.json)
    elif request.method == "GET":
        to_be_returned = get_src_tgt_mapping_from_graph()

    jsonified = jsonify(to_be_returned)
    return jsonified


@bp.route("/rule/<uuid>", methods=["GET"])
def get_rule(uuid):
    return NotImplementedError


@bp.route("/facts", methods=["GET"])
def get_facts():
    graph = get_database().load(as_json=False)
    facts = get_start_node_from_graph(graph)
    r = jsonify(facts)
    return r


@bp.route("/rules", methods=["GET"])
def get_all_rules():
    graph = get_database().load(as_json=False)
    returning = []
    for u, v in graph.edges:
        print(f"Looking at {u.uuid}-[{graph[u][v]['transformation']}->{v.uuid}")
        transformation = graph[u][v]["transformation"]
        if transformation not in returning:
            returning.append(transformation)
    print(f"kekekjdgkjdhfkljsfek {returning}")
    r = jsonify(returning)
    return r


@bp.route("/graph", methods=["POST", "GET"])
def graph():
    if request.method == "POST":
        data = request.json
        print(f"Saving {data}")
        get_database().save(data)
        return "ok"
    elif request.method == "GET":
        return get_database().load()


def get_atoms_in_path_by_signature(uuid: str):
    graph = get_database().load(as_json=False)
    beginning = get_start_node_from_graph(graph)

    matching_nodes = [x for x, y in graph.nodes(data=True) if x.uuid == uuid]
    assert len(matching_nodes) == 1
    end = matching_nodes[0]
    path = nx.shortest_path(graph, beginning, end)
    signature_to_atom_mapping = defaultdict(list)
    for node in path:
        for symbol in node.atoms:
            signature = (symbol.name, len(symbol.arguments))
            signature_to_atom_mapping[signature] = symbol
    return [(f"{s[0]}/{s[1]}", signature_to_atom_mapping[s])
            for s in signature_to_atom_mapping.keys()]


@bp.route("/model/")
def model():
    if "uuid" in request.args.keys():
        key = request.args["uuid"]
    path = get_atoms_in_path_by_signature(key)
    print(f"Returning {path}")
    return jsonify(path)
