from flask import Flask
from werkzeug.utils import find_modules, import_string
from flask_cors import CORS


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
    CORS(app, resources={r"/*": {"origins": "*"}}, max_age=3600)

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()

    return app
