from clingo.ast import Transformer, AST, ASTType
from clingo import Number, ast, Symbol
import networkx as nx

from typing import List, Any, Set, Iterable, Optional

from ..shared.util import get_root_node_from_graph
from ..shared.simple_logging import warn
from ..shared.model import Node, ReasonSymbolIdentifier

class DetailEncoder:

    def __init__(self):
        self.body_aggregate_counter = 0

    def increment_body_aggregate_counter(self) -> None:
        self.body_aggregate_counter += 1

    def encode_literal(self, literal: ast.Literal) -> Optional[ast.Literal]:  # type: ignore
        if not (hasattr(literal, "sign") and hasattr(literal, "atom")
                and hasattr(literal.atom, "ast_type")):
            return
        if literal.atom.ast_type == ASTType.SymbolicAtom:
            return self.create_pos_neg_reason_literal(literal)
        if literal.atom.ast_type == ASTType.Comparison:
            return self.create_comparison_literal(literal)
        if literal.atom.ast_type == ASTType.BodyAggregate:
            reason = self.create_aggregate_reason_literal(literal)
            self.increment_body_aggregate_counter()
            return reason

    def create_pos_neg_reason_literal(
            self,
            literal: ast.Literal) -> ast.Function:  # type: ignore
        if literal.sign == ast.Sign.Negation:
            wrapper_name = "neg"
        elif literal.sign == ast.Sign.DoubleNegation:
            wrapper_name = "double_neg"
        else:
            wrapper_name = "pos"
        return ast.Function(literal.location, wrapper_name, [literal.atom], False)

    def create_comparison_literal(
            self,
            literal: ast.Literal) -> ast.Function:  # type: ignore
        stringified = ast.Function(literal.location, '"' + str(literal.atom) + '"',
                                [], False)
        list_of_variable_ident_tuples = []
        for var in collect_variables_in_comparison(literal.atom):
            variable_string = ast.Function(literal.location,
                                        '"' + str(var.name) + '"', [], False)
            variable_value = var
            list_of_variable_ident_tuples.append(
                ast.Function(literal.location, "",
                            [variable_string, variable_value], False))

        variables = ast.Function(literal.location, "",
                                list_of_variable_ident_tuples, False)
        return ast.Function(literal.location, "comp", [variables, stringified],
                            False)

    def create_aggregate_reason_literal(
            self,
            literal: ast.Literal) -> ast.Function:  # type: ignore
        wrapper_name = "body_aggregate"
        list_of_aggregate_descriptors = []
        list_of_aggregate_descriptors.append(
            ast.SymbolicTerm(literal.location, Number(self.body_aggregate_counter)))
        list_of_aggregate_descriptors.append(
            ast.Function(literal.location, "",
                        collect_variables_in_aggregate(literal.atom), False))

        if literal.sign == ast.Sign.Negation:
            list_of_aggregate_descriptors.append(
                ast.Function(literal.location, "neg", [], False))
        else:
            list_of_aggregate_descriptors.append(
                ast.Function(literal.location, "pos", [], False))

        return ast.Function(literal.location, wrapper_name,
                            list_of_aggregate_descriptors, False)
    
    def create_auxiliary_aggregate_rules(
            self,
            literal: ast.Literal) -> ast.Function:
        print("Need to create auxiliary rules for aggregate reason literals", flush=True)

class DetailDecoder:

    def iterate_positive_reasons(self, reasons: List[Symbol]) -> Iterable[Symbol]:
        for reason in reasons:
            if reason.name == "pos":
                yield reason.arguments[0]


    def iterate_negative_reasons(self, reasons: List[Symbol]) -> Iterable[Symbol]:
        for reason in reasons:
            if reason.name == "neg":
                yield reason

    def is_positive_reason(self, reason: Symbol) -> bool:
        if reason.name == "pos":
            return True
        return False

    def is_negative_reason(self, reason: Symbol) -> bool:
        return not self.is_positive_reason(reason)

    def stringify_reason(self, reason: Symbol) -> str:
        if reason.name == "neg":
            return f"not {reason.arguments[0]}"
        elif reason.name == "pos":
            return str(reason.arguments[0])
        elif reason.name == "double_neg":
            return f"not not {reason.arguments[0]}"
        elif reason.name == "comp":
            reason_repr = reason.arguments[1].string
            variable_tuples = reason.arguments[0].arguments
            string_value_mapping = {}
            for var in variable_tuples:
                variable_str = var.arguments[0].string
                variable_value = var.arguments[1]
                string_value_mapping[str(variable_str)] = str(variable_value)
            string_value_mapping = dict(sorted(string_value_mapping.items(), key=lambda x: len(x[0]), reverse=True))
            for variable_str, variable_value in string_value_mapping.items():
                reason_repr = reason_repr.replace(str(variable_str), str(variable_value))
            return reason_repr
        return ""


    def decode_detail(
            self,
            reason_symbol: Symbol, g: Optional[nx.DiGraph] = None, v: Optional[Node] = None) -> ReasonSymbolIdentifier:  # type: ignore
        if reason_symbol.name == "pos":
            reason_repr = str(reason_symbol.arguments[0])
            if g is None or v is None:
                reason_uuid = ""
            else:
                reason_uuid = get_identifiable_reason(
                    g, v, reason_symbol.arguments[0])
            is_positive = True
            is_negative = False
        else:
            reason_repr = self.stringify_reason(reason_symbol)
            reason_uuid = None
            is_positive = False
            is_negative = True
        return ReasonSymbolIdentifier(
            reason_uuid, reason_repr, None, is_positive, is_negative)


