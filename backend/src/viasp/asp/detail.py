from clingo.ast import Transformer, AST, ASTType, ASTSequence
from clingo import Function, Number, String, ast, Symbol
import networkx as nx

from typing import List, Any, Set, Iterable, Optional, Union, Callable

from ..shared.util import get_root_node_from_graph
from ..shared.simple_logging import warn
from ..shared.model import Node, ReasonSymbolIdentifier

class DetailEncoder:

    def __init__(self, component_nr: int,
                 get_conflicht_free_variable_str: Callable) -> None:
        self.component_nr = component_nr
        self.get_conflict_free_variable_str = get_conflicht_free_variable_str
        self.body_aggregate_counter = 0
        self.auxiliary_rules = []

    def increment_body_aggregate_counter(self) -> None:
        self.body_aggregate_counter += 1

    def encode_literal(self, literal: ast.Literal, h_literal_for_auxiliary_rules: Optional[ast.Literal]) -> Optional[ast.Literal]:  # type: ignore
        if not (hasattr(literal, "sign") and hasattr(literal, "atom")
                and hasattr(literal.atom, "ast_type")):
            return
        if literal.atom.ast_type == ASTType.SymbolicAtom:
            return self.create_pos_neg_reason_literal(literal)
        if literal.atom.ast_type == ASTType.Comparison:
            return self.create_comparison_literal(literal)
        if literal.atom.ast_type == ASTType.BodyAggregate:
            reason = self.create_aggregate_reason_literal(literal)
            self.auxiliary_rules.extend(
                self.create_auxiliary_aggregate_rules(
                    literal,
                    h_literal=h_literal_for_auxiliary_rules))
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
        return ast.Function(literal.location, wrapper_name, [literal.atom], 0)

    def create_comparison_literal(
            self,
            literal: ast.Literal) -> ast.Function:  # type: ignore
        string_repr = str(literal.atom)
        return self.create_comp_function(
            literal.location, literal.atom, string_repr)

    def create_comp_function(
            self,
            location: ast.Location,  # type: ignore
            ast_elem: AST,  # type: ignore
            string_repr: str) -> ast.Function:  # type: ignore
        stringified = ast.SymbolicTerm(location, String(string_repr))
        list_of_variable_ident_tuples = []
        for var in collect_variables(ast_elem):
            variable_string = ast.Function(location, '"' + str(var.name) + '"',
                                           [], 0)
            variable_value = var
            list_of_variable_ident_tuples.append(
                ast.Function(location, "", [variable_string, variable_value],
                             0))
        variables = ast.Function(location, "", list_of_variable_ident_tuples,
                                 0)
        return ast.Function(location, "comp", [variables, stringified], 0)

    def create_guard_literal(
            self,
            location: ast.Location,  # type: ignore
            guard: Optional[ast.Guard]) -> ast.Function:  # type: ignore
        if guard is None:
            return ast.Function(location, "_none", [], 0)
        string_repr = str(guard.term)
        return self.create_comp_function(location, guard.term, string_repr)

    def create_body_aggregate_term_literal(
            self,
            location: ast.Location,  # type: ignore
            element: ast.BodyAggregateElement) -> ast.Function:  # type: ignore
        string_repr = ','.join([str(term) for term in element.terms])
        return self.create_comp_function(
            location, element.terms, string_repr)

    def create_aggregate_reason_literal(
            self,
            literal: ast.Literal) -> ast.Function:  # type: ignore
        wrapper_name = "body_aggregate"
        list_of_aggregate_descriptors = []
        list_of_aggregate_descriptors.append(
            ast.SymbolicTerm(literal.location, Number(self.body_aggregate_counter)))
        list_of_aggregate_descriptors.append(
            ast.Function(literal.location, "",
                        collect_variables_in_aggregate(literal.atom), 0))

        if literal.sign == ast.Sign.Negation:
            list_of_aggregate_descriptors.append(
                ast.Function(literal.location, "neg", [], 0))
        elif literal.sign == ast.Sign.DoubleNegation:
            list_of_aggregate_descriptors.append(
                ast.Function(literal.location, "double_neg", [], 0))
        elif literal.sign == ast.Sign.NoSign:
            list_of_aggregate_descriptors.append(
                ast.Function(literal.location, "pos", [], 0))

        return ast.Function(literal.location, wrapper_name,
                            list_of_aggregate_descriptors, 0)

    def create_auxiliary_aggregate_rules(
            self,
            literal: ast.Literal,  # type: ignore
            h_literal: ast.Function) -> List[ast.Rule]:  # type: ignore
        new_rules = []
        wrapper_name = "body_aggregate"
        aggregate_number = self.body_aggregate_counter
        aggregate_value_name = self.get_conflict_free_variable_str("_X1")

        new_rules.append(
            self.create_aggregate_rule_bounds_and_value_info(
                literal, self.component_nr, h_literal, wrapper_name,
                aggregate_number, aggregate_value_name))

        for i, element in enumerate(literal.atom.elements):
            new_rules.append(
                self.create_aggregate_element_rule(
                    literal, element, self.component_nr, h_literal,
                    wrapper_name, aggregate_number, i)  # type: ignore
                )

        return new_rules

    def create_aggregate_rule_bounds_and_value_info(
            self,
            literal: ast.Literal,  # type: ignore
            component_nr: int,
            h_literal: ast.Function,  # type: ignore
            wrapper_name: str,
            aggregate_number: int,
            aggregate_value_name: str) -> ast.Rule:  # type: ignore
        loc = literal.location
        component_nr_ast = ast.SymbolicTerm(loc, Number(component_nr))
        variable_tuple = ast.Function(loc, "",
                        collect_variables_in_aggregate(literal.atom), 0)
        aggregate_identifier = ast.Function(loc, wrapper_name,
                                            [ast.SymbolicTerm(loc, Number(aggregate_number)),],
                                            0)
        aggregate_operation = ast.SymbolicTerm(
            loc, Function(stringify_aggregate_function(literal), [], True))
        lower_bound = ast.Function(literal.location,
                                   "lw",
                                   [self.create_guard_literal(literal.location, literal.atom.left_guard)],
                                   0)
        upper_bound = ast.Function(literal.location,
                                   "up",
                                    [self.create_guard_literal(literal.location, literal.atom.right_guard)],
                                    0)
        aggregate_value = ast.Variable(loc, aggregate_value_name)
        return ast.Rule(
            loc,
            ast.Literal(
            loc,
            0,
            ast.SymbolicAtom(
                ast.Function(loc, wrapper_name, [
                    component_nr_ast,
                    variable_tuple,
                    aggregate_identifier,
                    aggregate_operation,
                    lower_bound,
                    upper_bound,
                    aggregate_value
                ], 0)),
            ), [
            h_literal,
            self.create_aggregate_equal_variable(
                literal, aggregate_value_name)
        ])

    def create_aggregate_equal_variable(
            self,
            literal: ast.Literal,  # type: ignore
            aggregate_value: str) -> ast.Function:  # type: ignore
        return ast.Literal(
            literal.location,
            ast.Sign.NoSign,
            ast.BodyAggregate(
                literal.location,
                ast.Guard(5, ast.Variable(literal.location, aggregate_value)),
                literal.atom.function,
                literal.atom.elements,
                None
            ))

    def create_aggregate_element_rule(
        self,
        literal: ast.Literal,  # type: ignore
        element: ast.BodyAggregateElement,  # type: ignore
        component_nr: int,
        h_literal: ast.Function,  # type: ignore
        wrapper_name: str,
        aggregate_number: int,
        aggregate_element_number: int) -> ast.Rule:  # type: ignore
        loc = literal.location
        component_nr_ast = ast.SymbolicTerm(loc, Number(component_nr))
        aggregate_element_number_ast = ast.SymbolicTerm(
            loc, Number(aggregate_element_number))
        variable_tuple = ast.Function(loc, "",
                        collect_variables_in_aggregate(literal.atom), 0)
        aggregate_identifier = ast.Function(loc, wrapper_name,
                                            [ast.SymbolicTerm(loc, Number(aggregate_number)),],
                                            0)
        term = self.create_body_aggregate_term_literal(loc, element)
        conditions = []
        for c in element.condition:
            conditions.append(self.create_pos_neg_reason_literal(c))
        conditions_ast = ast.Function(
            loc, "", conditions, 0)

        return ast.Rule(
            loc,
            ast.Literal(
                loc,
                0,
                ast.SymbolicAtom(
                    ast.Function(
                        loc, wrapper_name, [
                            component_nr_ast,
                            variable_tuple,
                            aggregate_identifier,
                            aggregate_element_number_ast,
                            term,
                            conditions_ast
                        ], 0)
                )
            ), [
                h_literal,
                *[c for c in element.condition]
            ]
        )

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


