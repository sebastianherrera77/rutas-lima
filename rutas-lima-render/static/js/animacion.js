const $ = id => document.getElementById(id);
const fila = (k, v) => `<div class="fila"><b>${k}</b><span>${v}</span></div>`;
const formato = x => Number.isFinite(x) ? String(Number(x.toFixed(3))) : '∞';
const km = x => x === null || x === undefined ? '∞' : `${formato(x)}${['lima', 'real'].includes($('modo').value) ? ' km' : ' unidades'}`;
const pred = p => Object.entries(p).map(([k, v]) => `${k}: ${v ?? '—'}`).join(', ') || '—';
let JR = null;                                   // resultado de Johnson en caché
const P = {pasos: [], i: 0, timer: null, render: null};
const AYUDA = {
  bfs: 'Explora el grafo por niveles con una cola FIFO; encuentra una ruta con el menor número de aristas.',
  dfs: 'Profundiza por una rama con una pila LIFO antes de retroceder; útil para explorar la estructura.',
  dijkstra: 'Relaja aristas de peso no negativo y selecciona primero la menor distancia provisional.',
  'bellman-ford': 'Relaja todas las aristas repetidamente y puede detectar ciclos de peso negativo.',
  johnson: 'Combina Bellman–Ford y Dijkstra para obtener caminos mínimos entre todos los pares.'
};

// ---- reproductor genérico (lo usan los 4 algoritmos y el proceso de Johnson) ----
function cargarPasos(pasos, render) { pausar(); P.pasos = pasos; P.render = render; ir(0); }
function ir(i) {
  if (!P.pasos.length) return;
  P.i = Math.max(0, Math.min(i, P.pasos.length - 1));
  P.render(P.pasos[P.i], P.i);
  $('pasoInfo').textContent = `Paso ${P.i + 1} / ${P.pasos.length}`;
  const progreso = $('progresoPaso');
  if (progreso) progreso.style.width = `${P.pasos.length > 1 ? P.i / (P.pasos.length - 1) * 100 : 100}%`;
}
const siguiente = () => ir(P.i + 1), anterior = () => ir(P.i - 1);
function pausar() { clearInterval(P.timer); P.timer = null; }
function reproducir() {
  pausar();
  if (!P.pasos.length) return;
  if (P.i === P.pasos.length - 1) ir(0);
  P.timer = setInterval(() => P.i >= P.pasos.length - 1 ? pausar() : siguiente(), Number($("velocidad").value));
}

// ---- BFS / DFS / Dijkstra / Bellman-Ford ----
async function ejecutar() {
  const a = $('algo').value;
  if (!a) { $('algo').focus(); $('algoAyuda').textContent = 'Selecciona un algoritmo para comenzar.'; return; }
  pausar(); $('panel').classList.remove('mal');
  $('btnCalc').disabled = true; $('btnCalc').textContent = 'Buscando…';
  $('panel').textContent = 'Calculando el recorrido…';
  const url = `/api/ejecutar?modo=${encodeURIComponent($('modo').value)}&algo=${encodeURIComponent(a)}&origen=${encodeURIComponent($('origen').value)}&destino=${encodeURIComponent($('destino').value)}`;
  try {
    const response = await fetch(url);
    const d = await response.json();
    if (!response.ok || d.error) throw new Error(d.error || 'No se pudo ejecutar el algoritmo.');
    cargarPasos(d.steps, (p, i) => pintar(d, p, i));
    reproducir();
  } catch (error) {
    pausar();
    $('panel').textContent = error.message || 'No se pudo conectar con el servidor.';
    $('panel').classList.add('mal');
  } finally { $('btnCalc').disabled = false; $('btnCalc').textContent = 'Buscar ruta'; }
}

