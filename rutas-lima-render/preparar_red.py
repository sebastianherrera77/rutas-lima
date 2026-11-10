"""Download an authentic drivable street network; no external route algorithms."""
from pathlib import Path
import sys, json, math
from datetime import datetime, timezone
import osmnx as ox

ROOT = Path(__file__).resolve().parent
if ROOT.name == 'work':
    ROOT = Path(r'C:\Users\herre\Desktop\rutas-lima')

def export_graph(g):
    ids = {n: f'N{i:02d}' for i,n in enumerate(sorted(g.nodes),1)}
    coords = {ids[n]: [float(d['y']),float(d['x'])] for n,d in g.nodes(data=True)}
    selected = {}
    for u,v,key,d in g.edges(keys=True,data=True):
        if u == v: continue  # nonnegative self-loops cannot improve a shortest path
        pair = (ids[u],ids[v])
        length = float(d['length'])
        if not math.isfinite(length) or length <= 0: raise ValueError('Longitud vial inválida')
        if pair in selected and selected[pair]['meters'] <= length: continue
        geometry = [[float(y),float(x)] for x,y in d['geometry'].coords] if 'geometry' in d else [coords[pair[0]],coords[pair[1]]]
        a=coords[pair[0]]
        if sum((geometry[-1][i]-a[i])**2 for i in range(2)) < sum((geometry[0][i]-a[i])**2 for i in range(2)):
            geometry.reverse()
        name=d.get('name','Vía sin nombre')
        if isinstance(name,list): name=' / '.join(map(str,name))
        selected[pair]={'meters':length,'geometry':geometry,'name':str(name),'osmid':d.get('osmid'),'key':int(key)}
    graph={k:[] for k in coords}; geometries={}; streets={}
    for (u,v),d in selected.items():
        graph[u].append([v,d['meters']/1000])
        geometries[f'{u}|{v}']=d['geometry']; streets[f'{u}|{v}']=d
    labels={}
    for n in graph:
        names=sorted({d['name'] for (u,v),d in selected.items() if n in (u,v)})
        labels[n]=n+' · '+' / '.join(names[:2])
    return {'nodos':list(graph),'aristas':graph,'coords':coords,'geometrias':geometries,'etiquetas':labels,
            'calles':streets,'osm_ids':{ids[n]:int(n) for n in ids},'dirigido':True,
            'nombre':'Miraflores · calles reales','descripcion':'Red para automóvil alrededor del parque Kennedy. Sentidos de circulación de OpenStreetMap.',
            'fuente':'OpenStreetMap / OSMnx','descargado_utc':datetime.now(timezone.utc).isoformat(),
            'centro':[-12.1211,-77.0304],'distancia_consulta_m':450,'tipo_red':'drive','osmnx_version':ox.__version__}

def main():
    target=ROOT/'datos'; target.mkdir(exist_ok=True)
    ox.settings.cache_folder=str(target/'cache-osmnx'); ox.settings.use_cache=True
    ox.settings.requests_timeout=90; ox.settings.log_console=True
    g=ox.graph.graph_from_point((-12.1211,-77.0304),dist=450,network_type='drive',simplify=True,retain_all=False)
    result=export_graph(g)
    if len(result['nodos'])>180: raise ValueError('Zona demasiado grande para las trazas y matriz didácticas')
    sys.path.insert(0,str(ROOT))
    import algorithms as A
    best=None
    for s in result['nodos']:
        r=A.dijkstra(result['aristas'],s,trace=False)
        for t,cost in r['dist'].items():
            if math.isfinite(cost) and (best is None or cost>best[0]): best=(cost,s,t)
    result['seleccion_inicial']={'origen':best[1],'destino':best[2]}
    ox.io.save_graphml(g,target/'miraflores.graphml')
    (target/'miraflores.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'nodos':len(result['nodos']),'aristas':sum(map(len,result['aristas'].values())),'seleccion':result['seleccion_inicial']},ensure_ascii=False))

if __name__=='__main__': main()
