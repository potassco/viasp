from typing import Tuple, Any, Dict, Iterable, List

from flask import current_app, request, Blueprint, jsonify, abort, Response, session
from uuid import uuid4
from sqlalchemy.exc import IntegrityError

from clingo import Control
from clingraph.orm import Factbase
from clingraph.graphviz import compute_graphs, render
import networkx as nx

from .dag_api import generate_graph, wrap_marked_models
from ..database import db_session, get_or_create_encoding_id
from ..models import *
from ...asp.reify import ProgramAnalyzer
from ...asp.relax import ProgramRelaxer, relax_constraints
from ...shared.model import ClingoMethodCall, StableModel, TransformerTransport
from ...shared.util import hash_from_sorted_transformations
from ...shared.defaults import CLINGRAPH_PATH

bp = Blueprint("api", __name__, template_folder='../templates/')

using_clingraph: List[str] = []


def handle_call_received(call: ClingoMethodCall) -> None:
    if call.name == "load":
        path = call.kwargs["path"]
        with open(path, encoding="utf-8") as f:
            prg = "".join(f.readlines())

        db_encoding = db_session.query(Encodings).filter_by(
            id = get_or_create_encoding_id()).first()
        if db_encoding is not None:
            db_encoding.program += prg
        else:
            db_encoding = Encodings(id=get_or_create_encoding_id(), program=prg)
            db_session.add(db_encoding)
    elif call.name == "add":
        db_encoding = db_session.query(Encodings).filter_by(id = get_or_create_encoding_id()).first()
        if db_encoding is not None:
            db_encoding.program += call.kwargs["program"]
        else:
            db_encoding = Encodings(id=get_or_create_encoding_id(), program=call.kwargs["program"])
            db_session.add(db_encoding)
    else:
        pass
    db_session.commit()


def handle_calls_received(calls: Iterable[ClingoMethodCall]) -> None:
    for call in calls:
        handle_call_received(call)


@bp.route("/control/program", methods=["GET", "POST", "DELETE"])
def get_program():
    if request.method == "POST":
        program = request.json
        if not isinstance(program, str):
            return "Invalid program object", 400
        encoding_id = get_or_create_encoding_id()

        db_encoding = db_session.query(Encodings).filter_by(id=encoding_id).first()
        if db_encoding is not None:
            db_encoding.program += program
        else:
            db_encoding = Encodings(id=encoding_id, program=program)
            db_session.add(db_encoding)

        try:
            db_session.commit()
        except IntegrityError:
            db_session.rollback()
            return "Error saving program", 500
    elif request.method == "GET":
        encoding_id = get_or_create_encoding_id()
        result = db_session.query(Encodings).filter_by(id = encoding_id).first()
        return jsonify(result.program) if result else "ok", 200
    elif request.method == "DELETE":
        encoding_id = get_or_create_encoding_id()
        db_session.query(Encodings).filter_by(id = encoding_id).delete()
        db_session.commit()
    return "ok", 200


@bp.route("/control/add_call", methods=["POST"])
def add_call():
    if request.method == "POST":
        call = request.json
        if isinstance(call, ClingoMethodCall):
            handle_call_received(call)
        elif isinstance(call, list):
            handle_calls_received(call)
        else:
            abort(Response("fvalid call object", 400))
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




@bp.route("/control/models", methods=["GET", "POST", "DELETE"])
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
        encoding_id = get_or_create_encoding_id()

        db_session.query(Models).filter_by(encoding_id = encoding_id).delete()
        for model in parsed_models:
            if not isinstance(model, StableModel):
                return "Received unexpected data type, consider using viasp.shared.io.clingo_model_to_stable_model()", 400
            db_session.add(Models(encoding_id=encoding_id, model=current_app.json.dumps(model)))
            try:
                db_session.commit()
            except IntegrityError:
                db_session.rollback()
    elif request.method == "GET":
        result = db_session.query(Models).where(Models.encoding_id == get_or_create_encoding_id()).all()
        return jsonify([m.model for m in result])
    elif request.method == "DELETE":
        db_session.query(Models).where(Models.encoding_id == get_or_create_encoding_id()).delete()
        db_session.commit()
    return "ok", 200


@bp.route("/control/models/clear", methods=["POST"])
def models_clear():
    if request.method == "POST":
        models = db_session.query(Models).where(Models.encoding_id == get_or_create_encoding_id()).all()
        for model in models:
            db_session.delete(model)
        db_session.commit()
        global ctl
        ctl = None
    return "ok"


@bp.route("/control/transformer", methods=["POST", "GET", "DELETE"])
def set_transformer():
    if request.method == "POST":
        try:
            transformer = request.json
            if not isinstance(transformer, TransformerTransport):
                return "Expected a transformer object", 400
        except BaseException:
            return "Invalid transformer object", 400
        db_transformer = Transformers(encoding_id=get_or_create_encoding_id(), transformer=transformer)
        db_session.add(db_transformer)
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
    elif request.method == "GET":
        result = db_session.query(Transformers).where(Transformers.encoding_id == get_or_create_encoding_id()).first()
        return jsonify(current_app.json.loads(result.transformer)) if result else "ok", 200
    elif request.method == "DELETE":
        db_session.query(Transformers).where(Transformers.encoding_id == get_or_create_encoding_id()).delete()
        db_session.commit()
    return "ok", 200



@bp.route("/control/warnings", methods=["POST", "DELETE", "GET"])
def set_warnings():
    if request.method == "POST":
        if not isinstance(request.json, list):
            return "Expected a list of warnings", 400
        db_warnings = [Warnings(encoding_id=get_or_create_encoding_id(), warning=w) for w in request.json]
        db_session.add_all(db_warnings)
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
    elif request.method == "DELETE":
        warnings = db_session.query(Warnings).where(Warnings.encoding_id == get_or_create_encoding_id()).all()
        for warning in warnings:
            db_session.delete(warning)
        db_session.commit()
    elif request.method == "GET":
        result = db_session.query(Warnings).where(Warnings.encoding_id == get_or_create_encoding_id()).all()
        return jsonify([w.warning for w in result])
    return "ok"


