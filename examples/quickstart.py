import sys
from viasp import Control
from viasp.server import startup

session_id = ""

def main():
    options = ['0']

    ctl = Control(options, viasp_backend_url="http://localhost:5050")
    for path in sys.argv[1:]:
        ctl.load(path)
    if not sys.argv[1:]:
        ctl.load("-")
    ctl.ground([("base", [])])

    with ctl.solve(yield_=True) as handle:
        for m in handle:
            print("Answer:\n{}".format(m))
            ctl.viasp.mark(m)
        print(handle.get())
    ctl.viasp.show()
    ctl.viasp.clingraph(viz_encoding="viz_hamiltonian.lp",
                        engine="dot",
                        graphviz_type="graph")
    global session_id
    session_id = ctl.viasp.get_session_id()

app = startup.run()

if __name__ == '__main__':
    main()
    app.run(session_id)