def collect_variables(
        ast: Union[AST, ASTSequence]) -> List[ast.Variable]:  # type: ignore
    """
    Collects all variables in a literal.
    """
    visitor = VariablesCollector()
    variables = []
    if isinstance(ast, ASTSequence):
        visitor.visit_sequence(ast, variables=variables)
    else:
        visitor.visit(ast, variables=variables)

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

def string_tuple_of_variables_in_aggregate(
        aggregate: ast.BodyAggregate) -> str:  # type: ignore
    visitor = AggregateVariablesCollector()
    variables = []
    visitor.visit(aggregate, variables=variables)

    # remove duplicates while keeping order
    seen: Set[ast.Variable] = set()  # type: ignore
    variables = [x for x in variables if not (x in seen or seen.add(x))]
    stringify = [str(x) for x in variables]
    if len(stringify) == 1:
        return "(" + stringify[0] + ",)"
    else:
        return "(" + ", ".join(stringify) + ")"

def stringify_aggregate_function(
        literal: ast.Literal) -> str:  # type: ignore
    function = literal.atom.function
    if function == ast.AggregateFunction.Count:
        return "count"
    elif function == ast.AggregateFunction.Max:
        return "max"
    elif function == ast.AggregateFunction.Min:
        return "min"
    elif function == ast.AggregateFunction.Sum:
        return "sum"
    elif function == ast.AggregateFunction.SumPlus:
        return "sum+"
    else:
        return "unknown"
