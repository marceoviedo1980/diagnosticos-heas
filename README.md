# Buscador de Diagnósticos – HEAS

PWA (sin servidor) para consultar qué **diagnósticos** y **procedimientos** tiene habilitados cada servicio del
Hospital El Alto Sur (HEAS), por ámbito: Consulta externa, Hospitalización, Emergencias, Terapia intensiva y Servicios de apoyo.

Desarrollado por: Marcelo Oviedo Lazcano

## Archivos
- `index.html`, `styles.css`, `script.js` – la aplicación
- `datos_heas.json` – los datos (se genera desde el Excel)
- `sw.js`, `manifest.json`, `icon-*.png` – funcionamiento sin conexión e instalación en el celular
- `datos/fuente.csv` – fuente de los datos · `tools/generar_datos.py` – genera `datos_heas.json`

## Actualizar los datos (1 minuto, sin instalar nada)
1. En GitHub abre `datos/fuente.csv` y pulsa el lápiz (editar). Funciona también desde el celular.
2. Agrega o borra filas con el formato `Descripción,Sigla,Grupo`, por ejemplo:
   `Linfoma de Hodgkin,C81,CE - HEMATOLOGIA - SUS`
3. **Commit changes**. En 1 o 2 minutos una acción automática genera `datos_heas.json` y lo publica.
   Si ves una ❌ en la pestaña **Actions**, abre el detalle: dice qué fila está incompleta o qué grupo está mal escrito, y no se publica nada hasta corregirlo.
4. La app muestra los datos nuevos pocos minutos después.

Para un cambio grande: edita el CSV en Excel (guardar como *CSV UTF-8*) y súbelo con **Add file → Upload files**.
Uso local del generador: `python3 tools/generar_datos.py datos/fuente.csv datos_heas.json`.

## Publicar en GitHub Pages
Settings → Pages → Branch `main` / carpeta `/ (root)`.

## Convivencia con otras PWA del mismo usuario
Todas comparten el dominio `usuario.github.io`, por eso esta app usa nombres propios:
caché `heas-dx-v2`, claves `heasDxRecientes` y `heasDxTema`, y su `manifest` con `id` propio.
