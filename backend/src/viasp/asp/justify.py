"""This module is concerned with finding reasons for why a stable model is found."""
from collections import defaultdict
from logging import warning
from typing import List, Collection, Dict, Iterable, Union, Set, Tuple

import networkx as nx

from clingo import Control, Symbol, Model

from clingo.ast import AST, ASTType

from .reify import ProgramAnalyzer, reify_recursion_transformation, LiteralWrapper
from .recursion import RecursionReasoner
from .utils import insert_atoms_into_nodes, identify_reasons, calculate_spacing_factor, is_constraint, is_minimize
from ..shared.model import Node, RuleContainer, Transformation, SymbolIdentifier, SearchResultSymbolWrapper
from ..shared.simple_logging import info
from ..shared.util import pairwise, get_leafs_from_graph


def stringify_fact(fact: Symbol) -> str:
    return f"{str(fact)}."


def get_h_symbols_from_model(wrapped_stable_model: Iterable[str],
                             transformed_prg: Collection[Union[str, AST]],
                             facts: List[Symbol],
                             constants: List[str],
                             h="h",
                             h_showTerm="h_showTerm",
                             show_all_derived: bool = False) -> List[Symbol]:
    rules_that_are_reasons_why = []
    ctl = Control()
    stringified = "\n".join(map(str, transformed_prg))
    new_head = f"_{h}"
    if show_all_derived:
        get_new_atoms_rule = f"{new_head}(I, J, H, G) :- {h}(I, J, H, G)."
    else:
        get_new_atoms_rule = f"{new_head}(I, J, H, G) :- {h}(I, J, H, G), not {h}(II,_,H,_) : II<I, {h}(II,_,_,_)."
    ctl.add("base", [], "".join(constants))
    ctl.add("base", [], "".join(map(stringify_fact, facts)))
    ctl.add("base", [], stringified)
    ctl.add("base", [], "".join(map(str, wrapped_stable_model)))
    ctl.add("base", [], get_new_atoms_rule)
    ctl.ground([("base", [])])
    for x in ctl.symbolic_atoms.by_signature(new_head, 4):
        if x.symbol.arguments[2] in facts:
            continue
        rules_that_are_reasons_why.append(x.symbol)
    for x in ctl.symbolic_atoms.by_signature(h_showTerm, 4):
        rules_that_are_reasons_why.append(x.symbol)
    return rules_that_are_reasons_why


def get_facts(original_program) -> Collection[Symbol]:
    ctl = Control()
    facts = set()
    as_string = "".join(map(str, original_program))
    ctl.add("__facts", [], as_string)
    ctl.ground([("__facts", [])])
    for atom in ctl.symbolic_atoms:
        if atom.is_fact:
            facts.add(atom.symbol)
    return frozenset(facts)


def collect_h_symbols_and_create_nodes(
    h_symbols: Collection[Symbol],
    rule_mapping: Dict[int, Transformation],
    pad: bool,
    supernode_symbols: frozenset = frozenset([])) -> List[Node]:
    tmp_symbol: Dict[int, List[Symbol]] = defaultdict(list)
    tmp_symbol_identifier: Dict[int, List[SymbolIdentifier]] = defaultdict(list)
    tmp_reason: Dict[int, Dict[str, List[Symbol]]] = defaultdict(dict)
    tmp_reason_rules: Dict[int, Dict[str, str]] = defaultdict(dict)
    for sym in h_symbols:
        component_nr, rule_hash, symbol, reasons = sym.arguments
        tmp_symbol[component_nr.number].append(symbol)
        tmp_reason[component_nr.number][str(symbol)] = reasons.arguments
        tmp_reason_rules[component_nr.number][str(symbol)] = rule_hash.string
    for component_nr in tmp_symbol.keys():
        tmp_symbol[component_nr] = list(tmp_symbol[component_nr])
        tmp_symbol_identifier[component_nr] = list(map(lambda symbol: next(filter(
        lambda supernode_symbol: supernode_symbol==symbol, supernode_symbols)) if
        symbol in supernode_symbols else
        SymbolIdentifier(symbol),tmp_symbol[component_nr]))
    if pad:
        h_nodes: List[Node] = [
            Node(diff=frozenset(tmp_symbol_identifier[component_nr]),
                 rule_nr=component_nr,
                 reason=tmp_reason[component_nr],
                 reason_rules=tmp_reason_rules[component_nr])
            if component_nr in tmp_symbol else Node(frozenset(), component_nr)
            for component_nr in rule_mapping.keys()
        ]
    else:
        h_nodes: List[Node] = [
            Node(diff=frozenset(tmp_symbol_identifier[component_nr]),
                 rule_nr=component_nr,
                 reason=tmp_reason[component_nr],
                 reason_rules=tmp_reason_rules[component_nr])
            if component_nr in tmp_symbol else Node(frozenset(), component_nr)
            for component_nr in range(1,
                                      max(tmp_symbol.keys(), default=-1) + 1)
        ]

    return h_nodes


