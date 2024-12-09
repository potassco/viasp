=================
Contributing
=================

Requirements
============

- `Git <https://git-scm.com>`_
- `Node.JS <https://nodejs.org>`_
- `Python <https://www.python.org>`_
- A suitable browser


Getting started
===============

1. Clone the repository using :code:`git clone https://github.com/potassco/viasp.git`
2. Create and activate a conda environment
3. Install pip :code:`conda install pip`
4. Install viASP in editable mode :code:`pip install -e viasp -e viasp/backend -e viasp/frontend`

Developing the backend
======================

1. Simply edit the code in the backend folder :code:`viasp/backend/src`
2. Run viASP with a clingo program :code:`viasp encoding.lp`

Developing the frontend
=======================

1. Move to frontend folder :code:`cd viasp/frontend`
2. Run :code:`npm i` to install all needed dependencies
3. Run :code:`npm run start` to continuously pack the javascript
4. Run a modified viASP App to see changes on the frontend immediately :code:`python DevApp.py 0 encoding.lp`

.. Note::
    The JavaScript and CSS files are located at ``/frontend/src/lib``. 

5. To build the frontend for production run :code:`npm run build`


Code your heart out!

