from typing import Tuple, Any, Dict, Iterable, Optional, List

from flask import request, Blueprint, jsonify, abort, Response
from uuid import uuid4
from time import time

from clingo import Control
from clingraph.orm import Factbase
from clingraph.graphviz import compute_graphs, render

from .dag_api import generate_graph, wrap_marked_models
from ..database import CallCenter, get_or_create_encoding_id, save_dependency_graph, save_recursive_transformations_hashes, set_models, clear_models, save_many_sorts, save_sort, save_clingraph, clear_clingraph, save_transformer, save_warnings, clear_warnings, load_warnings, save_warnings, clear_all_sorts, load_program, load_models, set_current_graph, load_transformer, load_all_clingraphs
from ..extensions import graph_accessor
from ...asp.reify import ProgramAnalyzer
from ...asp.relax import ProgramRelaxer, relax_constraints
from ...shared.model import ClingoMethodCall, StableModel, Transformation, TransformerTransport
from ...shared.util import hash_from_sorted_transformations
from ...asp.utils import register_adjacent_sorts
from ...shared.defaults import CLINGRAPH_PATH, SORTGENERATION_BATCH_SIZE, SORTGENERATION_TIMEOUT_SECONDS
from ...asp.replayer import apply_multiple

bp = Blueprint("api", __name__, template_folder='../templates/')

calls = CallCenter()
ctl: Optional[Control] = None
using_clingraph: List[str] = []


def handle_call_received(call: ClingoMethodCall) -> None:
    global ctl
    calls.append(call)
    if ctl is not None:
        ctl = apply_multiple(calls.get_pending(), ctl)


def handle_calls_received(calls: Iterable[ClingoMethodCall]) -> None:
    for call in calls:
        handle_call_received(call)


@bp.route("/control/calls", methods=["GET"])
def get_calls():
    return jsonify(calls.get_all())


@bp.route("/control/program", methods=["GET"])
def get_program():
    with graph_accessor.get_cursor() as cursor:
        return load_program(cursor, get_or_create_encoding_id())


@bp.route("/control/add_call", methods=["POST"])
def add_call():
    if request.method == "POST":
        call = request.json
        if isinstance(call, ClingoMethodCall):
            handle_call_received(call)
        elif isinstance(call, list):
            handle_calls_received(call)
        else:
            abort(Response("Invalid call object", 400))
    return "ok", 200


def get_by_name_or_index_from_args_or_kwargs(name: str, index: int, *args:
                                             Tuple[Any], **kwargs: Dict[Any,
                                                                        Any]):
    if name in kwargs:
        return kwargs[name]
    elif index < len(args):
        return args[index]
    else:
        raise TypeError(
            f"No argument {name} found in kwargs or at index {index}.")


@bp.route("/control/reconstruct", methods=["GET"])
def reconstruct():
    if calls:
        global ctl
        ctl = apply_multiple(calls.get_pending(), ctl)
    return "ok"



@bp.route("/control/models", methods=["GET", "POST"])
def set_stable_models():
    if request.method == "POST":
        try:
            parsed_models = request.json
        except BaseException:
            return "Invalid model object", 400
        if isinstance(parsed_models, str):
            parsed_models = [parsed_models]
        if not isinstance(parsed_models, list):
            return "Expected a model or a list of models", 400
        parsed_models = [m for i,m in enumerate(parsed_models) if m not in parsed_models[:i]]
        with graph_accessor.get_cursor() as cursor:
            set_models(cursor, get_or_create_encoding_id(), parsed_models)
    elif request.method == "GET":
        with graph_accessor.get_cursor() as cursor:
            return jsonify(load_models(cursor, get_or_create_encoding_id()))
    return "ok"


@bp.route("/control/models/clear", methods=["POST"])
def models_clear():
    if request.method == "POST":
        with graph_accessor.get_cursor() as cursor:
            clear_models(cursor, get_or_create_encoding_id())
        global ctl
        ctl = None
    return "ok"


@bp.route("/control/add_transformer", methods=["POST"])
def set_transformer():
    if request.method == "POST":
        try:
            transformer = request.json
            if not isinstance(transformer, TransformerTransport):
                return "Expected a transformer object", 400
        except BaseException:
            return "Invalid transformer object", 400
        with graph_accessor.get_cursor() as cursor:
            save_transformer(cursor, get_or_create_encoding_id(), transformer)
    return "ok", 200



@bp.route("/control/warnings", methods=["POST", "DELETE", "GET"])
def set_warnings():
    if request.method == "POST":
        if not isinstance(request.json, list):
            return "Expected a list of warnings", 400
        with graph_accessor.get_cursor() as cursor:
            save_warnings(cursor, get_or_create_encoding_id(), request.json)
    elif request.method == "DELETE":
        with graph_accessor.get_cursor() as cursor:
            clear_warnings(cursor, get_or_create_encoding_id())
    elif request.method == "GET":
        with graph_accessor.get_cursor() as cursor:
            return jsonify(load_warnings(cursor, get_or_create_encoding_id()))
    return "ok"


