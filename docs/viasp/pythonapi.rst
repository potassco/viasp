============
Python Usage
============

Quickstart script
=================

Besides the ``viasp`` command line tool, viASP can also be run from a simple python scripts. 
Note that both the server and the client need to be started and initialized by the script at each use.

A custom script has the advantage of closer control over the program flow and the ability to fully use viASP's python API.

Run the script at ``examples/quickstart.py`` to start viASP with a given encoding.

.. code-block:: bash

    $ python quickstart.py encoding.lp


Extending arbitrary python scripts
==================================

To use viASP in your own python scripts using the clingo API, you can use the viASP python API or the viASP Control proxy object.
The following code snippets show how to use the viASP Control proxy object:

To start the viASP server:

.. code-block:: python

    from viasp.server import startup
    app = startup.run()

Replace the ``clingo.Control`` object with the ``viasp.Control`` proxy object:

.. code-block:: python

    from viasp import Control
    options = ['0']
    ctl = Control(options)

The Control proxy behaves exactly like the clingo Control object, but additionally provides some viASP-specific methods.

Mark stable models for visualization:

.. code-block:: python

    with ctl.solve(yield_=True) as handle:
    for m in handle:
        ctl.viasp.mark(m)

Start the graph generation:

.. code-block:: python

    ctl.viasp.show()

Finally, launch the graph visualization:

.. code-block:: python

    app.run()


Example
-------

In this example, all of these snippets are combined into a script using the viASP Control proxy and the clingo Application

.. code-block:: python
    
    from clingo.application import clingo_main, Application
    from viasp import Control

    class App(Application):

        def main(self, ctl, files):
            ctl = Control(control=ctl, files=files)

            for path in files:
                ctl.load(path)
            ctl.ground([("base", [])])
            with ctl.solve(yield_=True) as handle:
                for m in handle:
                    ctl.viasp.mark(m)
                print(handle.get())
            ctl.viasp.show()


    if __name__ == "__main__":
        clingo_main(App(), ['0', 'encoding.lp'])
        app.run_server()