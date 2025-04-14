import ast
from re import L
from typing import List, cast

import clingo
from clingo.ast import AST, ASTType, parse_string
from clingo import Symbol, Control

from viasp.shared.util import hash_string, get_ast_from_input_string
from viasp.asp.utils import transform_reason_symbol_to_identifier

def string_to_clingo_symbol(s: str) -> Symbol:
    """
    Convert a string to a clingo symbol.
    """
    ctl = Control()
    ctl.add("base", [], s)
    ctl.ground([("base", [])])
    signature = ctl.symbolic_atoms.signatures[0]
    return next(ctl.symbolic_atoms.by_signature(*signature)).symbol

def transform(s: str) -> str:
    """
    Transform a string to its reason detail representation.
    """
    clingo_symbol = string_to_clingo_symbol(s)
    reason_identifier = transform_reason_symbol_to_identifier(clingo_symbol)
    return reason_identifier.symbol_repr

def test_simple_positive():
    symbol = 'pos(a).'
    expected = 'a'
    assert transform(symbol) == expected


def test_simple_negative():
    symbol = 'neg(a).'
    expected = 'not a'
    assert transform(symbol) == expected

def test_double_negative():
    symbol = 'double_neg(a).'
    expected = 'not not a'
    assert transform(symbol) == expected

def test_complex():
    symbol = 'neg(complex(a(asdf),b(1,123),c(f(1,2),d))).'
    expected = 'not complex(a(asdf),b(1,123),c(f(1,2),d))'
    assert transform(symbol) == expected

def test_comparison_1():
    symbol = 'comp((("X",1),), "X=(1..3)").'
    expected = '1=(1..3)'
    assert transform(symbol) == expected


def test_comparison_2():
    symbol = 'comp((("X",1),("YX", 2)), "X=YX-1").'
    expected = '1=2-1'
    assert transform(symbol) == expected

def test_comparison_3():
    symbol = 'comp((("X",1),("YX", 3)), "X<YX-1").'
    expected = '1<3-1'
    assert transform(symbol) == expected

def test_comparison_4():
    symbol = 'comp((("X",d(f)),("YX", (3,))), "YX>X-1").'
    expected = '(3,)>d(f)-1'
    assert transform(symbol) == expected

def test_comparison_5():
    symbol = 'comp((("X",(1,2)),("Y",1),("_A2",2)),"X = (Y,_A2)").'
    expected = '(1,2) = (1,2)'
    assert transform(symbol) == expected
