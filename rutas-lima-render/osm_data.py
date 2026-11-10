"""Local OSMnx export. Runtime routing only uses our Python algorithms."""
import json
from pathlib import Path
from functools import lru_cache

@lru_cache(maxsize=1)
def datos_reales():
    path = Path(__file__).parent / 'datos' / 'miraflores.json'
    if not path.exists():
        raise ValueError('Falta la red vial. Ejecuta preparar_red.py con OSMnx instalado.')
    return json.loads(path.read_text(encoding='utf-8'))

def grafo_real():
    return datos_reales()['aristas']