function pintar(d, p, i) {
  let e = {}, h = '';
  if (d.algo === 'BFS') {
    e = {actual: p.actual, expl: p.explorados, desc: p.descubiertos.filter(x => !p.explorados.includes(x))};
    h = fila('Nodo actual', p.actual) + fila('Cola', p.cola.join(', ') || '(vacía)') +
      fila('Descubiertos', p.descubiertos.join(', ')) + fila('Explorados', p.explorados.join(', ')) +
      fila('Orden de exploración', p.explorados.join(' → ')) + fila('Predecesores', pred(p.prev));
  } else if (d.algo === 'DFS') {
    e = {actual: p.actual, expl: p.visitados, desc: p.pendientes};
    h = fila('Nodo actual', p.actual) + fila('Pila (tope al final)', p.pila.join(', ') || '(vacía)') +
      fila('Visitados', p.visitados.join(', ')) + fila('Pendientes', p.pendientes.join(', ') || '—') +
      fila('Orden de exploración', p.visitados.join(' → ')) + fila('Predecesores', pred(p.prev));
  } else if (d.algo === 'Dijkstra') {
    const r = p.relajaciones, ult = r[r.length - 1];
    e = {actual: p.actual, expl: p.visitados, arista: ult && [ult.de, ult.a],
         desc: Object.keys(p.dist).filter(n => p.dist[n] !== null && !p.visitados.includes(n))};
    h = fila('Nodo seleccionado', p.seleccionado) +
      fila('Distancias provisionales', Object.entries(p.dist).map(([k, v]) => `${k}: ${km(v)}`).join('<br>')) +
      fila('Visitados', p.visitados.join(', ')) + fila('Predecesores', pred(p.prev)) +
      '<h3>Relajación de aristas</h3>' + (r.map(x => fila(`${x.de} → ${x.a}`,
        `${km(x.antes)} → ${km(x.despues)}<br><small>${+(x.despues - x.w).toFixed(3)} + ${x.w} = ${km(x.despues)}</small>`)).join('') || 'Sin mejoras.');
  } else {                                        // Bellman-Ford
    const dist = {};
    for (let k = 0; k <= i; k++) if (d.steps[k].actualizado) dist[d.steps[k].arista[1]] = d.steps[k].despues;
    e = {actual: p.arista[0], arista: p.arista, desc: Object.keys(dist)};
    h = fila('Iteración', `${p.iter}/${p.total}`) + fila('Arista', `${p.arista[0]} → ${p.arista[1]} (${p.w})`) +
      fila('Distancia anterior', km(p.antes)) + fila('Distancia nueva', km(p.despues)) +
      fila('Actualización', p.actualizado ? `${km(p.antes)} → ${km(p.despues)}` : 'sin cambio') +
      fila('Predecesor', p.pred || '—');
    if (i === d.steps.length - 1 && d.ciclo_negativo) h += `<p class="mal">${d.mensaje}</p>`;
  }
  if (i === d.steps.length - 1 && !d.ciclo_negativo) {              // último paso: resultado
    e.ruta = d.ruta; e.actual = null;
    h = '<h3>Resultado</h3>' + fila('Ruta encontrada', d.ruta.join(' → ') || 'sin ruta') +
      fila(d.algo === 'BFS' || d.algo === 'DFS' ? 'Costo (no necesariamente mínimo)' : 'Costo total', km(d.costo)) +
      fila('Nodos explorados', d.explorados) + '<details class="detalle-recorrido"><summary>Ver detalle de exploración</summary>' + h + '</details>';
  }
  $('panel').innerHTML = `<h3>${d.algo}</h3>` + h;
  dibujar(e);
  if (e.ruta && e.ruta.length) enfocarRuta(e.ruta);
}

// ---- interfaz ----
function llenarSelects() {
  for (const id of ['origen', 'destino']) {
    $(id).replaceChildren(...M.nodos.map(n => new Option(M.etiquetas[n] || n, n)));
  }
  const c = M.nodos.indexOf('Chorrillos');
  $('destino').selectedIndex = c >= 0 ? c : M.nodos.length - 1;
  if (M.inicial) { $('origen').value = M.inicial.origen; $('destino').value = M.inicial.destino; }
}
function actualizarUI() {
  const j = $('algo').value === 'johnson';
  $('lblPar').textContent = j ? 'Seleccione un par de nodos' : 'Origen y destino';
  $('algoAyuda').textContent = AYUDA[$('algo').value] || 'Selecciona un algoritmo y los nodos para explorar el grafo.';
  $('btnCalc').classList.toggle('oculto', j);
  $('btnRuta').classList.toggle('oculto', !j);
  $('btnTodos').classList.toggle('oculto', !j);
  $('johnson').classList.toggle('oculto', !(j && JR));
}
async function cambiarModo() {
  pausar(); JR = null; P.pasos = [];
  $('panel').classList.remove('mal');
  try {
    await cargarGrafo($('modo').value); llenarSelects(); actualizarUI();
    $('panel').innerHTML = '<div class="panel-vacio"><span class="panel-icono" aria-hidden="true">⌁</span><p class="eyebrow">LISTO PARA EXPLORAR</p><h2>Tu siguiente ruta empieza aquí.</h2><p>Elige algoritmo, origen y destino. Sigue cada paso sobre el mapa.</p></div>';
    $('pasoInfo').textContent = 'La animación aparecerá aquí';
    $('progresoPaso').style.width = '0';
  } catch (error) {
    $('panel').textContent = error.message || 'No se pudo cargar el grafo.';
    $('panel').classList.add('mal');
  }
}
async function arranque() {
  initMapa(); await cambiarModo();
  $('modo').onchange = cambiarModo; $('algo').onchange = () => { pausar(); P.pasos = []; $('panel').classList.remove('mal'); actualizarUI(); dibujar(); $('panel').textContent = AYUDA[$('algo').value]; };
  $('btnCalc').onclick = ejecutar; $('btnRuta').onclick = johnsonRuta; $('btnTodos').onclick = johnsonTodos;
  $('btnAnt').onclick = anterior; $('btnSig').onclick = siguiente;
  $('btnPlay').onclick = reproducir; $('btnPausa').onclick = pausar;
  $('btnFin').onclick = () => { pausar(); ir(P.pasos.length - 1); };
  $('velocidad').onchange = () => { if (P.timer) reproducir(); };
  for (const id of ['origen', 'destino']) $(id).onchange = () => { pausar(); P.pasos = []; dibujar(); $('pasoInfo').textContent = 'Par actualizado: vuelve a calcular la ruta'; }; 
}