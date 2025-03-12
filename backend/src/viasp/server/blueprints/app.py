from flask import Blueprint, session, jsonify

bp = Blueprint("app", __name__, template_folder='../templates', static_folder='../static/', static_url_path='/static')


@bp.route("/healthcheck", methods=["GET"])
def check_available():
    return "ok"

@bp.route('/set_session')
def set_session():
    session['encoding_id'] = 'some_value'
    return 'Session set!'

@bp.route('/get_session')
def get_session():
    encoding_id = session.get('encoding_id', 'Not set')
    return jsonify(encoding_id)
