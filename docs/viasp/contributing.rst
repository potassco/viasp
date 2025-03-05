============
Contributing
============

Requirements
------------

- `Git <https://git-scm.com>`_
- `Node.JS <https://nodejs.org>`_
- `Python <https://www.python.org>`_
- A suitable browser

Getting started
---------------

1. Clone the repository using ``git clone https://github.com/potassco/viasp.git``
2. Create and activate a conda environment
3. Install pip ``conda install pip``
4. Install viASP in editable mode ``pip install -e viasp -e viasp/backend -e viasp/frontend``

Developing the backend
----------------------

1. Simply edit the code in the backend folder ``viasp/backend/src``
2. Run viASP with a clingo program ``viasp encoding.lp``
3. The server's log file is created in the working directory ``./viasp.log``

Developing the frontend
-----------------------

.. Note::
    The frontend code is located at ``/frontend/src/lib``. 

1. Run a modified viASP script to initialize the server and generate a graph. 

.. code-block:: bash

    $ python viasp/examples/devquickstart.py encoding.lp

Leave the terminal open to keep the server running.

2. Move to frontend folder

.. code-block:: bash

    $ cd viasp/frontend

3. Run ``npm i`` to install dependency packages
4. Run ``npm run start`` to serve the JavaScript at `http://localhost:8050 <http://localhost:8050>`_
5. When done, run ``npm run build`` to build the project for production

Code your heart out!

Developing the documentation
----------------------------

The documentation is written in reStructuredText and can be found in the ``docs`` folder. To build the documentation, install sphinx and the docs dependencies in a new conda environment.

.. code-block:: bash
    
    $ conda create -n docs_env
    $ conda activate docs_env
    $ conda install pip

Then install the dependencies

.. code-block:: bash

    $ pip install -r viasp/docs/requirements.txt
    # optional, to use autodoc on current changes to the viasp command line:
    $ pip install -e viasp -e viasp/backend -e viasp/frontend

To serve the current changes on a local server,

.. code-block:: bash

    $ sphinx-autobuild viasp/docs viasp/docs/_build/html

To build the documentation,

.. code-block:: bash

    $ sphinx-build -b html viasp/docs viasp/docs/_build/html

Changes to the documentation files on GitHub will automatically trigger a build on through `ReadTheDocs <https://readthedocs.org/projects/viasp/>`_ page.
