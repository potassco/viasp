import json
from typing import Collection

import requests

from .shared.defaults import DEFAULT_BACKEND_URL, DEFAULT_FRONTEND_URL, _
from .shared.io import DataclassJSONEncoder
from .shared.model import ClingoMethodCall, StableModel, TransformerTransport
from .shared.interfaces import ViaspClient
from .shared.simple_logging import info, error


def server_is_running(url=DEFAULT_BACKEND_URL):
    try:
        r = requests.get(f"{url}/healthcheck")
        return r.status_code == 200
    except requests.exceptions.ConnectionError:
        return False


def dict_factory_that_supports_uuid(kv_pairs):
    return {k: v for k, v in kv_pairs}


class ClingoClient(ViaspClient):

    def __init__(self, **kwargs):
        self.session = requests.Session()
        if "viasp_backend_url" in kwargs:
            self.backend_url = kwargs["viasp_backend_url"]
        else:
            self.backend_url = DEFAULT_BACKEND_URL
        if not server_is_running(self.backend_url):
            error(_("BACKEND_UNAVAILABLE").format(self.backend_url))

    def is_available(self):
        return server_is_running(self.backend_url)

    def register_function_call(self, name, sig, args, kwargs):
        serializable_call = ClingoMethodCall.merge(name, sig, args, kwargs)
        self._register_function_call(serializable_call)

    def _register_function_call(self, call: ClingoMethodCall):
        if server_is_running(self.backend_url):
            serialized = json.dumps(call, cls=DataclassJSONEncoder)
            r = self.session.post(f"{self.backend_url}/control/add_call",
                              data=serialized,
                              headers={'Content-Type': 'application/json'})
            if r.ok:
                info(_("REGISTER_FUNCTION_CALL_SUCCESS"))
            else:
                error(_("REGISTER_FUNCTION_CALL_FAILED").format(r.status_code,
                                                               r.reason))
        else:
            error(_("BACKEND_UNAVAILABLE").format(self.backend_url))

    def set_target_stable_model(self, stable_models: Collection[StableModel]):
        serialized = json.dumps(stable_models, cls=DataclassJSONEncoder)
        r = self.session.post(f"{self.backend_url}/control/models",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("MARK_MODELS_SUCCESS"))
        else:
            error(_("MARK_MODELS_FAILED").format(r.status_code, r.reason))

    def show(self):
        r = self.session.post(f"{self.backend_url}/control/show")
        if r.ok:
            info(_("SHOW_SUCCESS"))
        else:
            error(_("SHOW_FAILED").format(r.status_code, r.reason))

    def relax_constraints(self, *args, **kwargs):
        serialized = json.dumps({
            "args": args,
            "kwargs": kwargs
        },
                                cls=DataclassJSONEncoder)
        r = self.session.post(f"{self.backend_url}/control/relax",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("RELAX_CONSTRAINTS_SUCCESS"))
            return '\n'.join(r.json())
        else:
            error(_("RELAX_CONSTRAINTS_FAILED").format(r.status_code, r.reason))
            return None

    def clear_program(self):
        r = requests.delete(f"{self.backend_url}/control/program")
        if r.ok:
            info(_("CLEAR_PROGRAM_SUCCESS"))
        else:
            error(_("CLEAR_PROGRAM_FAILED").format(r.status_code, r.reason))

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

        r = self.session.post(f"{self.backend_url}/control/clingraph",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("CLINGRAPH_SUCCESS"))
        else:
            error(_("CLINGRAPH_FAILED").format(r.status_code, r.reason))

    def _register_transformer(self, transformer, imports, path):
        serializable_transformer = TransformerTransport.merge(
            transformer, imports, path)
        serialized = json.dumps(serializable_transformer,
                                cls=DataclassJSONEncoder)
        r = self.session.post(f"{self.backend_url}/control/transformer",
                          data=serialized,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("TRANSFORMER_REGISTER_SUCCESS"))
        else:
            error(_("TRANSFORMER_REGISTER_FAILED").format(r.status_code, r.reason))

    def _register_constant(self, name, value):
        r = self.session.post(f"{self.backend_url}/control/constant",
                              data=json.dumps({
                              "name": name,
                              "value": value
                          }),
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("REGISTER_CONSTANT_SUCCESS"))
        else:
            error(_("REGISTER_CONSTANT_FAILED").format(r.status_code, r.reason))

    def register_warning(self, warning):
        serializable_warning = json.dumps([warning], cls=DataclassJSONEncoder)
        r = self.session.post(f"{self.backend_url}/control/warnings",
                          data=serializable_warning,
                          headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("REGISTER_WARNING_SUCCESS"))
        else:
            error(_("REGISTER_WARNING_FAILED").format(r.status_code, r.reason))

    def get_session_id(self):
        r = self.session.get(f"{self.backend_url}/get_session")
        if r.ok:
            info(_("GET_SESSION_ID_SUCCESS"))
            return r.json()
        else:
            error(_("GET_SESSION_ID_FAILED").format(r.status_code, r.reason))
            return None

    def deregister_session(self, session_id):
        r = self.session.post(f"{self.backend_url}/control/deregister_session",
                              data = json.dumps({
                                  "session_id": session_id
                              }),
                              headers={'Content-Type': 'application/json'})

        if r.ok:
            info(_("DEREGISTER_SESSION_SUCCESS"))
            return r.json()
        else:
            error(_("DEREGISTER_SESSION_FAILED").format(r.status_code, r.reason))
            return 0

    def show_all_derived(self, show, color_theme):
        r = self.session.post(f"{self.backend_url}/control/config",
            data=json.dumps({
                "show": show,
                "color_theme": color_theme
            }),
            headers={'Content-Type': 'application/json'})
        if r.ok:
            info(_("SHOW_ALL_DERIVED_SUCCESS"))
        else:
            error(_("SHOW_ALL_DERIVED_FAILED").format(r.status_code, r.reason))