def identify_reasons(g: nx.DiGraph) -> None:
    """
    Identify the reasons for each symbol in the graph.
    Takes the Symbol from node.reason and overwrites the values of the Dict node.reason
    with the SymbolIdentifier of the corresponding symbol.

    :param g: The graph to identify the reasons for.
    """
    detail_decoder = DetailDecoder()
    # get fact node:
    root_node = get_root_node_from_graph(g)

    # go through entire graph, starting at root_node and traveling down the graph via successors
    children_next = set()
    searched_nodes = set()
    children_current = [root_node]
    while len(children_current) != 0:
        for v in children_current:
            for symbol in v.diff:
                tmp_reasons = []
                for reason in symbol.reasons_symbols:
                    tmp_reasons.append(detail_decoder.decode_detail(
                            reason.symbol, g, v))
                symbol.reasons_symbols = tmp_reasons

            searched_nodes.add(v)
            for w in g.successors(v):
                children_next.add(w)
            children_next = children_next.difference(searched_nodes)
        children_current = list(children_next)


def get_identifiable_reason(g: nx.DiGraph,
                            v: Node,
                            r: Symbol,
                            super_graph=None,
                            super_node=None) -> Optional[str]:
    """
    Returns the SymbolIdentifier that is the reason for the given Symbol r.
    If the reason is not in the node, it returns recursively calls itself with the predecessor.


    :param g: The graph that contains the nodes
    :param v: The node that contains the symbol r
    :param r: The symbol that is the reason
    """
    match = next(filter(lambda x: x.symbol == r, v.diff), None)
    if match != None: return match.uuid.hex
    if (g.in_degree(v) != 0):
        for u in g.predecessors(v):
            return get_identifiable_reason(g,
                                           u,
                                           r,
                                           super_graph=super_graph,
                                           super_node=super_node)
    if (super_graph != None and super_node != None):
        return get_identifiable_reason(super_graph, super_node, r)

    # stop criterion: v is the root node and there is no super_graph
    warn(f"An explanation could not be made")
    return None

class VariablesCollector(Transformer):

    def visit_Variable(
            self,
            variable: ast.Variable,  # type: ignore
            **kwargs: Any) -> AST:
        variables: List[AST] = kwargs.get("variables", [])
        variables.append(variable)
        return variable.update(**self.visit_children(variable, **kwargs))


class AggregateVariablesCollector(VariablesCollector):

    def visit_AggregateElement(
            self,
            aggregate_element: ast.BodyAggregateElement,  # type: ignore
            **kwargs: Any) -> AST:
        return aggregate_element

    def visit_BodyAggregateElement(
            self,
            body_aggregate_element: ast.BodyAggregateElement,  # type: ignore
            **kwargs: Any) -> AST:
        return body_aggregate_element

    def visit_ConditionalLiteral(
            self,
            conditional_literal: ast.ConditionalLiteral,  # type: ignore
            **kwargs: Any) -> AST:
        return conditional_literal


def collect_variables_in_comparison(
        comparison: ast.Comparison) -> List[ast.Variable]:  # type: ignore
    """
    Collects all variables in a literal.
    """
    visitor = VariablesCollector()
    variables = []
    visitor.visit(comparison, variables=variables)

    # remove duplicates while keeping order
    seen: Set[ast.Variable] = set()  # type: ignore
    variables = [x for x in variables if not (x in seen or seen.add(x))]
    return variables


def collect_variables_in_aggregate(
        aggregate: ast.BodyAggregate) -> List[ast.Variable]:  # type: ignore
    """
    Collects all variables in an aggregate, except when they occur in AggregateElements, COnditionalElements, CardinalityConstraint Elements. 
    """
    visitor = AggregateVariablesCollector()
    variables = []
    visitor.visit(aggregate, variables=variables)

    # remove duplicates while keeping order
    seen: Set[ast.Variable] = set()  # type: ignore
    variables = [x for x in variables if not (x in seen or seen.add(x))]
    return variables
