"""BFS, DFS, Dijkstra, Bellman-Ford y Johnson implementados desde cero (sin NetworkX).
Cada algoritmo devuelve 'steps' para animar el proceso en la interfaz."""
import heapq
from collections import deque

INF = float("inf")
EPS = 1e-9

def reconstruir(prev, s, t):
    if t is None or (t != s and prev.get(t) is None):
        return []
    ruta = [t]
    vistos = {t}
    while ruta[-1] != s:
        padre = prev.get(ruta[-1])
        if padre is None or padre in vistos:
            return []
        vistos.add(padre)
        ruta.append(padre)
    return ruta[::-1]

def costo_ruta(g, ruta):
    peso = {(u, v): w for u in g for v, w in g[u]}
    return round(sum(peso[(a, b)] for a, b in zip(ruta, ruta[1:])), 6) if ruta else None

def _salida(algo, g, s, t, prev, steps, explorados, ops, extra=None):
    ruta = reconstruir(prev, s, t)
    r = {"algo": algo, "steps": steps, "prev": prev, "ruta": ruta, "costo": costo_ruta(g, ruta),
         "explorados": len(explorados), "orden": explorados, "ops": ops}
    r.update(extra or {})
    return r

def bfs(g, s, t=None):
    prev = {v: None for v in g}
    descubiertos, cola, orden, steps, ops = {s}, deque([s]), [], [], 0
    while cola:
        u = cola.popleft()                      # FIFO
        orden.append(u)
        if u != t:
            for v, _ in g[u]:
                ops += 1
                if v not in descubiertos:
                    descubiertos.add(v); prev[v] = u; cola.append(v)
        steps.append({"actual": u, "cola": list(cola), "descubiertos": sorted(descubiertos),
                      "explorados": list(orden), "prev": dict(prev)})
        if u == t:
            break
    return _salida("BFS", g, s, t, prev, steps, orden, ops)

def dfs(g, s, t=None):
    prev = {v: None for v in g}
    pila, visitados, orden, steps, ops = [(s, None)], set(), [], [], 0
    while pila:
        u, padre = pila.pop()                   # LIFO
        if u in visitados:
            continue
        visitados.add(u); prev[u] = padre; orden.append(u)
        if u != t:
            for v, _ in reversed(g[u]):         # reversed: respeta el orden de la lista
                ops += 1
                if v not in visitados:
                    pila.append((v, u))
        steps.append({"actual": u, "pila": [x for x, _ in pila], "visitados": list(orden),
                      "pendientes": sorted({x for x, _ in pila} - visitados), "prev": dict(prev)})
        if u == t:
            break
    return _salida("DFS", g, s, t, prev, steps, orden, ops)

def dijkstra(g, s, t=None, trace=True):
    if any(w < 0 for u in g for _, w in g[u]):
        raise ValueError("Dijkstra no admite pesos negativos")
    dist = {v: INF for v in g}; prev = {v: None for v in g}; dist[s] = 0
    cola, listos, orden, steps, ops = [(0, s)], set(), [], [], 0
    while cola:
        d, u = heapq.heappop(cola)
        if u in listos:
            continue
        listos.add(u); orden.append(u)
        relajaciones = []
        if u != t:
            for v, w in g[u]:
                ops += 1
                if d + w < dist[v]:             # relajación
                    relajaciones.append({"de": u, "a": v, "w": w, "antes": dist[v], "despues": d + w})
                    dist[v] = d + w; prev[v] = u
                    heapq.heappush(cola, (dist[v], v))
        if trace:
            steps.append({"actual": u, "seleccionado": u, "dist": dict(dist), "prev": dict(prev),
                          "visitados": list(orden), "relajaciones": relajaciones})
        if u == t:
            break
    return _salida("Dijkstra", g, s, t, prev, steps, orden, ops, {"dist": dist})

