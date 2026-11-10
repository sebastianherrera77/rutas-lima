# Publicar Rutas de Lima en Render

## 1. Subir el proyecto a GitHub

1. Descomprime `rutas-lima-render.zip` en una carpeta nueva.
2. En https://github.com/new crea un repositorio llamado `rutas-lima`. Puede ser privado; autoriza a Render a acceder a él cuando lo conectes.
3. En el repositorio usa **uploading an existing file** (o **Add file > Upload files** si ya tiene archivos).
4. Arrastra el contenido de la carpeta descomprimida, incluidas las carpetas `static` y `datos`, y confirma con **Commit changes**. `app.py` y `requirements-render.txt` deben quedar en la raíz del repositorio, sin otra carpeta contenedora.

El ZIP ya excluye `.deps`, entornos virtuales, archivos temporales y la caché de descargas. Incluye `datos/miraflores.json` y el GraphML para que las calles estén disponibles sin descargarlas durante el despliegue.

## 2. Crear el servicio

1. Entra a https://dashboard.render.com y conecta tu cuenta GitHub.
2. Selecciona **New > Web Service** y el repositorio `rutas-lima`.
3. Configura:

| Campo | Valor |
| --- | --- |
| Name | rutas-lima (o cualquier nombre disponible) |
| Language / Runtime | Python 3 |
| Branch | main (o la rama donde subiste el proyecto) |
| Root Directory | vacío si app.py está en la raíz |
| Build Command | `pip install -r requirements-render.txt` |
| Start Command | `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 app:app` |
| Instance Type | Free, si está disponible para tu cuenta |

La versión se configura con `.python-version` (3.12). Si no subiste ese archivo oculto, agrégalo desde **Add file > Create new file** en GitHub, con nombre `.python-version` y contenido `3.12`.

4. Pulsa **Deploy Web Service**. Espera a que el estado indique **Live** y abre la URL `https://<nombre-asignado>.onrender.com` que muestre Render. Ese es el enlace para compartir.

## 3. Comprobar el sitio

Selecciona Miraflores, Dijkstra y Buscar ruta. Comprueba también Johnson y la página Rendimiento. `/api/grafo?modo=real` debe devolver la red con 100 nodos. No necesitas subir `Iniciar.cmd` para ejecutar el servidor en Render; el inicio usa Gunicorn.

## Dependencias y límites

`requirements-render.txt` instala Flask y Gunicorn. La descarga con OSMnx se hizo previamente y está incluida en `datos`; no es necesario instalar la pila geoespacial en el servidor para calcular rutas. Para actualizar las calles en tu PC usa `Actualizar red.cmd` y luego sube los datos actualizados a GitHub. El archivo `requirements.txt` conserva OSMnx para ese trabajo local.

El servicio gratuito se suspende tras 15 minutos sin tráfico; al volver a abrirlo puede tardar aproximadamente un minuto en despertar. La aplicación no necesita base de datos ni disco persistente. La publicación y conexión de cuentas se realizan desde tus cuentas; este paquete aún no está desplegado.

Documentación: https://render.com/docs/deploy-flask | https://render.com/docs/python-version | https://render.com/docs/free
