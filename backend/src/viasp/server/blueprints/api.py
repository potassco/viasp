from typing import Tuple, Any, Dict, Iterable, List

from flask import current_app, request, Blueprint, jsonify, abort, Response, session
from uuid import uuid4
from sqlalchemy.exc import IntegrityError
from sqlalchemy.sql import select, delete
from sqlalchemy import func

from clingo import Control
from clingraph.orm import Factbase
from clingraph.graphviz import compute_graphs, render
import networkx as nx

from .dag_api import DatabaseInconsistencyError, generate_graph, wrap_marked_models, load_analyzer
from ..database import db_session, ensure_encoding_id
from ..models import *
from ...asp.reify import ProgramAnalyzer
from ...asp.relax import ProgramRelaxer, relax_constraints
from ...shared.model import ClingoMethodCall, StableModel, TransformerTransport
from ...shared.util import hash_from_sorted_transformations, get_compatible_node_link_data
from ...shared.defaults import CLINGRAPH_PATH

bp = Blueprint("api", __name__, template_folder='../templates/')

using_clingraph: List[str] = []


def handle_call_received(call: ClingoMethodCall, encoding_id: str) -> None:
    if call.name == "load":
        path = call.kwargs["path"] if "path" in call.kwargs else "<string>"
        prg = call.kwargs["program"]

        db_encoding = db_session.query(Encodings).filter_by(
            encoding_id=encoding_id, filename=path).first()
        if db_encoding is not None:
            db_encoding.program += prg
        else:
            db_encoding = Encodings(encoding_id=encoding_id,
                                    filename=path,
                                    program=prg)
            db_session.add(db_encoding)
    elif call.name == "add":
        db_encoding = db_session.query(Encodings).filter_by(
            encoding_id=encoding_id).first()
        if db_encoding is not None:
            db_encoding.program += call.kwargs["program"]
        else:
            db_encoding = Encodings(encoding_id=encoding_id,
                                    filename="<string>",
                                    program=call.kwargs["program"])
            db_session.add(db_encoding)
    elif call.name == "clear":
        db_session.execute(
            delete(Encodings).where(Encodings.encoding_id == encoding_id))
    else:
        pass
    db_session.commit()


def handle_calls_received(calls: Iterable[ClingoMethodCall], encoding_id: str) -> None:
    for call in calls:
        handle_call_received(call, encoding_id)


@bp.route("/control/program", methods=["GET", "POST", "DELETE"])
@ensure_encoding_id
def get_program():
    if request.method == "POST":
        program = request.json
        if not isinstance(program, str):
            return "Invalid program object", 400
        encoding_id = session['encoding_id']

        db_encoding = db_session.query(Encodings).filter_by(
            encoding_id=encoding_id).first()
        if db_encoding is not None:
            db_encoding.program += program
        else:
            db_encoding = Encodings(encoding_id=encoding_id, filename="<string>", program=program)
            db_session.add(db_encoding)


        try:
            db_session.commit()
        except IntegrityError:
            db_session.rollback()
            return "Error saving program", 500
    elif request.method == "GET":
        encoding_id = session['encoding_id']
        result = db_session.execute(
            select(Encodings.program).where(
                Encodings.encoding_id == encoding_id)).scalars().all()
        return jsonify("".join(result)) if result else "ok", 200
    elif request.method == "DELETE":
        encoding_id = session['encoding_id']
        db_session.execute(
            delete(Encodings).where(Encodings.encoding_id == encoding_id))
        db_session.commit()
    return "ok", 200


@bp.route("/control/add_call", methods=["POST"])
@ensure_encoding_id
def add_call():
    if request.method == "POST":
        call = request.json
        if isinstance(call, ClingoMethodCall):
            handle_call_received(call, session['encoding_id'])
        elif isinstance(call, list):
            handle_calls_received(call, session['encoding_id'])
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




@bp.route("/control/models", methods=["GET", "POST", "DELETE"])
@ensure_encoding_id
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
        encoding_id = session['encoding_id']

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
        result = db_session.query(Models).where(Models.encoding_id == session['encoding_id']).all()
        return jsonify([m.model for m in result])
    elif request.method == "DELETE":
        db_session.query(Models).where(Models.encoding_id == session['encoding_id']).delete()
        db_session.commit()
    return "ok", 200


