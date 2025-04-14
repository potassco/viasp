"""Mostly graph utility functions."""
import networkx as nx
from clingo import Symbol, ast
from clingo.ast import ASTType, AST, Transformer, ASTSequence
from typing import List, Sequence, Collection, Tuple, Dict, Set, FrozenSet, Optional, Iterable, Any
import re

from ..shared.simple_logging import warn
from ..shared.model import Node, ReasonSymbolIdentifier, SymbolIdentifier, Transformation, RuleContainer
from ..shared.util import pairwise, get_root_node_from_graph, RuleType

def is_constraint(rule: RuleType) -> bool:
    return rule.ast_type == ASTType.Rule and "atom" in rule.head.child_keys and rule.head.atom.ast_type == ASTType.BooleanConstant  # type: ignore

def is_minimize(rule: RuleType) -> bool:
    return rule.ast_type == ASTType.Minimize  # type: ignore

def merge_constraints(g: nx.DiGraph) -> nx.DiGraph:
    mapping = {}
    constraints = set([
        ruleset for ruleset in g.nodes for rule in ruleset.ast
        if is_constraint(rule)
    ])
    if constraints:
        merge_node = merge_rule_container(constraints)
        mapping = {c: merge_node for c in constraints}
    return nx.relabel_nodes(g, mapping)


def merge_cycles(g: nx.DiGraph) -> Tuple[nx.DiGraph, FrozenSet[RuleContainer]]:
    mapping: Dict[AST, AST] = {}
    merge_node: RuleContainer
    where_recursion_happens = set()
    for cycle in nx.algorithms.components.strongly_connected_components(g):
        merge_node = merge_rule_container(cycle)
        mapping.update({old_node: merge_node for old_node in cycle})
    # which nodes were merged
    for k, v in mapping.items():
        if k != v:
            where_recursion_happens.add(merge_node)
    return nx.relabel_nodes(g, mapping), frozenset(where_recursion_happens)


def merge_rule_container(set: Collection[RuleContainer]) -> RuleContainer:
    ast = []
    str_ = []
    for rule_container in set:
        ast.extend(rule_container.ast)
        str_.extend(rule_container.str_)
    return RuleContainer(ast=tuple(ast), str_=tuple(str_))


def remove_loops(g: nx.DiGraph) -> Tuple[nx.DiGraph, FrozenSet[RuleContainer]]:
    remove_edges: List[Tuple[AST, AST]] = []
    where_recursion_happens: Set[RuleContainer] = set()
    for edge in g.edges:
        u, v = edge
        if u == v:
            remove_edges.append(edge)
            # info on which node's loop is removed
            where_recursion_happens.add(u)

    for edge in remove_edges:
        g.remove_edge(*edge)
    return g, frozenset(where_recursion_happens)

def move_constraints_only_transformations_to_end(sorted_program: List[RuleContainer]) -> None:
    constraints_only_rules = set()
    for rc in sorted_program:
        if all(is_constraint(r) for r in rc.ast):
            sorted_program.remove(rc)
            constraints_only_rules.add(rc)
    for constraint_rule in constraints_only_rules:
        sorted_program.append(constraint_rule)


def insert_atoms_into_nodes(path: List[Node]) -> None:
    if not path:
        return
    facts = path[0]
    state = set(facts.diff)
    facts.atoms = frozenset(state)
    state = set(map(SymbolIdentifier, (s.symbol for s in state)))
    for u, v in pairwise(path):
        state.update(v.diff)
        state.update(u.diff)
        v.atoms = frozenset(state)
        state = set(map(SymbolIdentifier, (s.symbol for s in state)))


class VariablesCollector(Transformer):

    def visit_Variable(
            self,
            variable: ast.Variable,  # type: ignore
            **kwargs: Any) -> AST:
        variables: List[AST] = kwargs.get("variables", [])
        variables.append(variable)
        return variable.update(**self.visit_children(variable, **kwargs))