def make_reason_path_from_facts_to_stable_model(rule_mapping: Dict[int, Transformation],
                                            fact_node: Node,
                                            h_symbols: List[Symbol],
                                            recursive_transformations_hashes: Set[str],
                                            h="h",
                                            analyzer: ProgramAnalyzer = ProgramAnalyzer(),
                                            pad=True) \
                                            -> nx.DiGraph:
    h_syms: List[Node] = collect_h_symbols_and_create_nodes(
        h_symbols, rule_mapping, pad)
    h_syms.sort(key=lambda node: node.rule_nr)
    h_syms.insert(0, fact_node)

    insert_atoms_into_nodes(h_syms)
    g = nx.DiGraph()
    if len(h_syms) == 1:
        # If there is a stable model that is exactly the same as the facts.
        g.add_edge(fact_node,
                   Node(frozenset(), min(rule_mapping.keys()),
                        frozenset(fact_node.diff)),
                   transformation=rule_mapping[min(rule_mapping.keys())])
        return g

    for a, b in pairwise(h_syms):
        if rule_mapping[b.rule_nr].hash in recursive_transformations_hashes:
            b.recursive = get_recursion_subgraph(a.atoms, b.diff,
                                                 rule_mapping[b.rule_nr], h,
                                                 analyzer)
        g.add_edge(a, b, transformation=rule_mapping[b.rule_nr])

    return g


def join_paths_with_facts(paths: Collection[nx.DiGraph]) -> nx.DiGraph:
    combined = nx.DiGraph()
    for path in paths:
        combined.add_nodes_from(path.nodes(data=True))
        combined.add_edges_from(path.edges(data=True))
    return combined


def make_transformation_mapping(transformations: Iterable[Transformation]):
    return {t.id: t for t in transformations}


def remove_non_node_transformations(sorted_program: List[Transformation]) -> List[Transformation]:
    not_constraints_or_minimize = []
    for t in sorted_program:
        is_constraint_only = all(is_constraint(r) for r in t.rules.ast)
        is_minimize_only = all(is_minimize(r) for r in t.rules.ast)
        if not is_constraint_only and not is_minimize_only:
            not_constraints_or_minimize.append(t)
    return not_constraints_or_minimize


def append_noops(result_graph: nx.DiGraph,
                 sorted_program: Iterable[Transformation],
                 pass_through: Set[AST]):
    next_transformation_id = max(t.id for t in sorted_program) + 1
    leaves = list(get_leafs_from_graph(result_graph))
    leaf: Node
    for leaf in leaves:
        noop_node = Node(frozenset(), next_transformation_id, leaf.atoms)
        result_graph.add_edge(leaf,
                              noop_node,
                              transformation=Transformation(
                                  next_transformation_id, RuleContainer(ast=tuple(pass_through))))


def build_graph(wrapped_stable_models: List[List[str]],
                transformed_prg: Collection[AST],
                sorted_program: List[Transformation],
                analyzer: ProgramAnalyzer,
                recursion_transformations_hashes: Set[str],
                commandline_constants: Dict[str,str],
                show_all_derived: bool = False) -> nx.DiGraph:

    paths: List[nx.DiGraph] = []
    facts = analyzer.get_facts(commandline_constants)
    conflict_free_h = analyzer.get_conflict_free_h()
    conflict_free_h_showTerm = analyzer.get_conflict_free_h_showTerm()
    identifiable_facts = list(map(SymbolIdentifier, facts))
    sorted_program_no_constraints = remove_non_node_transformations(sorted_program)
    mapping = make_transformation_mapping(sorted_program_no_constraints)
    fact_node = Node(frozenset(identifiable_facts), -1,
                     frozenset(identifiable_facts))
    if not len(mapping):
        info(f"Program only contains facts. {fact_node}")
        single_node_graph = nx.DiGraph()
        single_node_graph.add_node(fact_node)
        return single_node_graph
    for model in wrapped_stable_models:
        h_symbols = get_h_symbols_from_model(model, transformed_prg, facts,
                                             analyzer.get_constants(),
                                             conflict_free_h,
                                             conflict_free_h_showTerm,
                                             show_all_derived)
        new_path = make_reason_path_from_facts_to_stable_model(
            mapping, fact_node, h_symbols, recursion_transformations_hashes,
            conflict_free_h, analyzer)
        paths.append(new_path)

    result_graph = nx.DiGraph()
    result_graph.update(join_paths_with_facts(paths))
    if analyzer.pass_through:
        append_noops(result_graph, sorted_program, analyzer.pass_through)
    calculate_spacing_factor(result_graph)
    identify_reasons(result_graph)
    return result_graph


def save_model(model: Model) -> Collection[str]:
    wrapped = []
    for part in model.symbols(atoms=True):
        wrapped.append(f"{part}.")
    return wrapped