def bellman_ford(g, s, t=None):
    dist = {v: INF for v in g}; prev = {v: None for v in g}; dist[s] = 0
    aristas = [(u, v, w) for u in g for v, w in g[u]]
    n, steps, ops = len(g), [], 0
    for it in range(1, n):                      # |V|-1 iteraciones
        hubo_cambio = False
        for u, v, w in aristas:
            ops += 1
            antes = dist[v]
            act = dist[u] != INF and dist[u] + w < antes
            if act:
                dist[v] = dist[u] + w; prev[v] = u; hubo_cambio = True
            steps.append({"iter": it, "total": n - 1, "arista": [u, v], "w": w, "antes": antes,
                          "despues": dist[v], "actualizado": act, "pred": prev[v]})
        if not hubo_cambio:
            break
    ciclo = any(dist[u] != INF and dist[u] + w < dist[v] for u, v, w in aristas)
    msg = "Ciclo negativo detectado. No existe un camino mínimo válido." if ciclo else None
    r = _salida("Bellman-Ford", g, s, None if ciclo else t, prev, steps, [v for v in g if dist[v] < INF], ops,
                {"dist": dist, "ciclo_negativo": ciclo, "mensaje": msg})
    if ciclo:
        r["ruta"], r["costo"] = [], None
    return r

def johnson(g):
    aux = "__S__"
    while aux in g:
        aux += "_"
    g2 = {u: list(e) for u, e in g.items()}
    g2[aux] = [(v, 0) for v in g]                         # etapas 1-2: nodo auxiliar, peso 0
    bf = bellman_ford(g2, aux)                            # etapa 2: Bellman-Ford propio
    etapas = [{"etapa": 1, "titulo": "Agregar nodo auxiliar", "aristas_nuevas": [[aux, v, 0] for v in g]},
              {"etapa": 2, "titulo": "Ejecutar Bellman-Ford", "pasos": len(bf["steps"])}]
    if bf["ciclo_negativo"]:
        return {"algo": "Johnson", "ciclo_negativo": True, "mensaje": bf["mensaje"], "etapas": etapas}
    h = {v: bf["dist"][v] for v in g}                     # etapa 3: potenciales h(v)
    etapas.append({"etapa": 3, "titulo": "Calcular h(v)", "h": h})
    gp, repon = {}, []                                    # etapa 4: w' = w + h(u) - h(v)
    for u in g:
        gp[u] = []
        for v, w in g[u]:
            w2 = w + h[u] - h[v]
            w2 = 0 if -EPS < w2 < 0 else w2
            gp[u].append((v, w2)); repon.append({"u": u, "v": v, "w": w, "w2": w2})
    etapas.append({"etapa": 4, "titulo": "Reponderar aristas", "aristas": repon})
    D, prevs, expl, ops, corridas = {}, {}, {}, bf["ops"], []
    for s in g:                                           # etapa 5: Dijkstra desde cada nodo
        r = dijkstra(gp, s, trace=False)
        prevs[s], expl[s], ops = r["prev"], r["orden"], ops + r["ops"]
        corridas.append({"origen": s, "explorados": len(r["orden"])})
        D[s] = {v: (r["dist"][v] - h[s] + h[v] if r["dist"][v] < INF else INF) for v in g}  # etapa 6
    for s in D:
        for v in D[s]:
            if D[s][v] < INF:
                D[s][v] = round(D[s][v], 6)
    etapas += [{"etapa": 5, "titulo": "Dijkstra desde cada nodo", "corridas": corridas},
               {"etapa": 6, "titulo": "Reconstruir distancias originales", "formula": "d(u,v) = d'(u,v) - h(u) + h(v)"},
               {"etapa": 7, "titulo": "Matriz de caminos mínimos"}]
    return {"algo": "Johnson", "ciclo_negativo": False, "etapas": etapas, "h": h, "matriz": D,
            "prevs": prevs, "explorados_por_origen": {s: len(o) for s, o in expl.items()},
            "ops": ops, "rutas_calculadas": len(g) * (len(g) - 1)}

def ruta_johnson(res, s, t):
    ruta = reconstruir(res["prevs"][s], s, t)
    return {"ruta": ruta, "costo": res["matriz"][s][t] if ruta else None, "nodos": len(ruta),
            "explorados": res["explorados_por_origen"][s]}