def set_primary_sort(analyzer: ProgramAnalyzer, encoding_id: str):
    primary_sort = analyzer.get_sorted_program()
    primary_hash = hash_from_sorted_transformations(primary_sort)

    db_current_graph = db_session.query(CurrentGraphs).where(CurrentGraphs.encoding_id == encoding_id).first()
    if db_current_graph:
        db_current_graph.hash = primary_hash
    else:
        db_current_graph = CurrentGraphs(hash=primary_hash, encoding_id=encoding_id)
        db_session.add(db_current_graph)
    db_session.commit()

    db_graph = db_session.query(Graphs).filter(Graphs.encoding_id == encoding_id, Graphs.hash==primary_hash).first()
    if db_graph is None:
        db_graph = Graphs(encoding_id=encoding_id, hash=primary_hash, data=None, sort=current_app.json.dumps(primary_sort))
        db_session.add(db_graph)
        db_session.commit()
        generate_graph(encoding_id, analyzer)
    elif db_graph.data is None:
        generate_graph(encoding_id, analyzer)


def save_recursions(analyzer: ProgramAnalyzer, encoding_id: str):
    for t in analyzer.check_positive_recursion():
        db_recursion = Recursions(encoding_id=encoding_id,
                    recursive_transformation_hash=t)
        db_session.add(db_recursion)
        try:
            db_session.commit()
        except IntegrityError:
            db_session.rollback()


def save_analyzer_values(analyzer: ProgramAnalyzer, encoding_id: str):

    db_dependency_graph = DependencyGraphs(encoding_id=encoding_id,
                        data=current_app.json.dumps(
                            nx.node_link_data(analyzer.dependency_graph))) if analyzer.dependency_graph != None else None
    db_session.add(db_dependency_graph)

    db_names = db_session.query(AnalyzerNames).filter_by(
        encoding_id=encoding_id).all()
    seen = set([n.name for n in db_names])
    for n in analyzer.get_names():
        if n not in seen:
            db_name = AnalyzerNames(encoding_id=encoding_id, name=n)
            db_session.add(db_name)
            seen.add(n)

    db_facts = db_session.query(AnalyzerFacts).filter_by(
        encoding_id=encoding_id).all()
    seen = set([f.fact for f in db_facts])
    for f in analyzer.facts:
        if f not in seen:
            db_fact = AnalyzerFacts(encoding_id=encoding_id, fact=f)
            db_session.add(db_fact)
            seen.add(str(f))
    db_constants = db_session.query(AnalyzerConstants).filter_by(
        encoding_id=encoding_id).all()
    seen = set([f.constant for f in db_constants])
    for c in analyzer.constants:
        if c not in seen:
            db_constant = AnalyzerConstants(encoding_id=encoding_id, constant=c)
            db_session.add(db_constant)
            seen.add(str(c))
    db_session.commit()


@bp.route("/control/show", methods=["POST"])
def show_selected_models():
    try:
        analyzer = ProgramAnalyzer()
        encoding_id = get_or_create_encoding_id()
        encoding = db_session.query(Encodings).filter(Encodings.id == encoding_id).first()
        if encoding is not None:
            program = encoding.program
        else:
            raise ValueError("No program found")

        result = db_session.query(Transformers).filter(Transformers.encoding_id == encoding_id).first()
        transformer = current_app.json.loads(result.transformer) if result is not None else None

        analyzer.add_program(program, transformer)

        warnings = [Warnings(encoding_id=encoding_id, warning=current_app.json.dumps(w)) for w in analyzer.get_filtered()]
        db_session.add_all(warnings)
        db_session.commit()

        result = db_session.query(Models).where(Models.encoding_id == encoding_id).all()
        marked_models = [current_app.json.loads(m.model) for m in result]
        marked_models = wrap_marked_models(marked_models,
                                        analyzer.get_conflict_free_showTerm())
        if analyzer.will_work():
            save_recursions(analyzer, encoding_id)
            set_primary_sort(analyzer, encoding_id)
            save_analyzer_values(analyzer, encoding_id)
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

        encoding_id = get_or_create_encoding_id()
        encoding = db_session.query(Encodings).filter_by(
            id = encoding_id).first()
        if encoding is None:
            return "No program found", 400
        else:
            program = encoding.program
        relaxer = ProgramRelaxer(*args, **kwargs)
        relaxed = relax_constraints(relaxer, program)
        return jsonify(relaxed)
    except Exception as e:
        return str(e), 500


def generate_clingraph(viz_encoding: str, engine: str, graphviz_type: str, encoding_id: str):
    result = db_session.query(Models).where(
        Models.encoding_id == encoding_id).all()
    marked_models = [current_app.json.loads(m.model) for m in result]
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
                    db_clingraph = Clingraphs(encoding_id=encoding_id, filename=filename)
                    db_session.add(db_clingraph)
                    db_session.commit()


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
            return str(e), 500
    if request.method == "GET":
        clingraph_names = db_session.query(Clingraphs).filter_by(encoding_id = get_or_create_encoding_id()).all()
        if len(clingraph_names) > 0:
            return jsonify({"using_clingraph": True}), 200
        return jsonify({"using_clingraph": False}), 200
    if request.method == "DELETE":
        result = db_session.query(Clingraphs).where(Clingraphs.encoding_id == get_or_create_encoding_id()).all()
        for r in result:
            db_session.delete(r)
        db_session.commit()
    return "ok", 200
