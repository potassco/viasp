from functools import lru_cache
from os.path import join, dirname, abspath
import sqlite3
from typing import Set, List, Union, Tuple, Optional, Sequence
from uuid import UUID
from flask import current_app, g
import networkx as nx
from contextlib import contextmanager

from clingo.ast import Transformer

from ..shared.defaults import PROGRAM_STORAGE_PATH, GRAPH_PATH
from ..shared.event import Event, subscribe
from ..shared.model import ClingoMethodCall, StableModel, Transformation, TransformerTransport, TransformationError, Node



class ProgramDatabase:

    def __init__(self, path=PROGRAM_STORAGE_PATH):
        self.path: str = join(dirname(abspath(__file__)), path)

    def get_program(self):
        prg = ""
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                prg = "".join(f.readlines())
        except FileNotFoundError:
            self.save_program("")
        return prg

    def add_to_program(self, program: str):
        current = self.get_program()
        current = current + program
        self.save_program(current)

    def save_program(self, program: str):
        with open(self.path, "w", encoding="utf-8") as f:
            f.write(program)  #.split("\n"))

    def clear_program(self):
        with open(self.path, "w", encoding="utf-8") as f:
            f.write("")


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

class GraphAccessor:
    _instance = None

    # def __new__(cls, *args, **kwargs):
    #     if cls._instance is None:
    #         cls._instance = super(GraphAccessor, cls).__new__(cls)
    #     return cls._instance

    def __init__(self, database_path=GRAPH_PATH):
        if hasattr(self, 'initialized'):  # Ensure __init__ is called only once
            print(F"GraphAccessor already initialized", flush=True)
        else:
            print(F"Initializing GraphAccessor", flush=True)
            self.dbpath = join(dirname(abspath(__file__)), database_path)
            self.conn = sqlite3.connect(self.dbpath, check_same_thread=False)
            self.cursor = self.conn.cursor()
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS encodings (
                    id TEXT PRIMARY KEY,
                    program TEXT
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS models (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    encoding_id TEXT,
                    model TEXT,
                    FOREIGN KEY (encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS graphs (
                    hash TEXT PRIMARY KEY,
                    data TEXT,
                    sort TEXT NOT NULL,
                    encoding_id TEXT,
                    FOREIGN KEY (encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS current_graph (
                    hash TEXT PRIMARY KEY,
                    encoding_id TEXT,
                    FOREIGN KEY(hash) REFERENCES graphs(hash)
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS graph_nodes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    encoding_id TEXT,
                    hash TEXT,
                    transformation_id TEXT,
                    node TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id),
                    FOREIGN KEY(hash) REFERENCES graphs(hash)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS graph_edges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    encoding_id TEXT,
                    hash TEXT,
                    src TEXT,
                    tgt TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id),
                    FOREIGN KEY(hash) REFERENCES graphs(hash)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS graph_relations (
                    graph_hash_1 TEXT,
                    graph_hash_2 TEXT,
                    encoding_id TEXT,
                    PRIMARY KEY (graph_hash_1, graph_hash_2),
                    FOREIGN KEY(graph_hash_1) REFERENCES graphs(hash),
                    FOREIGN KEY(graph_hash_2) REFERENCES graphs(hash)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS dependency_graph (
                        encoding_id TEXT PRIMARY KEY,
                        data TEXT,
                        FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS recursion (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    encoding_id TEXT,
                    recursive_hash TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS clingraph (
                    filename TEXT PRIMARY KEY,
                    encoding_id TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS transformer (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transformer BLOB,
                    encoding_id TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS warnings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    encoding_id TEXT,
                    warning TEXT,
                    FOREIGN KEY(encoding_id) REFERENCES encodings(id)
                )
            """)
            self.conn.commit()

    def connect(self):
        self.conn = sqlite3.connect(self.dbpath, check_same_thread=False)

    @contextmanager
    def get_cursor(self):
        if self.conn is None:
            self.conn = sqlite3.connect(self.dbpath, check_same_thread=False)
        try:
            yield self.conn.cursor()
            self.conn.commit()
        finally:
            pass
            # self.conn.close()
            # self.conn = None
# def get_database(database_path=GRAPH_PATH):
#     graph_accessor = GraphAccessor(database_path)
#     return graph_accessor

def save_program(cursor, encoding_id: str, program: str):
    cursor.execute(
        """
        INSERT OR REPLACE INTO encodings (program, id) VALUES (?, ?)
    """, (program, encoding_id))

def add_to_program(cursor, encoding_id: str, program: str):
    program = load_program(cursor, encoding_id) + program
    cursor.execute(
        """
        INSERT OR REPLACE INTO encodings (id, program) VALUES (?, ?)
    """, (encoding_id, program))

def load_program(cursor, encoding_id: str) -> str:
    cursor.execute(
        """
        SELECT program FROM encodings WHERE id = (?)
    """, (encoding_id, ))
    result = cursor.fetchone()
    return result[0] if result is not None else ""

def clear_program(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM encodings WHERE id = (?)
    """, (encoding_id, ))


def set_models(cursor, encoding_id: str,
               parsed_models: Sequence[Union[StableModel, str]]):
    clear_models(cursor, encoding_id)
    for model in parsed_models:
        json_model = current_app.json.dumps(model)
        cursor.execute(
            """
            INSERT INTO models (encoding_id, model) VALUES (?, ?)
        """, (encoding_id, json_model))


def load_models(cursor, encoding_id: str) -> List[StableModel]:
    cursor.execute(
        """
        SELECT model FROM models WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchall()

    return [current_app.json.loads(r[0]) for r in result]


def clear_models(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM models WHERE encoding_id = (?)
    """, (encoding_id, ))


    # # # # # # # #
    #    GRAPHS   #
    # # # # # # # #

def save_graph(cursor, encoding_id: str, graph: nx.Graph, hash: str,
            sort: List[Transformation]):
    cursor.execute(
        """
        INSERT OR REPLACE INTO graphs (data, hash, sort, encoding_id) VALUES (?, ?, ?, ?)
    """, (current_app.json.dumps(nx.node_link_data(graph)), hash,
        current_app.json.dumps(sort), encoding_id))
    # self.load_current_graph.cache_clear()
    # self.load_graph.cache_clear()


def save_nodes(cursor, encoding_id: str,
               transformation_node_tuples: List[Tuple[str, Node]], hash: str):
    cursor.executemany(
        """
            INSERT OR REPLACE INTO graph_nodes (encoding_id, hash, transformation_id, node) VALUES (?, ?, ?, ?)
            """,
        [(encoding_id, hash, transformation_hash, current_app.json.dumps(node))
         for transformation_hash, node in transformation_node_tuples])
    # self.load_nodes.cache_clear()

# @lru_cache(maxsize=128)
def load_nodes(cursor, encoding_id,  transformation_id: str) -> List[Node]:
    graph_hash = get_current_graph_hash(cursor, encoding_id)
    cursor.execute(
        """
        SELECT node FROM graph_nodes WHERE encoding_id = ? AND hash = ? AND transformation_id = ?
    """, (encoding_id, graph_hash, transformation_id))
    result = cursor.fetchall()
    return [current_app.json.loads(r[0]) for r in result]

def set_current_graph(cursor, encoding_id: str, hash: str):
    if get_current_graph_hash(cursor, encoding_id) != hash:
        cursor.execute(
            """
            DELETE FROM current_graph WHERE encoding_id = (?)
        """, (encoding_id, ))
        cursor.execute(
            """
            INSERT INTO current_graph (hash, encoding_id) VALUES (?, ?)
        """,
            (hash, encoding_id))

def get_current_graph_hash(cursor, encoding_id: str) -> str:
    cursor.execute(
        """
        SELECT hash FROM current_graph WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchone()
    if result and result[0]:
        return result[0]
    return ""

def load_graph_json(cursor, encoding_id: str, hash: str) -> str:
    cursor.execute(
        """
        SELECT data FROM graphs WHERE hash = ? AND encoding_id = ?
    """, (hash, encoding_id))
    result = cursor.fetchone()
    if not result:
        raise KeyError("The hash is not in the database")
    if result and result[0]:
        return result[0]
    raise ValueError("No graph found")

# @lru_cache(maxsize=8)
def load_graph(cursor, hash: str, encoding_id: str) -> nx.DiGraph:
    graph_json_str = load_graph_json(cursor, hash, encoding_id)
    return nx.node_link_graph(current_app.json.loads(graph_json_str))

def load_current_graph_json(cursor, encoding_id: str) -> str:
    hash = get_current_graph_hash(cursor, encoding_id)
    return load_graph_json(cursor, hash, encoding_id)

# @lru_cache(maxsize=8)
def load_current_graph(cursor, encoding_id: str) -> nx.DiGraph:
    graph_json_str = load_current_graph_json(cursor, encoding_id)
    return nx.node_link_graph(current_app.json.loads(graph_json_str))

    # # # # # # # #
    #   SORTS     #
    # # # # # # # #

def save_many_sorts(cursor, encoding_id: str, sorts: List[Tuple[str, List[Transformation]]]):
    cursor.executemany(
        """
        INSERT OR REPLACE INTO graphs (hash, data, sort, encoding_id) VALUES (?, ?, ?, ?)
    """, [(hash, None, current_app.json.dumps(sort), encoding_id)
            for hash, sort in sorts])

def save_sort(cursor, encoding_id: str, hash: str, sort: List[Transformation]):
    cursor.execute(
        """
        INSERT OR REPLACE INTO graphs (hash, data, sort, encoding_id) VALUES (?, ?, ?, ?)
    """, (hash, None, current_app.json.dumps(sort), encoding_id))

def get_current_sort(cursor, encoding_id: str) -> List[Transformation]:
    hash = get_current_graph_hash(cursor, encoding_id)
    cursor.execute(
        """
        SELECT sort FROM graphs WHERE hash = ?
    """, (hash, ))
    result = cursor.fetchone()
    if result and result[0]:
        loaded = current_app.json.loads(result[0])
        loaded.sort(key=lambda x: x.id)
        return loaded
    raise ValueError("No sort found")

def get_all_sorts(cursor, encoding_id: str) -> List[str]:
    cursor.execute(
        """
        SELECT hash FROM graphs WHERE encoding_id = (?)
    """, (encoding_id, ))
    result: List[str] = cursor.fetchall()
    loaded_sorts: List[str] = [r[0] for r in result]
    current_sort_hash = get_current_graph_hash(cursor, encoding_id)
    if current_sort_hash != "":
        try:
            index_of_current_sort: int = loaded_sorts.index(
                current_sort_hash)
            loaded_sorts = loaded_sorts[
                index_of_current_sort:] + loaded_sorts[:
                                                        index_of_current_sort]
        except ValueError:
            pass
    return loaded_sorts

def insert_graph_adjacency(cursor, encoding_id: str, hash1: str, hash2: str,
                            sort2: List[Transformation]):
    cursor.execute("SELECT hash FROM graphs WHERE hash = ?",
                        (hash2, ))
    result = cursor.fetchone()

    if result is None:
        save_sort(cursor, encoding_id, hash2, sort2)
    insert_graph_adjacency_element(cursor, encoding_id, hash1, hash2)
    insert_graph_adjacency_element(cursor, encoding_id, hash2, hash1)

def insert_graph_adjacency_element(cursor, encoding_id: str, hash1: str, hash2: str):
    try:
        cursor.execute(
            """
            INSERT INTO graph_relations (graph_hash_1, graph_hash_2, encoding_id) VALUES (?, ?, ?)
        """, (hash1, hash2, encoding_id))
    except sqlite3.IntegrityError:
        pass

def save_dependency_graph(cursor, encoding_id: str, data: nx.DiGraph):
    cursor.execute(
        """
        INSERT OR REPLACE INTO dependency_graph (data, encoding_id) VALUES (?, ?)
    """, (current_app.json.dumps(nx.node_link_data(data)), encoding_id))

def load_dependency_graph(cursor, encoding_id: str) -> nx.DiGraph:
    cursor.execute(
        """
        SELECT data FROM dependency_graph WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchone()
    if result and result[0]:
        return nx.node_link_graph(current_app.json.loads(result[0]))
    raise ValueError("No dependency graph found")

def get_adjacent_graphs_hashes(cursor, hash: str,
                                encoding_id: str) -> List[str]:
    cursor.execute(
        """
        SELECT graph_hash_2 FROM graph_relations WHERE graph_hash_1 = ? AND encoding_id = ?
    """, (hash, encoding_id))
    result = cursor.fetchall()
    return [r[0] for r in result]

def clear_all_sorts(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM graphs WHERE encoding_id = (?)
    """, (encoding_id, ))

    # # # # # # # #
    #  RECURSION  #
    # # # # # # # #

def save_recursive_transformations_hashes(cursor, encoding_id: str, transformations: Set[str]):
    cursor.executemany(
        """
        INSERT INTO recursion (encoding_id, recursive_hash) VALUES (?, ?)
    """, [(encoding_id, t) for t in transformations])

def load_recursive_transformations_hashes(cursor,
                                            encoding_id: str) -> Set[str]:
    cursor.execute(
        """
        SELECT recursive_hash FROM recursion WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchall()
    return {r[0] for r in result}

def clear_recursive_transformations_hashes(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM recursion WHERE encoding_id = (?)
    """, (encoding_id, ))

# # # # # # # #
#  CLINGRAPH  #
# # # # # # # #

def save_clingraph(cursor, encoding_id: str, filename: str):
    cursor.execute(
        """
        INSERT OR REPLACE INTO clingraph (filename, encoding_id) VALUES (?, ?)
    """, (filename, encoding_id))

def clear_clingraph(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM clingraph WHERE encoding_id = (?)
    """, (encoding_id, ))


def load_all_clingraphs(cursor, encoding_id: str) -> List[str]:
    cursor.execute(
        """
        SELECT filename FROM clingraph
        WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchall()
    return [r[0] for r in result]

# # # # # # # #
#   WARNINGS  #
# # # # # # # #

def clear_warnings(cursor, encoding_id: str):
    cursor.execute(
        """
        DELETE FROM warnings WHERE encoding_id = (?)
    """, (encoding_id, ))

def save_warnings(cursor, encoding_id: str, warnings: List[TransformationError]):
    cursor.executemany(
        """
        INSERT INTO warnings (encoding_id, warning) VALUES (?, ?)
    """, [(encoding_id, current_app.json.dumps(w)) for w in warnings])

def load_warnings(cursor, encoding_id: str) -> List[str]:
    cursor.execute(
        """
        SELECT warning FROM warnings WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchall()
    return [current_app.json.loads(r[0]) for r in result]

# # # # # # # # # # # # # # #
#   REGISTERED TRANFORMER   #
# # # # # # # # # # # # # # #

def save_transformer(cursor, encoding_id: str, transformer: TransformerTransport):
    cursor.execute(
        """
        INSERT OR REPLACE INTO transformer (transformer, encoding_id) VALUES (?, ?)
    """, (current_app.json.dumps(transformer), encoding_id))

def load_transformer(cursor, encoding_id: str) -> Optional[Transformer]:
    cursor.execute(
        """
        SELECT transformer FROM transformer WHERE encoding_id = (?)
    """, (encoding_id, ))
    result = cursor.fetchone()
    return current_app.json.loads(
        result[0]) if result is not None else None

# # # # # # # #
#   GENERAL   #
# # # # # # # #

def clear(cursor, encoding_id: str):
    cursor.execute("DELETE FROM encodings WHERE id = ?", (encoding_id,))
    cursor.execute("DELETE FROM models WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM graphs WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM current_graph WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM graph_relations WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM clingraph WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM transformer WHERE encoding_id = ?", (encoding_id,))
    cursor.execute("DELETE FROM warnings WHERE encoding_id = ?", (encoding_id,))
