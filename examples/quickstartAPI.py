import viasp
from viasp.server import startup

session_id = ""

def main():
    viasp.load_program_file('hamiltonian.lp')
    viasp.mark_from_string(
        'node(1).node(2).node(3).node(4).edge(1,2).edge(2,3).edge(2,4).edge(3,1).edge(3,4).edge(4,1).edge(4,3).hc(1,2).hc(2,4).hc(3,1).hc(4,3).start(1).reached(2).reached(3).reached(4).reached(1).'
    )
    viasp.show()
    viasp.clingraph(viz_encoding='viz_hamiltonian.lp', engine='dot', graphviz_type='digraph')
    global session_id
    session_id = viasp.get_session_id()

app = startup.run()

if __name__ == '__main__':
    main()
    app.run(session_id)
