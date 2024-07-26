from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import UniqueConstraint

from viasp.server.database import Base

class Encodings(Base):
    __tablename__ = "encodings_table"

    id: Mapped[str] = mapped_column(primary_key=True)
    program: Mapped[str]


class Models(Base):
    __tablename__ = "models_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    model: Mapped[str]

    __table_args__ = (
        UniqueConstraint('encoding_id', 'model', name='_encoding_model_uc'),
    )


class Graphs(Base):
    __tablename__ = "graphs_table"

    hash: Mapped[str] = mapped_column(primary_key=True)
    data: Mapped[str] = mapped_column(nullable=True)
    sort: Mapped[str] = mapped_column()
    encoding_id = mapped_column(ForeignKey("encodings_table.id"))


class CurrentGraphs(Base):
    __tablename__ = "current_graphs_table"

    hash: Mapped[str] = mapped_column(ForeignKey("graphs_table.hash"))
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"),
                                             primary_key=True)


class GraphNodes(Base):
    __tablename__ = "nodes_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    graph_hash: Mapped[str] = mapped_column(ForeignKey("graphs_table.hash"))
    transformation_hash: Mapped[str]
    node: Mapped[str]


class GraphEdges(Base):
    __tablename__ = "edges_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    source: Mapped[str] = mapped_column(ForeignKey("nodes_table.id"))
    target: Mapped[str] = mapped_column(ForeignKey("nodes_table.id"))


class DependencyGraphs(Base):
    __tablename__ = "dependency_graphs_table"

    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"),
                                             primary_key=True)
    data: Mapped[str]


class Recursions(Base):
    __tablename__ = "recursions_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    recursive_transformation_hash: Mapped[str]

    __table_args__ = (UniqueConstraint(
        'encoding_id',
        'recursive_transformation_hash',
        name='_encoding_recursive_transformation_hash_uc'), )


class Clingraphs(Base):
    __tablename__ = "clingraphs_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    filename: Mapped[str]


class Transformers(Base):
    __tablename__ = "transformers_table"

    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"),
                                             primary_key=True)
    transformer: Mapped[bytes]


class Warnings(Base):
    __tablename__ = "warnings_table"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    encoding_id: Mapped[str] = mapped_column(ForeignKey("encodings_table.id"))
    warning: Mapped[str]