@bp.route("/control/models/clear", methods=["POST"])
@ensure_encoding_id
def models_clear():
    if request.method == "POST":
        models = db_session.query(Models).where(Models.encoding_id == session['encoding_id']).all()
        for model in models:
            db_session.delete(model)
        db_session.commit()
        global ctl
        ctl = None
    return "ok"


@bp.route("/control/transformer", methods=["POST", "GET", "DELETE"])
@ensure_encoding_id
def set_transformer():
    if request.method == "POST":
        transformer = request.data.decode("utf-8")
        print(f"Received transformer: {type(transformer)}", flush=True)
        # if not isinstance(transformer, TransformerTransport):
        #     return "Expected a transformer object", 400
        db_transformer = Transformers(encoding_id=session['encoding_id'], transformer=transformer)
        db_session.add(db_transformer)
        db_session.commit()
    elif request.method == "GET":
        result = db_session.query(Transformers).where(Transformers.encoding_id == session['encoding_id']).first()
        return jsonify(current_app.json.loads(result.transformer)) if result else "ok", 200
    elif request.method == "DELETE":
        db_session.query(Transformers).where(Transformers.encoding_id == session['encoding_id']).delete()
        db_session.commit()
    return "ok", 200

@bp.route("/control/constant", methods=["POST"])
@ensure_encoding_id
def set_constants():
    if request.method == "POST":
        try:
            data = request.json
            if data is None:
                return "Invalid constant object", 400
            name = data["name"]
            value = data["value"]
        except BaseException:
            return "Invalid constant object", 400
        db_constant = Constants(encoding_id=session['encoding_id'], name=name, value=value)
        db_session.add(db_constant)
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
        return "ok", 200
    raise NotImplementedError


@bp.route("/control/warnings", methods=["POST", "DELETE", "GET"])
@ensure_encoding_id
def set_warnings():
    if request.method == "POST":
        if not isinstance(request.json, list):
            return "Expected a list of warnings", 400
        db_warnings = [Warnings(encoding_id=session['encoding_id'], warning=current_app.json.dumps(w)) for w in request.json]
        db_session.add_all(db_warnings)
        try:
            db_session.commit()
        except Exception as e:
            db_session.rollback()
            return str(e), 500
    elif request.method == "DELETE":
        warnings = db_session.query(Warnings).where(Warnings.encoding_id == session['encoding_id']).all()
        for warning in warnings:
            db_session.delete(warning)
        db_session.commit()
    elif request.method == "GET":
        result = db_session.query(Warnings).where(Warnings.encoding_id == session['encoding_id']).all()
        return [current_app.json.loads(w.warning) for w in result]
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
    db_dependency_graph = DependencyGraphs(
        encoding_id=encoding_id,
        data=current_app.json.dumps(
            get_compatible_node_link_data(analyzer.dependency_graph)
        )) if analyzer.dependency_graph != None else None
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

def analyze_program(encoding_id):
    try:
        analyzer = load_analyzer(encoding_id)
    except DatabaseInconsistencyError:
        program = db_session.execute(
            select(Encodings.program).where(
                Encodings.encoding_id == encoding_id)).scalars().all()
        db_transformer = db_session.query(Transformers).filter(
            Transformers.encoding_id == encoding_id).first()
        transformer = current_app.json.loads(
            db_transformer.transformer) if db_transformer is not None else None
        analyzer = ProgramAnalyzer()
        analyzer.add_program(program, transformer)
    return analyzer

@bp.route("/control/show", methods=["POST"])
@ensure_encoding_id
def show_selected_models():
    try:
        encoding_id = session['encoding_id']
        analyzer = analyze_program(encoding_id)

        warnings = [
            Warnings(encoding_id=encoding_id,
                     warning=current_app.json.dumps(w))
            for w in analyzer.get_filtered()
        ]
        db_session.add_all(warnings)
        db_session.commit()

        if analyzer.will_work():
            save_recursions(analyzer, encoding_id)
            set_primary_sort(analyzer, encoding_id)
            save_analyzer_values(analyzer, encoding_id)
    except Exception as e:
        return str(e), 500
    return "ok", 200


