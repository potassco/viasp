from flask import Flask
from werkzeug.utils import find_modules, import_string
from flask_cors import CORS
import secrets
import os

from ..shared.io import DataclassJSONProvider
from .database import init_db, db_session

def register_blueprints(app):
    """collects all blueprints and adds them to the app object"""
    for name in find_modules('viasp.server.blueprints'):
        mod = import_string(name)
        if hasattr(mod, 'bp'):
            app.register_blueprint(mod.bp)
    return None


def create_app():
    app = Flask('api',static_url_path='/static', static_folder='/static')
    app.json = DataclassJSONProvider(app)
    app.config['CORS_HEADERS'] = 'Content-Type'

    init_db()
    register_blueprints(app)
    CORS(app, supports_credentials=True, max_age=3600)
    app.config['SECRET_KEY'] = secrets.token_hex(16)
    app.config['SESSION_TYPE'] = 'filesystem'

    session_dir = os.path.join(os.getcwd(), 'flask_session')
    if not os.path.exists(session_dir):
        os.makedirs(session_dir)
    app.config['SESSION_FILE_DIR'] = session_dir


    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    return app
