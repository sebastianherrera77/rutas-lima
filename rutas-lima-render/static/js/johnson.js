// Johnson — Todos contra todos: proceso por etapas, matriz clicable y ruta de cualquier par
async function prepararJohnson() {
  pausar(); $('panel').classList.remove('mal');
  try {
    const response = await fetch(`/api/johnson?modo=${encodeURIComponent($('modo').value)}`);
    JR = await response.json();
    if (!response.ok || JR.error) throw new Error(JR.error || 'No se pudo ejecutar Johnson.');
  } catch (error) {
    $('panel').textContent = error.message || 'No se pudo conectar con el servidor.';
    $('panel').classList.add('mal');
    return false;
  }
  $('johnson').classList.remove('oculto');
  if (JR.ciclo_negativo) {
    $('panel').innerHTML = `<p class="mal">${JR.mensaje}</p>`; $('matriz').innerHTML = ''; dibujar();
    return false;
  }
  dibujarMatriz(); return true;
}

async function johnsonTodos() {                         // [Calcular todos los pares]
  if (!await prepararJohnson()) return;
  cargarPasos(pasosJohnson(), pintarEtapa);
  reproducir();
}
async function johnsonRuta() {                          // [Calcular ruta]
  if (!await prepararJohnson()) return;
  pausar(); mostrarPar($('origen').value, $('destino').value);
  cargarPasos(pasosJohnson(), pintarEtapa); ir(P.pasos.length - 1);
  mostrarPar($('origen').value, $('destino').value);
}

function pasosJohnson() {                               // etapa 4 y 5 se expanden: arista por arista / Dijkstra por Dijkstra
  const pasos = [];
  for (const e of JR.etapas) {
    if (e.etapa === 4) e.aristas.forEach((a, k) => pasos.push({e, a, k: k + 1, n: e.aristas.length}));
    else if (e.etapa === 5) e.corridas.forEach((c, k) => pasos.push({e, c, k: k + 1, n: e.corridas.length}));
    else pasos.push({e});
  }
  return pasos;
}

function pintarEtapa(p) {
  const e = p.e, par = JR.matriz ? [$('origen').value, $('destino').value] : [];
  const estado = {1: 'Agregando nodo auxiliar', 2: 'Ejecutando Bellman-Ford', 3: 'Potenciales h(v) calculados',
    4: `Reponderando arista ${p.k}/${p.n}`, 5: `Procesando Dijkstra ${p.k}/${p.n}`,
    6: 'Reconstruyendo distancias originales', 7: 'Matriz lista'}[e.etapa];
  let h = fila('Algoritmo', 'Johnson') + fila('Objetivo', 'Caminos mínimos entre todos los pares') +
    fila('Etapa', `${e.etapa}. ${e.titulo}`), mapa = {};
  if (e.etapa === 1) h += fila('Nodo auxiliar', '__S__') + fila('Aristas nuevas (peso 0)', e.aristas_nuevas.length);
  if (e.etapa === 2) h += fila('Pasos de Bellman-Ford', e.pasos);
  if (e.etapa === 3) h += Object.entries(e.h).map(([k, v]) => fila(`h(${k})`, v)).join('');
  if (e.etapa === 4) {
    h += fila('Nodo origen', p.a.u) + fila('Nodo destino', p.a.v) + fila('Peso original', p.a.w) +
      fila('Peso reponderado', p.a.w2) + fila('Cálculo', `${p.a.w} + h(${p.a.u}) − h(${p.a.v})`);
    mapa = {arista: [p.a.u, p.a.v], actual: p.a.u};
  }
  if (e.etapa === 5) {
    h += fila('Nodo origen', p.c.origen) + fila('Nodos explorados', p.c.explorados);
    mapa = {actual: p.c.origen};
  }
  if (e.etapa === 6) h += fila('Fórmula', e.formula);
  if (e.etapa === 7) h += fila('Operaciones totales', JR.ops) + fila('Rutas calculadas', JR.rutas_calculadas);
  $('panel').innerHTML = `<h3>Proceso de Johnson</h3>${h}${fila('Estado', estado)}`;
  dibujar(mapa);
}

function dibujarMatriz() {
  const N = M.nodos;
  let t = '<table><tr><th></th>' + N.map(n => `<th>${n}</th>`).join('') + '</tr>';
  for (const s of N) {
    t += `<tr><th>${s}</th>` + N.map(x => `<td tabindex="0" role="button" class="celda" data-s="${s}" data-t="${x}">${JR.matriz[s][x] ?? '∞'}</td>`).join('') + '</tr>';
  }
  $('matriz').innerHTML = t + '</table>';
  $('matriz').onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.target.click(); } };
  $('matriz').onclick = ev => { const c = ev.target.closest('td.celda'); if (c) mostrarPar(c.dataset.s, c.dataset.t); };
}

function rutaJohnson(s, t) {
  const prev = JR.prevs[s];
  if (t !== s && !prev[t]) return [];
  const r = [t];
  while (r[0] !== s) r.unshift(prev[r[0]]);
  return r;
}

function mostrarPar(s, t) {
  pausar();
  document.querySelectorAll('td.sel').forEach(c => c.classList.remove('sel'));
  const cel = [...document.querySelectorAll('td.celda')].find(c => c.dataset.s === s && c.dataset.t === t);
  if (cel) cel.classList.add('sel');
  const ruta = rutaJohnson(s, t);
  $('detalle').innerHTML = `<h3>${s} → ${t}</h3>` + fila('Ruta mínima', ruta.join(' → ') || 'sin ruta') +
    fila('Costo total', km(JR.matriz[s][t])) + fila('Nodos utilizados', `${ruta.length}: ${ruta.join(', ')}`) +
    fila(`Nodos explorados (Dijkstra desde ${s})`, JR.explorados_por_origen[s]);
  dibujar({ruta});
  if (ruta.length) enfocarRuta(ruta);                                       // la ruta se ve en el mapa
}

arranque();