def set_primary_sort(analyzer: ProgramAnalyzer, encoding_id: str):
    primary_sort = analyzer.get_sorted_program()
    primary_hash = hash_from_sorted_transformations(primary_sort)
    register_adjacent_sorts(primary_sort, primary_hash, get_or_create_encoding_id())
    try:
        with graph_accessor.get_cursor() as cursor:
            _ = set_current_graph(cursor, encoding_id, primary_hash)
    except KeyError:
        with graph_accessor.get_cursor() as cursor:
            save_sort(cursor, encoding_id,
                      primary_hash, primary_sort)
        generate_graph(encoding_id)
    except ValueError:
        generate_graph(encoding_id)


def save_analyzer_values(analyzer: ProgramAnalyzer, encoding_id: str):
    with graph_accessor.get_cursor() as cursor:
        save_recursive_transformations_hashes(cursor, encoding_id, analyzer.check_positive_recursion())
        save_dependency_graph(cursor, encoding_id, analyzer.dependency_graph) if analyzer.dependency_graph else None
        ## TODO: save attributes



@bp.route("/control/show", methods=["POST"])
def show_selected_models():
    try:
        analyzer = ProgramAnalyzer()
        with graph_accessor.get_cursor() as cursor:
            program = load_program(cursor, get_or_create_encoding_id())
            transformer = load_transformer(cursor, get_or_create_encoding_id())

        analyzer.add_program(program, transformer)

        with graph_accessor.get_cursor() as cursor:
            save_warnings(cursor, get_or_create_encoding_id(), analyzer.get_filtered())

        with graph_accessor.get_cursor() as cursor:
            marked_models = load_models(cursor, get_or_create_encoding_id())
        marked_models = wrap_marked_models(marked_models,
                                        analyzer.get_conflict_free_showTerm())
        if analyzer.will_work():
            with graph_accessor.get_cursor() as cursor:
                save_recursive_transformations_hashes(cursor, get_or_create_encoding_id(), analyzer.check_positive_recursion())
                save_analyzer_values(analyzer, get_or_create_encoding_id())
            set_primary_sort(analyzer, get_or_create_encoding_id())
    except Exception as e:
        return str(e), 500
    return "ok", 200


@bp.route("/control/relax", methods=["POST"])
def transform_relax():
    if request.json is None:
        return "Invalid request", 400
    try:
        args = request.json["args"] if "args" in request.json else []
        kwargs = request.json["kwargs"] if "kwargs" in request.json else {}
        with graph_accessor.get_cursor() as cursor:
            program = load_program(cursor, get_or_create_encoding_id())
        relaxer = ProgramRelaxer(*args, **kwargs)
        relaxed = relax_constraints(relaxer, program)
        return jsonify(relaxed)
    except Exception as e:
        print(f"Error transforming constraints: {e}", flush=True)
        return str(e), 500


def generate_clingraph(viz_encoding: str, engine: str, graphviz_type: str, encoding_id: str):
    with graph_accessor.get_cursor() as cursor:
        marked_models = load_models(cursor, encoding_id)
    marked_models = wrap_marked_models(marked_models, clingraph=True)
    # for every model that was maked
    for model in marked_models:
        # use clingraph to generate a graph
        control = Control()
        control.add("base", [], ''.join(model))
        control.add("base", [], viz_encoding)
        control.ground([("base", [])])
        with control.solve(yield_=True) as handle:  # type: ignore
            for m in handle:
                fb = Factbase.from_model(m, default_graph="base")
                graphs = compute_graphs(fb, graphviz_type)

                filename = uuid4().hex
                if len(graphs) > 0:
                    render(graphs,
                           format="png",
                           directory=CLINGRAPH_PATH,
                           name_format=filename,
                           engine=engine)
                    with graph_accessor.get_cursor() as cursor:
                        save_clingraph(cursor, encoding_id, filename)


@bp.route("/control/clingraph", methods=["POST", "GET", "DELETE"])
def clingraph_generate():
    if request.method == "POST":
        if request.json is None:
            return "Invalid request", 400
        viz_encoding = request.json[
            "viz-encoding"] if "viz-encoding" in request.json else ""
        engine = request.json["engine"] if "engine" in request.json else "dot"
        graphviz_type = request.json[
            "graphviz-type"] if "graphviz-type" in request.json else "digraph"
        try:
            generate_clingraph(viz_encoding, engine, graphviz_type, get_or_create_encoding_id())
        except Exception as e:
            print(f"Error generating clingraph: {e}", flush=True)
            return str(e), 500
    if request.method == "GET":
        with graph_accessor.get_cursor() as cursor:
            clingraph_names = load_all_clingraphs(cursor, get_or_create_encoding_id())
        if len(clingraph_names) > 0:
            return jsonify({"using_clingraph": True}), 200
        return jsonify({"using_clingraph": False}), 200
    if request.method == "DELETE":
        with graph_accessor.get_cursor() as cursor:
            clear_clingraph(cursor, get_or_create_encoding_id())
    return "ok", 200
