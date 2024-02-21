"""Mostly graph utility functions."""
import networkx as nx
from clingo import Symbol, ast
from clingo.ast import ASTType, AST
from typing import Generator, List, Sequence, Tuple, Dict, Set, FrozenSet, Optional
from ..shared.simple_logging import warn
from ..shared.model import Node, SymbolIdentifier
from ..shared.util import pairwise, get_root_node_from_graph


def is_constraint(rule: AST) -> bool:
    return rule.ast_type == ASTType.Rule and "atom" in rule.head.child_keys and rule.head.atom.ast_type == ASTType.BooleanConstant  # type: ignore


def merge_constraints(g: nx.DiGraph) -> nx.DiGraph:
    mapping = {}
    constraints = frozenset([
        ruleset for ruleset in g.nodes for rule in ruleset
        if is_constraint(rule)
    ])
    if constraints:
        merge_node = merge_nodes(constraints)
        mapping = {c: merge_node for c in constraints}
    return nx.relabel_nodes(g, mapping)


def merge_cycles(g: nx.DiGraph) -> Tuple[nx.DiGraph, FrozenSet[AST]]:
    mapping: Dict[AST, AST] = {}
    merge_node: FrozenSet[AST] = frozenset()
    where_recursion_happens = set()
    for cycle in nx.algorithms.components.strongly_connected_components(g):
        merge_node = merge_nodes(cycle)
        mapping.update({old_node: merge_node for old_node in cycle})
    # which nodes were merged
    for k, v in mapping.items():
        if k != v:
            where_recursion_happens.add(merge_node)
    return nx.relabel_nodes(g, mapping), frozenset(where_recursion_happens)


def merge_nodes(nodes: frozenset) -> FrozenSet[AST]:
    old = set()
    for x in nodes:
        old.update(x)
    return frozenset(old)


def remove_loops(g: nx.DiGraph) -> Tuple[nx.DiGraph, FrozenSet[AST]]:
    remove_edges: List[Tuple[AST, AST]] = []
    where_recursion_happens: Set[AST] = set()
    for edge in g.edges:
        u, v = edge
        if u == v:
            remove_edges.append(edge)
            # info on which node's loop is removed
            where_recursion_happens.add(u)

    for edge in remove_edges:
        g.remove_edge(*edge)
    return g, frozenset(where_recursion_happens)


def rank_topological_sorts(all_sorts: Generator, rules: Sequence[AST]) -> List:
    """ 
    Ranks all topological sorts by the number of rules that are in the same order as in the rules list.
    The highest rank is the first element in the list.

    :param all_sorts: List of all topological sorts
    :param rules: List of rules
    """
    ranked_sorts = []
    all_sortss = list(all_sorts)
    print(f"There are {len(all_sortss)} topological sorts.")
    for sort in all_sortss:
        rank = 0
        sort_rules = [rule for frznst in sort for rule in frznst]
        for i in range(len(sort_rules)):
            rank -= (rules.index(sort_rules[i]) + 1) * (i + 1)
        ranked_sorts.append((sort, rank))
        # if len(ranked_sorts)>0:
        #     break
    ranked_sorts.sort(key=lambda x: x[1])
    return [x[0] for x in ranked_sorts]


def insert_atoms_into_nodes(path: List[Node]) -> None:
    facts = path[0]
    state = set(facts.diff)
    facts.atoms = frozenset(state)
    state = set(map(SymbolIdentifier, (s.symbol for s in state)))
    for u, v in pairwise(path):
        state.update(v.diff)
        state.update(u.diff)
        v.atoms = frozenset(state)
        state = set(map(SymbolIdentifier, (s.symbol for s in state)))


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
            for new, rr in v.reason.items():
                tmp_reason = []
                for r in rr:
                    tmp_reason.append(get_identifiable_reason(g, v, r))
                v.reason[str(new)] = tmp_reason
            if v.recursive:
                for node in v.recursive.nodes:
                    for new, rr in node.reason.items():
                        tmp_reason = []
                        for r in rr:
                            tmp_reason.append(
                                get_identifiable_reason(v.recursive,
                                                        node,
                                                        r,
                                                        super_graph=g,
                                                        super_node=v))
                        node.reason[str(new)] = tmp_reason
            for s in v.diff:
                if str(s.symbol) in v.reason.keys() and len(v.reason[str(
                        s.symbol)]) > 0:
                    s.has_reason = True
            searched_nodes.add(v)
            for w in g.successors(v):
                children_next.add(w)
            children_next = children_next.difference(searched_nodes)
        children_current = list(children_next)


def get_identifiable_reason(g: nx.DiGraph,
                            v: Node,
                            r: Symbol,
                            super_graph=None,
                            super_node=None) -> Optional[SymbolIdentifier]:
    """
    Returns the SymbolIdentifier that is the reason for the given Symbol r.
    If the reason is not in the node, it returns recursively calls itself with the predecessor.
    
    
    :param g: The graph that contains the nodes
    :param v: The node that contains the symbol r
    :param r: The symbol that is the reason
    """
    if (r in v.diff): return next(s for s in v.atoms if s == r)
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
            for rule in node:
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

