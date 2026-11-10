import sys, random, math, json, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import algorithms as A
from data import grafo_lima, ACADEMICO, ACADEMICO_CICLO
from app import app

class Verification(unittest.TestCase):
 def check_graph(self,g,nonnegative):
  # Independent Floyd-Warshall oracle, used only by verification.
  d={u:{v:0 if u==v else math.inf for v in g} for u in g}
  for u in g:
   for v,w in g[u]: d[u][v]=min(d[u][v],w)
  for k in g:
   for u in g:
    for v in g: d[u][v]=min(d[u][v],d[u][k]+d[k][v])
  j=A.johnson(g)
  self.assertFalse(j['ciclo_negativo'])
  for s in g:
   for t in g:
    expected=d[s][t]
    self.assertAlmostEqual(j['matriz'][s][t],expected,places=5)
    for fn in ([A.bellman_ford,A.dijkstra] if nonnegative else [A.bellman_ford]):
     r=fn(g,s,t)
     if math.isinf(expected): self.assertEqual(r['ruta'],[])
     else:
      self.assertAlmostEqual(r['costo'],expected,places=5)
      self.assertEqual((r['ruta'][0],r['ruta'][-1]),(s,t))
    unweighted={u:[(v,1) for v,w in edges] for u,edges in g.items()}
    b=A.bfs(g,s,t); hops=A.bellman_ford(unweighted,s,t)
    self.assertEqual(len(b['ruta']),len(hops['ruta']))
    r=A.dfs(g,s,t)
    self.assertEqual(bool(r['ruta']),not math.isinf(expected))
    self.assertEqual(len(r['ruta']),len(set(r['ruta'])))
 def test_lima_all_pairs(self): self.check_graph(grafo_lima(),True)
 def test_negative_weights(self): self.check_graph(ACADEMICO,False)
 def test_seeded_simulations(self):
  rng=random.Random(20261110)
  for case in range(80):
   n=rng.randint(2,9); g={str(i):[] for i in range(n)}
   # DAGs allow negative weights without negative cycles; arbitrary nonnegative graphs include cycles.
   negative=case%2==0
   for i in range(n):
    for j in range(n):
     if i!=j and (not negative or i<j) and rng.random()<.3:
      g[str(i)].append((str(j),rng.randint(-8 if negative else 0,15)))
   self.check_graph(g,not negative)
 def test_negative_cycle(self):
  for t in ACADEMICO_CICLO:
   r=A.bellman_ford(ACADEMICO_CICLO,'A',t)
   self.assertTrue(r['ciclo_negativo']); self.assertEqual(r['ruta'],[]); self.assertIsNone(r['costo'])
  self.assertTrue(A.johnson(ACADEMICO_CICLO)['ciclo_negativo'])
 def test_guard_and_reserved_node(self):
  self.assertEqual(A.reconstruir({'A':'B','B':'A'},'C','A'),[])
  self.check_graph({'__S__':[('X',2)],'X':[]},True)
  with self.assertRaises(ValueError): A.dijkstra({'A':[('B',-1e-12)],'B':[]},'A','B')
 def test_api(self):
  c=app.test_client()
  for mode in ['lima','academico','ciclo']:
   g=c.get('/api/grafo',query_string={'modo':mode}).get_json(); nodes=g['nodos']
   for algo in ['bfs','dfs','dijkstra','bellman-ford']:
    r=c.get('/api/ejecutar',query_string={'modo':mode,'algo':algo,'origen':nodes[0],'destino':nodes[-1]})
    self.assertEqual(r.status_code,400 if algo=='dijkstra' and mode!='lima' else 200)
    json.loads(r.data)
   self.assertEqual(c.get('/api/johnson',query_string={'modo':mode}).status_code,200)
  for endpoint in ['/','/static/comparacion.html','/api/comparar?origen=San%20Isidro&destino=Chorrillos']:
   with c.get(endpoint) as response: self.assertEqual(response.status_code,200)
  self.assertEqual(c.get('/api/ejecutar?algo=bfs&origen=inexistente').status_code,400)
  self.assertEqual(c.get('/api/grafo?modo=inexistente').status_code,400)

if __name__=='__main__': unittest.main(verbosity=2)
