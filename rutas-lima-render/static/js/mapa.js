const COL = {base: '#a6b5c5', desc: '#ffc66f', expl: '#53d4e5', act: '#ffe08a', ruta: '#43e7dc'};
const M = {map: null, tiles: null, capa: null, coords: {}, aristas: {}, nodos: [], claro: true, dirigido: false, geometrias: {}, etiquetas: {}, calles: {}, inicial: null};

function initMapa() {
  M.map = L.map('mapa').setView([-12.105, -77.01], 12);
  M.tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });
  M.capa = L.layerGroup().addTo(M.map);
  L.control.scale({imperial: false, position: 'bottomleft'}).addTo(M.map);
}

async function cargarGrafo(modo) {
  const response = await fetch('/api/grafo?modo=' + encodeURIComponent(modo));
  const d = await response.json();
  if (!response.ok || d.error) throw new Error(d.error || 'No se pudo cargar el grafo.');
  M.aristas = d.aristas; M.nodos = d.nodos; M.claro = !!d.coords;
  M.dirigido = !!d.dirigido || !M.claro; M.geometrias = d.geometrias || {};
  M.etiquetas = d.etiquetas || {}; M.calles = d.calles || {}; M.inicial = d.seleccion_inicial || null;
  const conexiones = Object.values(d.aristas).reduce((total, aristas) => total + aristas.length, 0);
  $('statNodos').textContent = String(d.nodos.length).padStart(2, '0');
  $('statAristas').textContent = String(M.dirigido ? conexiones : conexiones / 2).padStart(2, '0');
  $('mapaModo').textContent = modo === 'lima' ? 'Grafo de Lima' : 'Grafo académico';
  $('mapaInfoNombre').textContent = modo === 'lima' ? 'GRAFO DE LIMA' : 'GRAFO ACADÉMICO';
  $('mapaInfoTipo').textContent = modo === 'lima' ? 'MODELO DIDÁCTICO' : 'PESOS DE EJEMPLO';
  $('mapaInfoDescripcion').textContent = modo === 'lima'
    ? 'Una red de distritos para visualizar cómo exploran los algoritmos.'
    : 'Un grafo pequeño para estudiar pesos negativos y sus ciclos.';
  if (modo === 'real') {
    $('mapaModo').textContent = d.nombre;
    $('mapaInfoNombre').textContent = 'MIRAFLORES · RED VIAL';
    $('mapaInfoTipo').textContent = 'OSMnx / OpenStreetMap';
    $('mapaInfoDescripcion').textContent = d.descripcion;
  }
  $('notaRed').textContent = modo === 'real'
    ? 'Calles reales y sentidos OSM. Zona limitada alrededor del parque Kennedy; sin tráfico en vivo.'
    : modo === 'lima' ? 'Conexiones esquemáticas y distancias estimadas entre distritos.' : 'Grafo de ejemplo con pesos abstractos.';
  if (M.claro) { M.coords = d.coords; M.tiles.addTo(M.map); }       // Lima: mapa normal
  else {                                                           // académico: fondo negro, nodos en círculo
    M.tiles.remove(); M.coords = {};
    d.nodos.forEach((n, i) => { const a = 2 * Math.PI * i / d.nodos.length; M.coords[n] = [0.05 * Math.sin(a), 0.05 * Math.cos(a)]; });
  }
  M.map.invalidateSize();
  M.map.fitBounds(Object.values(M.coords), {padding: [35, 35], animate: false});
  dibujar();
}

const puntosArista = (a, b) => M.geometrias[a + '|' + b] || [M.coords[a], M.coords[b]];
const linea = (a, b, opt) => L.polyline(puntosArista(a, b), opt).addTo(M.capa);
function textoSeguro(text) { const span = document.createElement('span'); span.textContent = text; return span; }

// e = {actual, desc[], expl[], ruta[], arista[u,v]}
function dibujar(e = {}) {
  M.capa.clearLayers();
  const hecho = new Set();
  for (const u in M.aristas) for (const [v, w] of M.aristas[u]) {
    const k = !M.dirigido ? [u, v].sort().join('|') : u + '|' + v;
    if (hecho.has(k)) continue; hecho.add(k);
    const ln = linea(u, v, {color: COL.base, weight: 2, opacity: M.claro ? .46 : .8});
    if (M.claro) ln.bindTooltip(textoSeguro(`${M.calles[u + '|' + v]?.name || ''} ${u} ${M.dirigido ? '→' : '↔'} ${v}: ${Number(w.toFixed(3))} km`), {sticky: true});
    else ln.bindTooltip(`${u}→${v}: ${w}`, {permanent: true, className: 'etq', direction: 'center'});
  }
  if (e.arista) linea(e.arista[0], e.arista[1], {color: COL.act, weight: 5, opacity: .95});
  if (e.ruta && e.ruta.length > 1) {
    for (let i = 0; i < e.ruta.length - 1; i++) linea(e.ruta[i], e.ruta[i + 1], {color: '#ffffff', weight: 9, opacity: .94});
    for (let i = 0; i < e.ruta.length - 1; i++) linea(e.ruta[i], e.ruta[i + 1], {color: '#111111', weight: 5, opacity: 1, className: 'ruta-animada'});
  }
  const enRuta = e.ruta || [], expl = e.expl || [], desc = e.desc || [];
  for (const n of M.nodos) {
    const col = n === e.actual ? COL.act : enRuta.includes(n) ? COL.ruta
      : expl.includes(n) ? COL.expl : desc.includes(n) ? COL.desc : COL.base;
    L.circleMarker(M.coords[n], {radius: enRuta.includes(n) ? 8 : Object.keys(M.geometrias).length ? 5 : 8, color: '#f4f8fc', weight: 2, fillColor: col, fillOpacity: 1})
       .bindTooltip(textoSeguro(M.etiquetas[n] || n), {permanent: !Object.keys(M.geometrias).length, direction: 'top', className: 'etq', offset: [0, -8]}).addTo(M.capa)
      .on('click', () => seleccionarNodo(n));
  }
}
function enfocarRuta(ruta) {
  const puntos = ruta.length > 1 ? ruta.slice(1).flatMap((n, i) => puntosArista(ruta[i], n)) : ruta.map(n => M.coords[n]).filter(Boolean);
  if (!puntos.length) return;
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  M.map.flyToBounds(L.latLngBounds(puntos), {padding: [65, 65], maxZoom: Object.keys(M.geometrias).length ? 17 : M.claro ? 14 : 12, duration: reducir ? 0 : 1.1, animate: !reducir});
}

let siguienteSeleccion = 'origen';
function seleccionarNodo(n) {
  const campo = $(siguienteSeleccion); campo.value = n; campo.dispatchEvent(new Event('change'));
  $('algoAyuda').textContent = `${siguienteSeleccion === 'origen' ? 'Origen' : 'Destino'}: ${M.etiquetas[n] || n}. Haz clic en otro nodo para elegir ${siguienteSeleccion === 'origen' ? 'destino' : 'origen'}.`;
  siguienteSeleccion = siguienteSeleccion === 'origen' ? 'destino' : 'origen';
}