@bp.route("/control/relax", methods=["POST"])
@ensure_encoding_id
def transform_relax():
    if request.method == "POST":
        if request.json is None:
            return "Invalid request", 400
        args = request.json["args"] if "args" in request.json else []
        kwargs = request.json["kwargs"] if "kwargs" in request.json else {}

        encoding_id = session['encoding_id']
        encoding = db_session.execute(
            select(Encodings.program).where(
                Encodings.encoding_id == encoding_id)).scalars().all()
        if len(encoding) != 0:
            program = "".join(encoding)
        else:
            return "No program found", 400
        analyzer = analyze_program(encoding_id)
        kwargs.update({
            "get_conflict_free_variable_str":
            analyzer.get_conflict_free_variable
        })
        relaxer = ProgramRelaxer(*args, **kwargs)
        relaxed = relax_constraints(relaxer, program)
        return jsonify(relaxed)
    raise NotImplementedError


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
                           format="svg",
                           directory=CLINGRAPH_PATH,
                           name_format=filename,
                           engine=engine)
                    db_clingraph = Clingraphs(encoding_id=encoding_id, filename=filename)
                    db_session.add(db_clingraph)
                    db_session.commit()


@bp.route("/control/clingraph", methods=["POST", "GET", "DELETE"])
@ensure_encoding_id
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
            generate_clingraph(viz_encoding, engine, graphviz_type, session['encoding_id'])
        except Exception as e:
            return str(e), 500
    if request.method == "GET":
        clingraph_names = db_session.query(Clingraphs).filter_by(encoding_id = session['encoding_id']).all()
        if len(clingraph_names) > 0:
            return jsonify({"using_clingraph": True}), 200
        return jsonify({"using_clingraph": False}), 200
    if request.method == "DELETE":
        result = db_session.query(Clingraphs).where(Clingraphs.encoding_id == session['encoding_id']).all()
        for r in result:
            db_session.delete(r)
        db_session.commit()
    return "ok", 200

@bp.route("/control/deregister_session", methods=["POST"])
@ensure_encoding_id
def deregister_session():
    if request.method == "POST":
        if request.json is None:
            return "Invalid request", 400
        session_id = request.json["session_id"] if "session_id" in request.json else session['encoding_id']

        queries = [
            delete(Encodings).where(Encodings.encoding_id == session_id),
            delete(Models).where(Models.encoding_id == session_id),
            delete(Graphs).where(Graphs.encoding_id == session_id),
            delete(CurrentGraphs).where(
                CurrentGraphs.encoding_id == session_id),
            delete(GraphSymbols).where(
                GraphSymbols.node.in_(
                    db_session.query(GraphNodes.node_uuid).filter(
                        GraphNodes.encoding_id == session_id))),
            delete(GraphNodes).where(GraphNodes.encoding_id == session_id),
            delete(GraphEdges).where(GraphEdges.encoding_id == session_id),
            delete(DependencyGraphs).where(
                DependencyGraphs.encoding_id == session_id),
            delete(Recursions).where(Recursions.encoding_id == session_id),
            delete(Clingraphs).where(Clingraphs.encoding_id == session_id),
            delete(Transformers).where(
                Transformers.encoding_id == session_id),
            delete(Constants).where(Constants.encoding_id == session_id),
            delete(Warnings).where(Warnings.encoding_id == session_id),
            delete(AnalyzerNames).where(
                AnalyzerNames.encoding_id == session_id),
            delete(AnalyzerFacts).where(
                AnalyzerFacts.encoding_id == session_id),
            delete(AnalyzerConstants).where(
                AnalyzerConstants.encoding_id == session_id),
        ]
        for q in queries:
            db_session.execute(q)
        db_session.commit()
    number_of_active_sessions = db_session.execute(
        select(func.count()).select_from(Encodings)).scalar()
    return jsonify(number_of_active_sessions)


@bp.route("/control/config", methods=["POST"])
@ensure_encoding_id
def set_show_all_derived():
    if request.method == "POST":
        if request.json is None:
            return "Invalid request", 400
        show = request.json["show"] if "show" in request.json else False
        color_theme = request.json["color_theme"] if "color_theme" in request.json else "blue"
        db_session.add(
            SessionInfo(encoding_id=session['encoding_id'],
                        show=show,
                        color_theme=color_theme))
        db_session.commit()
    return "ok", 200
