import unittest, math, json, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
if ROOT.name=='work': ROOT=Path(r'C:\Users\herre\Desktop\rutas-lima')
sys.path.insert(0,str(ROOT))
import algorithms as A
from osm_data import datos_reales
from app import app

class RealStreetTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.data=datos_reales();cls.g=cls.data['aristas']
 def test_geometry_and_weights(self):
  d=self.data
  self.assertGreater(len(self.g),10)
  curved=0
  for u,edges in self.g.items():
   self.assertEqual(len(edges),len({v for v,w in edges}))
   for v,w in edges:
    self.assertGreater(w,0);self.assertTrue(math.isfinite(w))
    key=u+'|'+v;geom=d['geometrias'][key]
    self.assertAlmostEqual(w*1000,d['calles'][key]['meters'],places=8)
    for axis in [0,1]:
     self.assertAlmostEqual(geom[0][axis],d['coords'][u][axis],places=6)
     self.assertAlmostEqual(geom[-1][axis],d['coords'][v][axis],places=6)
    curved += len(geom)>2
  self.assertGreater(curved,0)
  self.assertTrue(any(u not in {x for x,w in self.g[v]} for u in self.g for v,w in self.g[u]))
 def test_all_pairs_oracle(self):
  g=self.g
  d={u:{v:0 if u==v else math.inf for v in g} for u in g}
  for u in g:
   for v,w in g[u]: d[u][v]=min(d[u][v],w)
  for k in g:
   for u in g:
    for v in g:d[u][v]=min(d[u][v],d[u][k]+d[k][v])
  j=A.johnson(g);self.assertFalse(j['ciclo_negativo'])
  self.assertEqual(j['rutas_calculadas'],len(g)*(len(g)-1))
  for s in g:
   dj=A.dijkstra(g,s);bf=A.bellman_ford(g,s)
   for t in g:
    self.assertAlmostEqual(dj['dist'][t],d[s][t],places=6)
    self.assertAlmostEqual(bf['dist'][t],d[s][t],places=6)
    self.assertAlmostEqual(j['matriz'][s][t],d[s][t],places=6)
    route=A.ruta_johnson(j,s,t)['ruta']
    if math.isfinite(d[s][t]): self.assertAlmostEqual(A.costo_ruta(g,route),d[s][t],places=6)
    else: self.assertEqual(route,[])
 def test_api_real(self):
  c=app.test_client();s=self.data['seleccion_inicial']['origen'];t=self.data['seleccion_inicial']['destino']
  response=c.get('/api/grafo?modo=real');self.assertEqual(response.status_code,200)
  self.assertIn('geometrias',response.get_json())
  for algo in ['bfs','dfs','dijkstra','bellman-ford']:
   r=c.get('/api/ejecutar',query_string={'modo':'real','algo':algo,'origen':s,'destino':t})
   self.assertEqual(r.status_code,200);self.assertTrue(r.get_json()['ruta'])
  r=c.get('/api/comparar',query_string={'modo':'real','origen':s,'destino':t})
  self.assertEqual(r.status_code,200);self.assertEqual(len(r.get_json()),5)
  j=c.get('/api/johnson',query_string={'modo':'real','origen':s,'destino':t})
  self.assertEqual(j.status_code,200);self.assertTrue(j.get_json()['seleccion']['ruta'])
 def test_osmnx_source_export(self):
  import osmnx as ox
  g=ox.io.load_graphml(ROOT/'datos/miraflores.graphml')
  for u,edges in self.g.items():
   for v,w in edges:
    source=g[self.data['osm_ids'][u]][self.data['osm_ids'][v]]
    self.assertAlmostEqual(w*1000,min(float(e['length']) for e in source.values()),places=7)

if __name__=='__main__': unittest.main(verbosity=2)
