import time
from osm_data import datos_reales, grafo_real
from flask import Flask, jsonify, request, send_from_directory
import algorithms as A
from data import COORDS, ACADEMICO, ACADEMICO_CICLO, grafo_lima

app = Flask(__name__, static_folder="static", static_url_path="/static")
GRAFOS = {"real": grafo_real, "lima": grafo_lima, "academico": lambda: ACADEMICO, "ciclo": lambda: ACADEMICO_CICLO}
ALGOS = {"bfs": A.bfs, "dfs": A.dfs, "dijkstra": A.dijkstra, "bellman-ford": A.bellman_ford}

def limpio(x):  # inf no es JSON válido: se envía como null
    if isinstance(x, float) and x == A.INF: return None
    if isinstance(x, dict): return {k: limpio(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)): return [limpio(v) for v in x]
    return x

def grafo():
    modo = request.args.get("modo", "lima")
    if modo not in GRAFOS:
        raise ValueError(f"Modo de grafo no válido: {modo}")
    return GRAFOS[modo]()

@app.get("/")
def home(): return send_from_directory("static", "index.html")

@app.get("/api/grafo")
def api_grafo():
    try:
        g = grafo()
        if request.args.get("modo") == "real":
            return jsonify(datos_reales())
        return jsonify({"nodos": list(g), "aristas": limpio(g),
                        "coords": COORDS if request.args.get("modo", "lima") == "lima" else None})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.get("/api/ejecutar")
def api_ejecutar():
    a, s, t = request.args.get("algo"), request.args.get("origen"), request.args.get("destino")
    if a not in ALGOS:
        return jsonify({"error": "Selecciona un algoritmo válido."}), 400
    if not s:
        return jsonify({"error": "Indica un nodo de origen."}), 400
    try:
        g = grafo()
        if s not in g or (t is not None and t not in g):
            return jsonify({"error": "El origen o el destino no pertenece al grafo seleccionado."}), 400
        return jsonify(limpio(ALGOS[a](g, s, t)))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.get("/api/johnson")
def api_johnson():
    try:
        g = grafo()
        s, t = request.args.get("origen"), request.args.get("destino")
        if (s and s not in g) or (t and t not in g):
            return jsonify({"error": "El origen o el destino no pertenece al grafo seleccionado."}), 400
        res = A.johnson(g)
        out = dict(res)
        if s and t and not res["ciclo_negativo"]:
            out["seleccion"] = A.ruta_johnson(res, s, t)
        return jsonify(limpio(out))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

@app.get("/api/comparar")
def api_comparar():
    s, t = request.args.get("origen"), request.args.get("destino")
    if not s or not t:
        return jsonify({"error": "Indica un origen y un destino para comparar."}), 400
    try:
        g = grafo()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    if s not in g or t not in g:
        return jsonify({"error": "El origen o el destino no pertenece al grafo seleccionado."}), 400
    filas, n = [], len(g)
    try:
        for nombre, f in {**ALGOS, "johnson": None}.items():
            t0 = time.perf_counter()
            r = A.johnson(g) if f is None else f(g, s, t)
            ms = (time.perf_counter() - t0) * 1000
            calc = {"bfs": 1, "dfs": 1, "dijkstra": 1, "bellman-ford": 1, "johnson": n * (n - 1)}[nombre]
            costo = r["matriz"][s][t] if f is None else r["costo"]
            expl = sum(r["explorados_por_origen"].values()) if f is None else r["explorados"]
            filas.append({"algo": nombre, "explorados": expl, "ms": round(ms, 4), "ops": r["ops"],
                          "costo": costo, "caminos": calc})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify(limpio(filas))

if __name__ == "__main__":
    app.run(debug=False, host="127.0.0.1", port=5000)