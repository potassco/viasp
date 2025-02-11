import sys
from clingo.application import clingo_main, Application
from clingo.script import enable_python
import viasp
from viasp.server import startup

enable_python()

class App(Application):

    def main(self, ctl, files):
        for path in files:
            ctl.load(path)
            viasp.load_program_file(path)
        if not files:
            ctl.load("-")
            viasp.load_program_file("-")
        ctl.ground([("base", [])])
        with ctl.solve(yield_=True) as handle:
            for m in handle:
                viasp.mark_from_clingo_model(m)
            print(handle.get())
            if handle.get().unsatisfiable:
                print(viasp.get_relaxed_program())
        viasp.clingraph(viz_encoding="viz_hamiltonian.lp",
                        engine="dot",
                        graphviz_type="digraph")
        viasp.show()


app = startup.run()

if __name__ == "__main__":
    clingo_main(App(), sys.argv[1:])
    app.run_server()
