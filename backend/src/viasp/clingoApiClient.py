import json
from typing import Collection

import requests

from .shared.defaults import DEFAULT_BACKEND_URL, MARK_MODELS_SUCCESS_STR, MARK_MODELS_FAILED_STR, REGISTER_FUNCTION_CALL_SUCCESS_STR, REGISTER_FUNCTION_CALL_FAILED_STR, RELAX_CONSTRAINTS_FAILED_STR, RELAX_CONSTRAINTS_SUCCESS_STR, SHOW_FAILED_STR, SHOW_SUCCESS_STR, BACKEND_UNAVAILABLE_STR, CLEAR_PROGRAM_SUCCESS_STR, CLEAR_PROGRAM_FAILED_STR, CLINGRAPH_SUCCESS_STR, CLINGRAPH_FAILED_STR, TRANSFORMER_REGISTER_SUCCESS_STR, TRANSFORMER_REGISTER_FAILED_STR, REGISTER_WARNING_SUCCESS_STR, REGISTER_WARNING_FAILED_STR
from .shared.io import DataclassJSONEncoder
from .shared.model import ClingoMethodCall, StableModel, TransformerTransport
from .shared.interfaces import ViaspClient
from .shared.simple_logging import info, error


def backend_is_running(url=DEFAULT_BACKEND_URL):
    try:
        r = requests.get(f"{url}/healthcheck")
        return r.status_code == 200
    except requests.exceptions.ConnectionError:
        return False


def dict_factory_that_supports_uuid(kv_pairs):
    return {k: v for k, v in kv_pairs}


class ClingoClient(ViaspClient):

    def __init__(self, **kwargs):
        if "viasp_backend_url" in kwargs:
            self.backend_url = kwargs["viasp_backend_url"]
        else:
            self.backend_url = DEFAULT_BACKEND_URL
        if not backend_is_running(self.backend_url):
            error(BACKEND_UNAVAILABLE_STR.format(self.backend_url))

    def is_available(self):
        return backend_is_running(self.backend_url)

    def register_function_call(self, name, sig, args, kwargs):
        serializable_call = ClingoMethodCall.merge(name, sig, args, kwargs)
        self._register_function_call(serializable_call)

    def _register_function_call(self, call: ClingoMethodCall):
        if backend_is_running(self.backend_url):
            serialized = json.dumps(call, cls=DataclassJSONEncoder)
            r = requests.post(f"{self.backend_url}/control/add_call",
                              data=serialized,
                              headers={'Content-Type': 'application/json'})
            if r.ok:
                info(REGISTER_FUNCTION_CALL_SUCCESS_STR)
            else:
                error(REGISTER_FUNCTION_CALL_FAILED_STR.format(r.status_code,
                                                               r.reason))
        else:
            error(BACKEND_UNAVAILABLE_STR.format(self.backend_url))

    def set_target_stable_model(self, stable_models: Collection[StableModel]):
        serialized = json.dumps(stable_models, cls=DataclassJSONEncoder)
        r = requests.post(f"{self.backend_url}/control/models",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(MARK_MODELS_SUCCESS_STR)
        else:
            error(MARK_MODELS_FAILED_STR.format(r.status_code, r.reason))

    def show(self):
        r = requests.post(f"{self.backend_url}/control/show")
        if r.ok:
            info(SHOW_SUCCESS_STR)
        else:
            error(SHOW_FAILED_STR.format(r.status_code, r.reason))

    def relax_constraints(self, *args, **kwargs):
        serialized = json.dumps({
            "args": args,
            "kwargs": kwargs
        },
                                cls=DataclassJSONEncoder)
        r = requests.post(f"{self.backend_url}/control/relax",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(RELAX_CONSTRAINTS_SUCCESS_STR)
            return '\n'.join(r.json())
        else:
            error(RELAX_CONSTRAINTS_FAILED_STR.format(r.status_code, r.reason))
            return None

    def clear_program(self):
        r = requests.delete(f"{self.backend_url}/control/program")
        if r.ok:
            info(CLEAR_PROGRAM_SUCCESS_STR)
        else:
            error(CLEAR_PROGRAM_FAILED_STR.format(r.status_code, r.reason))

    def clingraph(self, viz_encoding, engine, graphviz_type):
        if type(viz_encoding) == str:
            with open(viz_encoding, 'r') as viz_encoding:
                prg = viz_encoding.read().splitlines()
        else:
            prg = viz_encoding.read().splitlines()
        prg = '\n'.join(prg)

        serialized = json.dumps(
            {
                "viz-encoding": prg,
                "engine": engine,
                "graphviz-type": graphviz_type
            },
            cls=DataclassJSONEncoder)

        r = requests.post(f"{self.backend_url}/control/clingraph",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(CLINGRAPH_SUCCESS_STR)
        else:
            error(CLINGRAPH_FAILED_STR.format(r.status_code, r.reason))

    def _register_transformer(self, transformer, imports, path):
        serializable_transformer = TransformerTransport.merge(
            transformer, imports, path)
        serialized = json.dumps(serializable_transformer,
                                cls=DataclassJSONEncoder)
        r = requests.post(f"{self.backend_url}/control/transformer",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(TRANSFORMER_REGISTER_SUCCESS_STR)
        else:
            error(TRANSFORMER_REGISTER_FAILED_STR.format(r.status_code, r.reason))

    def register_warning(self, warning):
        serializable_warning = json.dumps([warning], cls=DataclassJSONEncoder)
        r = requests.post(f"{self.backend_url}/control/warnings",
                          data=serializable_warning,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(REGISTER_WARNING_SUCCESS_STR)
        else:
            error(REGISTER_WARNING_FAILED_STR.format(r.status_code, r.reason))
