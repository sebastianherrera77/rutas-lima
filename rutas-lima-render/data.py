"""Grafo didáctico de distritos de Lima. Pesos = km aproximados (haversine x 1.3)."""
import math

COORDS = {
    "San Isidro": (-12.0977, -77.0365), "Miraflores": (-12.1219, -77.0297),
    "Barranco": (-12.1403, -77.0206), "Surco": (-12.1453, -76.9917),
    "Chorrillos": (-12.1688, -77.0128), "Lince": (-12.0833, -77.0333),
    "Jesús María": (-12.0706, -77.0517), "San Borja": (-12.1086, -77.0022),
    "La Molina": (-12.0800, -76.9050), "Surquillo": (-12.1117, -77.0172),
    "Magdalena": (-12.0889, -77.0719), "San Miguel": (-12.0789, -77.0883),
    "Cercado de Lima": (-12.0464, -77.0428),
}
VECINOS = [
    ("San Isidro", "Lince"), ("San Isidro", "Miraflores"), ("San Isidro", "Magdalena"),
    ("San Isidro", "Jesús María"), ("San Isidro", "San Borja"), ("San Isidro", "Surquillo"),
    ("Lince", "Jesús María"), ("Lince", "Cercado de Lima"), ("Jesús María", "Cercado de Lima"),
    ("Jesús María", "Magdalena"), ("Magdalena", "San Miguel"), ("San Miguel", "Cercado de Lima"),
    ("Miraflores", "Surquillo"), ("Miraflores", "Barranco"), ("Surquillo", "San Borja"),
    ("Surquillo", "Surco"), ("San Borja", "Surco"), ("San Borja", "La Molina"),
    ("Surco", "La Molina"), ("Surco", "Barranco"), ("Surco", "Chorrillos"),
    ("Barranco", "Chorrillos"),
]

def _km(a, b):
    (la1, lo1), (la2, lo2) = map(lambda x: tuple(map(math.radians, x)), (COORDS[a], COORDS[b]))
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return max(0.5, round(2*6371*math.asin(math.sqrt(h))*1.3, 1))

def grafo_lima():
    g = {v: [] for v in COORDS}
    for a, b in VECINOS:          # calles de doble sentido, sin pesos negativos
        w = _km(a, b); g[a].append((b, w)); g[b].append((a, w))
    return g

# Modo académico: pesos negativos sin ciclo, y otro con ciclo negativo
ACADEMICO = {"A": [("B", 4), ("C", 5)], "B": [("C", -3)], "C": [("D", 2)], "D": []}
ACADEMICO_CICLO = {"A": [("B", 1)], "B": [("C", -3)], "C": [("A", 1), ("D", 2)], "D": []}