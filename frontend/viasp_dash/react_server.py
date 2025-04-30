import os
import json
import importlib.metadata
import argparse
from flask import Flask, send_from_directory, render_template

from ...backend.src.viasp.shared.defaults import _, DEFAULT_FRONTEND_PORT, DEFAULT_BACKEND_PROTOCOL, DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_PORT, DEFAULT_COLOR, DEFAULT_BACKEND_URL, DEFAULT_FRONTEND_HOST

try:
    VERSION = importlib.metadata.version("viasp_dash")
except importlib.metadata.PackageNotFoundError:
    VERSION = '0.0.0'

COLOR_PALETTE_PATH = '../src/colorPalette.json'
CONFIG_PATH = '../src/config.json'

def create_app():
    app = Flask(__name__,
                static_url_path='',
                static_folder='./',
                template_folder='./')

    backend_url = os.getenv('BACKEND_URL',
                            f'{DEFAULT_BACKEND_PROTOCOL}://{DEFAULT_BACKEND_HOST}:{DEFAULT_BACKEND_PORT}')
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
    parser = argparse.ArgumentParser(description=_("VIASP_FRONTEND_TITLE_HELP"))
    parser.add_argument('--host',
                        metavar='<host>',
                        type=str,
                        help=_("VIASP_FRONTEND_HOST_HELP"),
                        default=DEFAULT_FRONTEND_HOST)
    parser.add_argument('--port',
                        metavar='<port>',
                        type=int,
                        help=_("VIASP_PORT_FRONTEND_HELP"),
                        default=DEFAULT_FRONTEND_PORT)
    parser.add_argument('--backend-url',
                        metavar='<backend_url>',
                        type=str,
                        help=_("VIASP_BACKEND_URL_HELP"),
                        default=DEFAULT_BACKEND_URL)
    parser.add_argument('--show-all-derived',
                        action='store_true',
                        help=_("VIASP_SHOW_ALL_DERIVED_HELP"))


    use_reloader = False
    debug = False
    args = parser.parse_args()
    host = args.host
    port = args.port
    backend_url = args.backend_url
    os.environ['BACKEND_URL'] = backend_url
    app = create_app()

    app.run(host=host, port=port, use_reloader=use_reloader, debug=debug)
