import json
from typing import Tuple, Any, Dict

from flask import request, Blueprint, jsonify

from ..database import CallCenter
from ...shared.model import ClingoMethodCall
from ...asp.replayer import apply_multiple

bp = Blueprint("api", __name__, template_folder='../templates/')

calls = CallCenter()
ctl = None


def handle_call_received(call: ClingoMethodCall) -> None:
    if ctl is None:
        calls.append(call)
    else:
        # ToDo: Implement this. Probably a bit more complicated, as the transformation needs to be taken care of.
        raise NotImplementedError


@bp.route("/control/call", methods=["POST"])
def add_call():
    if request.method == "POST":
        try:
            parsed_call = ClingoMethodCall(**json.loads(request.data))
        except BaseException:
            return "Invalid call object", 400
        handle_call_received(parsed_call)
    return "ok"


def get_by_name_or_index_from_args_or_kwargs(name: str, index: int, *args: Tuple[Any], **kwargs: Dict[Any, Any]):
    if name in kwargs:
        return kwargs[name]
    elif index < len(args):
        return args[index]
    else:
        raise TypeError(f"No argument {name} found in kwargs or at index {index}.")


@bp.route("/control/solve", methods=["GET"])
def reconstruct():
    if calls:
        apply_multiple(calls.get_pending(), ctl)
    return "ok"


class DataContainer:
    def __init__(self):
        self.hihi = []


dc = DataContainer()


def handle_models_recieved(parsed_models):
    dc.hihi = parsed_models


@bp.route("/control/models", methods=["GET", "POST"])
def set_stable_models():
    if request.method == "POST":
        try:
            parsed_models = json.loads(request.data)
        except BaseException:
            return "Invalid model object", 400
        handle_models_recieved(parsed_models)
    elif request.method == "GET":
        return jsonify(dc.hihi)
    return "ok"


@bp.route("/control/models/clear", methods=["POST"])
def models_clear():
    if request.method == "POST":
        dc.hihi.clear()