def collect_variables_in_comparison(
        comparison: ast.Comparison) -> List[ast.Variable]:  # type: ignore
    """
    Collects all variables in a literal.
    """
    visitor = VariablesCollector()
    variables = []
    visitor.visit(comparison, variables=variables)
    return variables


def create_pos_neg_reason_literal(literal: ast.Literal) -> ast.Function:  # type: ignore
    if literal.sign == ast.Sign.Negation:
        wrapper_name = "neg"
    elif literal.sign == ast.Sign.DoubleNegation:
        wrapper_name = "double_neg"
    else:
        wrapper_name = "pos"
    return ast.Function(literal.location, wrapper_name,
        [literal.atom], False)


def create_comparison_literal(literal: ast.Literal) -> ast.Function:  # type: ignore
    stringified = ast.Function(literal.location, '"' + str(literal.atom) + '"', [], False)
    list_of_variable_ident_tuples = []
    for var in collect_variables_in_comparison(literal.atom):
        variable_string = ast.Function(literal.location, '"' + str(var.name) + '"', [], False)
        variable_value = var
        list_of_variable_ident_tuples.append(ast.Function(
            literal.location, "", [variable_string, variable_value], False))

    variables = ast.Function(literal.location, "", list_of_variable_ident_tuples, False)
    return ast.Function(literal.location, "comp",
            [variables, stringified], False)


def transform_condition_literal_to_reason_literal(literal: ast.Literal, reasons: List[ast.Literal]) -> None:  # type: ignore
    if not (hasattr(literal, "sign") and hasattr(literal, "atom")
            and hasattr(literal.atom, "ast_type")):
        return
    if literal.atom.ast_type == ASTType.SymbolicAtom:
        reasons.append(create_pos_neg_reason_literal(literal))
    if literal.atom.ast_type == ASTType.Comparison:
        reasons.append(create_comparison_literal(literal))

def iterate_positive_reasons(reasons: List[Symbol]) -> Iterable[Symbol]:
    for reason in reasons:
        if reason.name == "pos":
            yield reason.arguments[0]


def iterate_negative_reasons(reasons: List[Symbol]) -> Iterable[Symbol]:
    for reason in reasons:
        if reason.name == "neg":
            yield reason

def is_positive_reason(reason: Symbol) -> bool:
    if reason.name == "pos":
        return True
    return False

def is_negative_reason(reason: Symbol) -> bool:
    return not is_positive_reason(reason)

def stringify_reason(reason: Symbol) -> str:
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


