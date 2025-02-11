============
How it Works
============

viASP's backend generates the graph based on  

1. The input program
2. The marked stable models

The steps taken for generating the graph can be broken down in to two parts: first, the program is first sorted, then associated the atoms of the stable model with the rules they are derived by.

Sorting the program
===================

The input program is sorted by the viASP server. The program is received through the api calls ``load_program_file`` or ``load_program_string``. They reach the ``/control/add_call`` endpoint, which stores the program in the server database.

Once the ``show`` command is called, all program strings loaded in this session are retrieved from the database. The programs are then sorted by the server.

Every rule in the program becomes a node in the dependency graph. Dependents and conditions are analyzed to create edges between the nodes. 
Some processing on graph removes loops and cycles, and collects integrity constraints into a node. The rules in the loops or cycles are combined and marked to become a recursive component in the final graph.
When topologically sorted, the rules are ordered in a way so that rules that depend on other rules are placed after the rules they depend on.

The sorted program may be queried from the server using the ``/graph/sorted_progam`` endpoint.

Graph Generation
================

The justifier program is used to find out which rules are responsible for the atoms in the stable model. A justifier program is genertated by the ``ProgramReifier`` Transformer class using the sorted program.

From every rule in the sorted program, a justifier rule is generated 

.. code-block:: 

    # input rule
    d1 :- r1, ..., rl.

    # justifier rule
    h(I, d1, (r1, ..., rl)) :– d1, r1, ..., rl.


The justifier rule connects the atom ``d1`` in the head of an input rule to the index ``I`` of the rule that derives it due to the reasons ``r1, ..., rl``. 

.. admonition:: Example

    For example, the rule

    .. code-block:: 

        reached(V) :- reached(U), hc(U,V).

    is transformed into

    .. code-block:: 

        h(1, reached(V), (reached(U), hc(U,V))) :- reached(V), reached(U), hc(U,V).

The justifier program is loaded in a clingo Control instance and combined with the stable model. Grounding yields the ``h`` symbolic atoms, which can be queried from the Control object. The grounding is repeated for every stable model.

.. An in depth explanation of the justifier program including the edge cases is given at another place.

.. Parts of the flask server
.. =========================