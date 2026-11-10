const $ = id => document.getElementById(id);
const NOMBRES = {bfs: 'BFS', dfs: 'DFS', dijkstra: 'Dijkstra', 'bellman-ford': 'Bellman–Ford', johnson: 'Johnson'};
const COLORES = ['#c3f56a', '#78b9ff', '#ffbf69', '#ff786f', '#bca0ff'];
const charts = {};

function grafico(id, filas, campo, color) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), {
    type: 'bar',
    data: {
      labels: filas.map(f => NOMBRES[f.algo]),
      datasets: [{
        data: filas.map(f => f[campo]),
        backgroundColor: filas.map(f => COLORES[Object.keys(NOMBRES).indexOf(f.algo)] || color),
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {duration: 450},
      plugins: {
        legend: {display: false},
        tooltip: {
          backgroundColor: '#202722',
          borderColor: '#3a463d',
          borderWidth: 1,
          titleColor: '#f0f3ef',
          bodyColor: '#c3f56a',
          displayColors: false,
          padding: 10
        }
      },
      scales: {
        x: {ticks: {color: '#a0aaa2', font: {family: 'DM Mono', size: 9}}, grid: {display: false}, border: {display: false}},
        y: {beginAtZero: true, ticks: {color: '#768178', font: {family: 'DM Mono', size: 9}, maxTicksLimit: 5}, grid: {color: 'rgba(160,170,162,.1)'}, border: {display: false}}
      }
    }
  });
}

async function comparar() {
  const boton = $('btn');
  const tabla = $('tabla');
  boton.disabled = true;
  boton.textContent = 'Calculando…';
  tabla.innerHTML = '<p class="estado-cargando">Ejecutando las cinco implementaciones…</p>';
  try {
    const url = `/api/comparar?modo=${encodeURIComponent($('modo').value)}&origen=${encodeURIComponent($('origen').value)}&destino=${encodeURIComponent($('destino').value)}`;
    const response = await fetch(url);
    const filas = await response.json();
    if (!response.ok || filas.error) throw new Error(filas.error || 'No se pudo comparar el rendimiento.');
    grafico('g1', filas, 'explorados', '#c3f56a');
    grafico('g2', filas, 'ms', '#ffbf69');
    grafico('g3', filas, 'caminos', '#78b9ff');
    tabla.innerHTML = '<table><thead><tr><th>Algoritmo</th><th>Nodos explorados</th><th>Tiempo (ms)</th><th>Operaciones</th><th>Costo de ruta (km)</th><th>Caminos calculados</th></tr></thead><tbody>' +
      filas.map(f => `<tr><td><span class="punto-algoritmo" style="--color:${COLORES[Object.keys(NOMBRES).indexOf(f.algo)]}"></span>${NOMBRES[f.algo]}</td><td>${f.explorados}</td><td>${f.ms}</td><td>${f.ops}</td><td>${f.costo == null ? '∞' : f.costo}</td><td>${f.caminos}</td></tr>`).join('') + '</tbody></table>';
  } catch (error) {
    tabla.innerHTML = '';
    const mensaje = document.createElement('p');
    mensaje.className = 'mal estado-cargando';
    mensaje.textContent = error.message || 'No se pudo conectar con el servidor.';
    tabla.appendChild(mensaje);
  } finally {
    boton.disabled = false;
    boton.innerHTML = 'Comparar algoritmos <span aria-hidden="true">↗</span>';
  }
}

async function cargarComparacion() {
  const tabla = $('tabla');
  try {
    const response = await fetch('/api/grafo?modo=' + encodeURIComponent($('modo').value));
    const g = await response.json();
    if (!response.ok || g.error) throw new Error(g.error || 'No se pudo cargar el grafo.');
    for (const id of ['origen', 'destino']) $(id).replaceChildren(...g.nodos.map(n => new Option(g.etiquetas?.[n] || n,n)));
    $('destino').selectedIndex = Math.max(0, g.nodos.indexOf('Chorrillos'));
    if (g.seleccion_inicial) { $('origen').value = g.seleccion_inicial.origen; $('destino').value = g.seleccion_inicial.destino; }
    $('btn').onclick = comparar;
    comparar();
  } catch (error) {
    tabla.textContent = error.message || 'No se pudo conectar con el servidor.';
    tabla.classList.add('mal');
  }
}
$('modo').onchange = cargarComparacion;
cargarComparacion();