def filter_body_aggregates(element: AST):
    aggregate_types = [ASTType.Aggregate, ASTType.BodyAggregate, ASTType.ConditionalLiteral]
    if (element.ast_type in aggregate_types):
        return False
    if (getattr(getattr(element, "atom", None), "ast_type",None) in aggregate_types):
        return False
    return True


def get_recursion_subgraph(
        facts: frozenset, supernode_symbols: frozenset,
        transformation: Transformation, conflict_free_h: str,
        analyzer: ProgramAnalyzer) -> List[Node]:
    """
    Get a recursion explanation for the given facts and the recursive transformation.
    Generate graph from explanation, sorted by the iteration step number.

    :param facts: The symbols that were true before the recursive node.
    :param supernode_symbols: The SymbolIdentifiers of the recursive node.
    :param transformation: The recursive transformation. An ast object.
    :param conflict_free_h: The name of the h predicate.
    """
    init = [fact.symbol for fact in facts]
    justification_program = ""
    model_str: str = analyzer.get_conflict_free_model(
    ) if analyzer else "model"
    n_str: str = analyzer.get_conflict_free_iterindex() if analyzer else "n"

    justifier_rules = reify_recursion_transformation(
        transformation,
        h_str=analyzer.get_conflict_free_h(),
        h_showTerm_str=analyzer.get_conflict_free_h_showTerm(),
        model_str=analyzer.get_conflict_free_model(),
        conflict_free_showTerm_str=analyzer.get_conflict_free_showTerm(),
        get_conflict_free_variable_str=analyzer.get_conflict_free_variable,
        clear_temp_names=analyzer.clear_temp_names,
        conflict_free_model_str=analyzer.get_conflict_free_model(),
        conflict_free_iterindex_str=analyzer.get_conflict_free_iterindex(),
        conflict_free_derivable_str=analyzer.get_conflict_free_derivable())
    justification_program += "\n".join(map(str, justifier_rules))
    justification_program += f"\n{model_str}(@new())."

    h_syms = set()

    try:
        RecursionReasoner(init=init,
                          derivables=supernode_symbols,
                          program=justification_program,
                          callback=h_syms.add,
                          conflict_free_h=conflict_free_h,
                          conflict_free_n=n_str).main()
    except RuntimeError:
        warning(f"Could not analyze recursion for {transformation.rules}")
        return []

    h_syms = collect_h_symbols_and_create_nodes(
        h_syms,
        rule_mapping={-1: transformation},
        pad=False,
        supernode_symbols=supernode_symbols)
    if len(h_syms) == 1:
        return []
    h_syms.sort(key=lambda node: node.rule_nr)
    insert_atoms_into_nodes(h_syms)

    return h_syms

def index_of_symbolstr_in_results(results: List[SearchResultSymbolWrapper], symbol_str: str) -> int:
    for i, result in enumerate(results):
        if result.repr == symbol_str:
            return i
    return -1

def search_nonground_term_in_symbols(query, db_graph_symbols):
    model_atoms: List[str] = []
    symbol_uuid_str: str = "SYMBOLUUID"
    branch_position_str: str = "BRANCHPOSITION"
    results: List[SearchResultSymbolWrapper] = []
    unsorted_results: Dict[str,List[Tuple[str, float]]] = dict()
    for s, branch_position in db_graph_symbols:
        model_atoms.append(f'model({s.symbol}, "{s.symbol_uuid}", "{branch_position}").')

    control = Control()
    query_rule = f'result({query},{symbol_uuid_str}, {branch_position_str}):-model({query},{symbol_uuid_str},{branch_position_str}).'
    try:
        control.add("base", [], query_rule)
        control.add("base", [], "\n".join(model_atoms))
        control.ground([("base", [])])

        for x in control.symbolic_atoms.by_signature("result", 3):
            if str(x.symbol.arguments[0]) in unsorted_results:
                unsorted_results[str(x.symbol.arguments[0])].append((str(x.symbol.arguments[1].string), float(x.symbol.arguments[2].string)))
            else:
                unsorted_results[str(x.symbol.arguments[0])] = [(str(x.symbol.arguments[1].string), float(x.symbol.arguments[2].string))]

    except RuntimeError:
        return [
            SearchResultSymbolWrapper(
                repr=query,
                includes=[],
                is_autocomplete=False,
                awaiting_input=True,
                hide_in_suggestions=True,
            )
        ]
    for symbol_str, symbol_and_branch_position in unsorted_results.items():
        symbol_and_branch_position.sort(key=lambda x: x[1])
        results.append(SearchResultSymbolWrapper(
            repr = symbol_str,
            includes = [x for x,_ in symbol_and_branch_position],
            is_autocomplete = False,
            awaiting_input = False,
        ))

    return results if len(results) else [SearchResultSymbolWrapper(
        repr = query,
        includes = [],
        is_autocomplete = False,
        awaiting_input = False,
        hide_in_suggestions=True,
    )]
