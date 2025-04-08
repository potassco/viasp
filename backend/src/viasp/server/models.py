from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint
from dataclasses import dataclass
from viasp.server.database import Base

class SessionInfo(Base):
    __tablename__ = "sessions_table"

    encoding_id: Mapped[str] = mapped_column(primary_key=True)
    show: Mapped[bool]
    color_theme: Mapped[str]


class Encodings(Base):
    __tablename__ = "encodings_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str]
    filename: Mapped[str]
    program: Mapped[str]


class Models(Base):
    __tablename__ = "models_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    model: Mapped[str]

    __table_args__ = (
        UniqueConstraint('encoding_id', 'model', name='_encoding_model_uc'),
    )


class Graphs(Base):
    __tablename__ = "graphs_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hash: Mapped[str] = mapped_column()
    data: Mapped[str] = mapped_column(nullable=True)
    sort: Mapped[str] = mapped_column()
    encoding_id = mapped_column(ForeignKey("encodings_table.encoding_id"))

    __table_args__ = (
        UniqueConstraint('encoding_id', 'hash', name='_encodingid_hash_uc'),
    )


class CurrentGraphs(Base):
    __tablename__ = "current_graphs_table"

    hash: Mapped[str] = mapped_column(ForeignKey("graphs_table.hash"))
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"),
                                             primary_key=True)


class GraphNodes(Base):
    __tablename__ = "nodes_table"

    # id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    graph_hash: Mapped[str] = mapped_column(ForeignKey("graphs_table.hash"))
    transformation_hash: Mapped[str]
    branch_position: Mapped[float]
    node: Mapped[str]
    node_uuid: Mapped[str] = mapped_column(primary_key=True)
    recursive_supernode_uuid: Mapped[str] = mapped_column(nullable=True)
    space_multiplier: Mapped[float]

@dataclass
class GraphSymbols(Base):
    __tablename__ = "symbols_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    node: Mapped[str] = mapped_column(ForeignKey("nodes_table.node_uuid"))
    symbol_uuid: Mapped[str] = mapped_column()
    symbol: Mapped[str] = mapped_column()

@dataclass
class GraphEdges(Base):
    __tablename__ = "edges_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    graph_hash: Mapped[str] = mapped_column(ForeignKey("graphs_table.hash"))
    source: Mapped[str] = mapped_column(ForeignKey("nodes_table.node_uuid"))
    target: Mapped[str] = mapped_column(ForeignKey("nodes_table.node_uuid"))
    transformation_hash: Mapped[str] = mapped_column()
    style: Mapped[str] = mapped_column()
    recursion_anchor_keyword: Mapped[str] = mapped_column(nullable=True)
    recursive_supernode_uuid: Mapped[str] = mapped_column(nullable=True)

class DependencyGraphs(Base):
    __tablename__ = "dependency_graphs_table"

    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"),
                                             primary_key=True)
    data: Mapped[str]


class Recursions(Base):
    __tablename__ = "recursions_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    recursive_transformation_hash: Mapped[str]

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'recursive_transformation_hash',
        name='_encoding_recursive_transformation_hash_uc'), )


class Clingraphs(Base):
    __tablename__ = "clingraphs_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    filename: Mapped[str]

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'filename',
        name='_encoding_filename_uc'), )

class Transformers(Base):
    __tablename__ = "transformers_table"

    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"),
                                             primary_key=True)
    transformer: Mapped[str]

class Constants(Base):
    __tablename__ = "constants_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    name: Mapped[str]
    value: Mapped[str]


class Warnings(Base):
    __tablename__ = "warnings_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    warning: Mapped[str]

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'warning',
        name='_encoding_warning_uc'), )

class AnalyzerNames(Base):
    __tablename__ = "analyzer_names_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    name: Mapped[str]

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'name',
        name='_encoding_name_uc'), )


class AnalyzerFacts(Base):
    __tablename__ = "analyzer_facts_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    fact: Mapped[str] = mapped_column()

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'fact',
        name='_encoding_fact_uc'), )


class AnalyzerConstants(Base):
    __tablename__ = "analyzer_constants_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.encoding_id"))
    constant: Mapped[str] = mapped_column()

    __table_args__ = (UniqueConstraint('encoding_id',
                                       'constant',
                                       name='_encoding_constant_uc'), )
