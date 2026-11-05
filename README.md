# Buscador de Diagnósticos – HEAS

PWA (sin servidor) para consultar qué **diagnósticos** y **procedimientos** tiene habilitados cada servicio del
Hospital El Alto Sur (HEAS), por ámbito: Consulta externa, Hospitalización, Emergencias, Terapia intensiva y Servicios de apoyo.

Desarrollado por: Marcelo Oviedo Lazcano

## Archivos
- `index.html`, `styles.css`, `script.js` – la aplicación
- `datos_heas.json` – los datos (se genera desde el Excel)
- `sw.js`, `manifest.json`, `icon-*.png` – funcionamiento sin conexión e instalación en el celular
- `tools/excel_a_json.py` – convierte el Excel en `datos_heas.json`

## Actualizar los datos
1. Excel con 3 columnas: Descripción | Sigla | Grupo.
2. `pip install openpyxl`
3. `python3 tools/excel_a_json.py MI_EXCEL.xlsx datos_heas.json`
4. Subir `datos_heas.json` al repositorio (rama `main`). La app lo descarga de GitHub al abrirse.
   Si aparece un grupo nuevo, el script avisa para agregarlo a la tabla `ESP` del mismo archivo.

## Publicar en GitHub Pages
Settings → Pages → Branch `main` / carpeta `/ (root)`.

## Convivencia con otras PWA del mismo usuario
Todas comparten el dominio `usuario.github.io`, por eso esta app usa nombres propios:
caché `heas-dx-v2`, claves `heasDxRecientes` y `heasDxTema`, y su `manifest` con `id` propio.
