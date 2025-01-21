from viasp.asp.reify import ProgramAnalyzer
from viasp.shared.model import RuleContainer

def test_topological_sort(app_context):
    rules = ["{b(X)} :- a(X).", "c(X) :- a(X)."]
    rules_container = [RuleContainer(str_=tuple([r])) for r in rules]

    a = ProgramAnalyzer()
    a.add_program(['\n'.join(rules)])
    sorted = a.get_sorted_program()
    assert len(sorted) == len(rules)
    for i in range(len(rules)):
        assert sorted[i].rules == rules_container[i]


def test_topological_sort_2(app_context):
    rules = ["x:-y.",
             "e:-x.",
             "z:-x.",
             "d:-z.",
             "a:-x,z.",
             "b:-z.",
             "c:-b,a."]
    rules_container = [RuleContainer(str_=tuple([r])) for r in rules]

    a = ProgramAnalyzer()
    a.add_program(['\n'.join(rules)])
    sorted = a.get_sorted_program()
    assert len(sorted) == len(rules)
    for i in range(len(rules)):
        assert sorted[i].rules == rules_container[i]

def test_adjacent_sorts(app_context):
    rules = ["{b(X)} :- a(X).", "c(X) :- a(X)."]
    a = ProgramAnalyzer()
    a.add_program(['\n'.join(rules)])
    sorted = a.get_sorted_program()

    adjacent_sorts = a.get_index_mapping_for_adjacent_topological_sorts([t.rules for t in sorted])
    assert len(adjacent_sorts.keys()) == 2
    assert adjacent_sorts[0]["lower_bound"] == 0
    assert adjacent_sorts[0]["upper_bound"] == 1
    assert adjacent_sorts[1]["lower_bound"] == 0
    assert adjacent_sorts[1]["upper_bound"] == 1

def test_adjacent_sorts_2(app_context):
    rules = ["x:-y.",
             "e:-x.",
             "z:-x.",
             "d:-z.",
             "a:-x,z.",
             "b:-z.",
             "c:-b,a."]
    a = ProgramAnalyzer()
    a.add_program(['\n'.join(rules)])
    sorted = a.get_sorted_program()

    adjacent_sorts = a.get_index_mapping_for_adjacent_topological_sorts([t.rules for t in sorted])
    assert len(adjacent_sorts) == 7
    assert list(adjacent_sorts[0].values()) == [0,0]
    assert list(adjacent_sorts[1].values()) == [1,6]
    assert list(adjacent_sorts[2].values()) == [1,2]
    assert list(adjacent_sorts[3].values()) == [3,6]
    assert list(adjacent_sorts[4].values()) == [3,5]
    assert list(adjacent_sorts[5].values()) == [3,5]
    assert list(adjacent_sorts[6].values()) == [6,6]