def transform_reason_symbol_to_identifier(
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
        reason_repr = stringify_reason(reason_symbol)
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
                    tmp_reasons.append(transform_reason_symbol_to_identifier(reason.symbol, g, v))
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
            return get_identifiable_reason(
                g, u, r, super_graph=super_graph, super_node=super_node)
    if (super_graph != None and super_node != None):
        return get_identifiable_reason(super_graph, super_node, r)

    # stop criterion: v is the root node and there is no super_graph
    warn(f"An explanation could not be made")
    return None

def calculate_spacing_factor(g: nx.DiGraph) -> None:
    """
    Calculate the spacing factor for each node the graph.
    This will make sure the branches of the graph are spaced out evenly.

    :param g: The graph.
    """
    # get fact node:
    root_node = get_root_node_from_graph(g)

    # go through entire graph, starting at root_node and traveling down the graph via successors
    children_next = []
    searched_nodes = set()
    children_current = [root_node]
    while len(children_current) != 0:
        for v in children_current:
            successors: List[Node] = list(g.successors(v))
            if len(successors) != 0:
                for w in successors:
                    w.space_multiplier = v.space_multiplier / len(successors)

            searched_nodes.add(v)
            for w in g.successors(v):
                children_next.append(w)
        children_current = children_next
        children_next = []


def topological_sort(g: nx.DiGraph, rules: Sequence[ast.Rule]) -> List:  # type: ignore
    """ Topological sort of the graph.
        If the order is ambiguous, prefer the order of the rules.
        Note: Rule = Node

        :param g: Graph
        :param rules: List of Rules
    """
    sorted: List = []  # L list of the sorted elements
    no_incoming_edge = set()  # set of all nodes with no incoming edges

    no_incoming_edge.update(
        [node for node in g.nodes if g.in_degree(node) == 0])
    while len(no_incoming_edge):
        earliest_node_index = len(rules)
        earliest_node = None
        for node in no_incoming_edge:
            for rule in node.ast:
                node_index = rules.index(rule)
                if node_index < earliest_node_index:
                    earliest_node_index = node_index
                    earliest_node = node

        no_incoming_edge.remove(earliest_node)
        sorted.append(earliest_node)

        # update graph
        for node in list(g.successors(earliest_node)):
            g.remove_edge(earliest_node, node)
            if g.in_degree(node) == 0:
                no_incoming_edge.add(node)

    if len(g.edges):
        warn("Could not sort the graph.")
        raise Exception("Could not sort the graph.")
    return sorted


def find_index_mapping_for_adjacent_topological_sorts(
    g: nx.DiGraph,
    sorted_program: List[RuleContainer]) -> Dict[int, Dict[str, int]]:
    new_indices: Dict[int, Dict[str, int]] = {}
    for i, rule_container in enumerate(sorted_program):
        lower_bound = max([sorted_program.index(u) for u in g.predecessors(rule_container)]+[-1])
        upper_bound = min([sorted_program.index(u) for u in g.successors(rule_container)]+[len(sorted_program)])
        new_indices[i] = {"lower_bound": lower_bound+1, "upper_bound": upper_bound-1}
    return new_indices


def recalculate_transformation_ids(sort: List[Transformation]):
    for i, transformation in enumerate(sort):
        transformation.id = i


def filter_body_aggregates(element: AST):
    aggregate_types = [
        ASTType.Aggregate, ASTType.BodyAggregate, ASTType.ConditionalLiteral
    ]
    if (element.ast_type in aggregate_types):
        return False
    if (getattr(getattr(element, "atom", None), "ast_type", None)
            in aggregate_types):
        return False
    return True

class VariableConflictResolver(Transformer):

    def __init__(self, *args, **kwargs):
        self.counter = 1
        self.conflict_free_anon_str = kwargs.get("conflict_free_anon_str",
                                                 "_A")

    def visit_Variable(self, variable: ast.Variable, **kwargs) -> None:  # type: ignore
        if variable.name == "_":
            variable.name = self.conflict_free_anon_str + str(self.counter)
            self.counter += 1
        return variable.update(**self.visit_children(variable, **kwargs))

class FindConflictFreeAnonVariableName(Transformer):

    def __init__(self, *args, **kwargs):
        self.names = set()

    def visit_Variable(self, variable: ast.Variable, **kwargs) -> None:  # type: ignore
        self.names.add(variable.name)
        return variable.update(**self.visit_children(variable, **kwargs))

    def get_conflict_free_anon_replacement(self) -> str:
        """
        Get a conflict free variable name.
        """
        sentinel = -1
        for i in range(100):
            name = "_"* i + "_A"
            search = re.compile(fr"^{name}(\d+)$")
            if next(filter(search.match, self.names), sentinel) is sentinel:
                return name
        raise ValueError("Could not find a conflict free variable name")


def replace_anon_variables(
        literals: ASTSequence,
        context: AST) -> None:
    name_finder = FindConflictFreeAnonVariableName()
    name_finder.visit(context)
    conflict_free_anon_str = name_finder.get_conflict_free_anon_replacement()

    visitor = VariableConflictResolver(
        conflict_free_anon_str=conflict_free_anon_str)
    visitor.visit_sequence(literals)
