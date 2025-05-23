============
Installation
============

Installing with pip 
=====================

The python viasp package can be found `here <https://pypi.org/project/viasp/>`__.

.. code-block:: bash

    $ pip install viasp

.. warning:: 
    To support the use of clingraph in viASP, install `graphviz <https://www.graphviz.org/download/>`__  (version 2.50 or greater) manually.

Installing from source
======================

The project can also be installed from source. To do so, clone the repository at https://github.com/potassco/viasp and run the following commands in the root directory of the project:

1. create a virtual environment

.. code-block:: bash
    
    $ conda create -n viasp_env
    $ conda activate viasp_env

2. install pip

.. code-block:: bash

    $ conda install pip

3. (optional) install `graphviz <https://www.graphviz.org/download/>`__
4. use pip to install the project

.. code-block:: bash

    $ pip install viasp viasp/backend viasp/frontend
