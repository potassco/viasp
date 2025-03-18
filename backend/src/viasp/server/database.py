from functools import wraps
import uuid
from flask import session, request

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm import DeclarativeBase

from ..shared.defaults import GRAPH_PATH

try:
    from greenlet import getcurrent as _get_ident  # type: ignore
except ImportError:
    from threading import get_ident as _get_ident  # type: ignore

SQLALCHEMY_DATABASE_URL = f"sqlite:///{GRAPH_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL)#, connect_args={"check_same_thread": False})
db_session = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine),
    scopefunc=_get_ident)


class Base(DeclarativeBase):
    pass

Base.query = db_session.query_property()


def init_db():
    # import all modules here that might define models so that
    # they will be registered properly on the metadata.  Otherwise
    # you will have to import them first before calling init_db()
    import viasp.server.models
    Base.metadata.create_all(bind=engine)

encodings_counter = 0

def ensure_encoding_id(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        encoding_id = request.cookies.get('encoding_id')
        auth_header = request.headers.get('Authorization')

        if encoding_id is not None:
            session['encoding_id'] = encoding_id
        elif auth_header is not None:
            session_id = auth_header.split(" ")[1]
            session['encoding_id'] = session_id
        elif 'encoding_id' not in session:
            global encodings_counter

            session['encoding_id'] = str(encodings_counter)
            encodings_counter += 1
        return func(*args, **kwargs)
    return decorated_function

def get_or_create_encoding_id():
    if 'encoding_id' not in session:
        session['encoding_id'] = "0"
    return session['encoding_id']
