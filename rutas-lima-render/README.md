# Rutas de Lima: calles reales y algoritmos propios

## Iniciar en este equipo
Doble clic en `Iniciar.cmd` y abre http://127.0.0.1:5000. El iniciador usa Python del runtime de Codex y las dependencias incluidas en `.deps`. Detén con Ctrl+C.

En otro equipo: Python 3.12, `python -m pip install -r requirements.txt`, `python app.py`. Los datos de calles ya vienen guardados; iniciar la aplicación no consulta Overpass.

## Modos
- **Miraflores · calles reales (OSMnx)**: 100 nodos y 160 aristas dirigidas de una zona alrededor del parque Kennedy. La consulta usa un recuadro de 450 metros hacia cada lado del centro, no toda Lima. Red para automóvil; cada peso es la longitud vial OSMnx en kilómetros. Las rutas siguen la geometría de las calles y los sentidos de las aristas. Elige nodos por nombre de vías en los selectores o haciendo clic sobre el mapa: primero origen y después destino. Pasa el cursor sobre un nodo para ver su nombre.
- **Lima · modelo de distritos**: los 13 distritos del modelo inicial, con distancias estimadas por haversine multiplicado por 1.3. Sus líneas son esquemáticas.
- **Académico**: ejemplos pequeños de pesos negativos, con y sin ciclo negativo.

## Algoritmos
BFS, DFS, Dijkstra, Bellman-Ford y Johnson están implementados manualmente en `algorithms.py`. OSMnx y su estructura NetworkX se usan solo para descargar, simplificar, guardar e importar datos cartográficos, nunca para resolver caminos. El servidor carga una lista de adyacencia JSON y ejecuta únicamente los algoritmos propios.

BFS minimiza saltos, DFS no garantiza costo mínimo, Dijkstra requiere pesos no negativos, Bellman-Ford detecta ciclos negativos, Johnson calcula la matriz completa reutilizando Bellman-Ford y Dijkstra propios. Hay controles para pasos, reproducción, pausa, velocidad y resultado. Johnson permite consultar cada celda con clic o teclado.

## Preparar o actualizar calles
`python preparar_red.py` descarga la zona mediante OSMnx 2.1.1. En este equipo también puedes usar `Actualizar red.cmd`. Requiere Internet y guarda:
- `datos/miraflores.graphml`: red original simplificada y sus IDs OSM.
- `datos/miraflores.json`: red dirigida, longitudes, geometrías, nombres, IDs y metadatos para la aplicación.
- `datos/cache-osmnx/`: respuesta de Overpass reutilizable.

El exportador conserva la arista más corta entre dos nodos con su misma geometría, longitud e identificador, para adaptar aristas paralelas a los algoritmos educativos. Omite bucles de peso positivo. No agrega conexiones inventadas ni sustituye calles reales por líneas rectas cuando existe geometría.

## Pruebas
`python -m unittest discover -p "test_*.py" -v`.

`test_algorithms.py`: grafo de distritos, casos negativos, 80 grafos reproducibles contrastados con Floyd-Warshall independiente y API. `test_osm.py`: 10000 pares reales contra el mismo oráculo independiente; correspondencia de longitudes con el GraphML original; geometrías orientadas a sus extremos; sentidos únicos; algoritmos y comparación vía API. Las pruebas no usan algoritmos de caminos de NetworkX ni de OSMnx.

## Alcance
Las rutas quedan limitadas a la zona descargada; un par puede ser inalcanzable por los sentidos de circulación o por el recorte. No hay tráfico en tiempo real, restricciones de giro por relaciones OSM ni navegación puerta a puerta. La calidad depende de los datos de OpenStreetMap. Las longitudes son las suministradas por OSMnx, no mediciones certificadas de campo. Johnson genera 9900 pares distintos (más la diagonal), incluyendo pares sin ruta representados por infinito. Sus costos de trabajo total no son directamente comparables con una única búsqueda.

Leaflet, los mosaicos OpenStreetMap, las fuentes y Chart.js cargan recursos externos. La red vial almacenada sí permite calcular sin descargarla de nuevo. Los tiempos incluyen las trazas educativas y son orientativos. Datos © colaboradores de OpenStreetMap, ODbL: https://www.openstreetmap.org/copyright
