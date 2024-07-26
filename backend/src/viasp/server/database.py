from os.path import join, dirname, abspath
from typing import Set, List
from uuid import UUID

from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm import DeclarativeBase

from ..shared.event import Event, subscribe
from ..shared.model import ClingoMethodCall
from ..shared.defaults import GRAPH_PATH

try:
    from greenlet import getcurrent as _get_ident  # type: ignore
except ImportError:
    from threading import get_ident as _get_ident  # type: ignore

SQLALCHEMY_DATABASE_URL = "sqlite:////" + join(dirname(abspath(__file__)),
                                               GRAPH_PATH)

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


class CallCenter:

    def __init__(self):
        self.calls: List[ClingoMethodCall] = []
        self.used: Set[UUID] = set()
        subscribe(Event.CALL_EXECUTED, self.mark_call_as_used)

    def append(self, call: ClingoMethodCall):
        self.calls.append(call)

    def extend(self, calls: List[ClingoMethodCall]):
        self.calls.extend(calls)

    def get_all(self) -> List[ClingoMethodCall]:
        return self.calls

    def get_pending(self) -> List[ClingoMethodCall]:
        return list(filter(lambda call: call.uuid not in self.used,
                           self.calls))

    def mark_call_as_used(self, call: ClingoMethodCall):
        self.used.add(call.uuid)

def get_or_create_encoding_id() -> str:
    # TODO
    # if 'encoding_id' not in session:
    #     session['encoding_id'] = uuid4().hex
    # print(f"Returing encoding id {session['encoding_id']}", flush=True)
    # return session['encoding_id']
    return "0"
