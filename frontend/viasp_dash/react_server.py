import os
import json
import importlib.metadata
import argparse
from flask import Flask, send_from_directory, render_template

try:
    VERSION = importlib.metadata.version("viasp_dash")
except importlib.metadata.PackageNotFoundError:
    VERSION = '0.0.0'

COLOR_PALETTE_PATH = '../src/colorPalette.json'
CONFIG_PATH = '../src/config.json'
DEFAULT_BACKEND_URL = 'http://127.0.0.1:5050'
DEFAULT_FRONTEND_HOST = '127.0.0.1'
DEFAULT_FRONTEND_PORT = 8050

def create_app():
    app = Flask(__name__,
                static_url_path='',
                static_folder='./',
                template_folder='./')

    backend_url = os.getenv('BACKEND_URL',
                            DEFAULT_BACKEND_URL)
    with open(os.path.join(os.path.dirname(__file__),
                           COLOR_PALETTE_PATH)) as f:
        color_theme = json.load(f).pop("colorThemes")

    with open(os.path.join(os.path.dirname(__file__), CONFIG_PATH)) as f:
        config = json.load(f)


    @app.route("/healthcheck", methods=["GET"])
    def check_available():
        return "ok"


    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return render_template(
                'index.html',
                color_theme=color_theme,
                config=config,
                backend_url=backend_url
            )
    return app

def run():
    parser = argparse.ArgumentParser(
        description="\t: Show all derived symbols at each step")
    parser.add_argument('--host',
                        metavar='<host>',
                        type=str,
                        help="\t: The host for the frontend",
                        default=DEFAULT_FRONTEND_HOST)
    parser.add_argument('--port',
                        metavar='<port>',
                        type=int,
                        help="\t: The port for the frontend",
                        default=DEFAULT_FRONTEND_PORT)
    parser.add_argument('--backend-url',
                        metavar='<backend_url>',
                        type=str,
                        help="\t: The URL for the backend",
                        default=DEFAULT_BACKEND_URL)
    parser.add_argument('--show-all-derived',
                        action='store_true',
                        help="\t: Show all derived symbols at each step")


    use_reloader = False
    debug = False
    args = parser.parse_args()
    host = args.host
    port = args.port
    backend_url = args.backend_url
    os.environ['BACKEND_URL'] = backend_url
    app = create_app()

    app.run(host=host, port=port, use_reloader=use_reloader, debug=debug)
