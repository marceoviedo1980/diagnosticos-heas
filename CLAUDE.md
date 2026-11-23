# Buscador de Diagnósticos HEAS (PWA)

PWA estática (sin servidor, GitHub Pages) de **Marcelo Oviedo Lazcano** para el Hospital El Alto Sur (HEAS).
Muestra, por diagnóstico o procedimiento, en qué **ámbito** (Consulta externa, Hospitalización, Emergencias,
Terapia intensiva, Servicios de apoyo) y en qué **especialidad** está habilitado.
Usa el término **Procedimientos** (no "prestaciones"). Responder siempre en español.

## Cómo se actualizan los datos (lo más frecuente)
Fuente: **`datos/fuente.csv`** (base, columnas `Descripción,Sigla,Grupo`, una fila por código + grupo) más
**`datos/cambios.csv`** (ajustes del día a día: `Accion,Descripción,Sigla,Grupo,Fecha`, con `AGREGAR` o `QUITAR`, aplicados
en orden sobre la base). `datos_heas.json` se **genera**; no se edita a mano.
- Para un pedido nuevo ("agregar C81 a CE Hematología"): añadir una línea a `datos/cambios.csv`
  (`AGREGAR,,C81,CE - HEMATOLOGIA - SUS`). `QUITAR,,J45,` sin grupo quita el código de todos los servicios.
  Un código que no existe necesita Descripción (tal como figura en el sistema del hospital).
- La columna `Fecha` (AAAA-MM-DD) es opcional: con fecha, el cambio sale en la campanita 🔔 de Novedades (se guarda en `novedades` de
  `datos_heas.json`, máx. 30, más recientes primero). En la app lo ya visto se recuerda en `heasDxNovVistas`. Para pedidos nuevos, poner siempre la fecha del día.
  Un `AGREGAR` con fecha se anuncia aunque `fuente.csv` ya traiga ese código y grupo.
- `AVISO,"Texto",,,AAAA-MM-DD` publica un aviso general en la campanita (tarjeta "📢 Aviso", sin código; no cambia datos).
- Actualización completa: se reemplaza `datos/fuente.csv` entero con la lista vigente del sistema del hospital
  (solo grupos de la tabla `ESP`, códigos con punto) y se anuncia con un `AVISO`. No anunciar uno por uno los cambios
  masivos ni las correcciones. **No mencionar en la app, el repositorio ni los commits el nombre del sistema de origen.**
- **CIE-10 no habilitados:** `datos/cie10_catalogo.csv` (`Descripción,Sigla`, todos los CIE-10 del sistema del hospital).
  El script genera `nh` en el JSON: los del catálogo sin servicio, con ámbito sugerido (`"ce,hosp"`, `"ext"` para causas
  externas V–Y, `""` sin sugerencia): 1) ámbitos de los habilitados de la misma categoría; 2) si no hay, los que tiene
  ≥ la mitad de los habilitados del bloque (letra + 1er dígito). En la app: bloque aparte en Buscar (solo diagnósticos,
  con texto y sin filtros), cerrado; si no hay ningún habilitado, las tarjetas van directo (sin barra ni aviso) para que se vean en la primera pantalla. Textos acordados: "CIE-10 no habilitados",
  "CIE-10 NO HABILITADO", "Sugerido: …" con los nombres de ámbito de la app (nunca "Mixto" ni "Ambulatorio"),
  "Puede solicitarse su habilitación en Farmacia." Sin sugerir especialidad y sin etiqueta de Productos SUS.
  En una actualización completa, regenerar también el catálogo con todos los CIE-10 del sistema (cualquier vigencia).
- El nombre del grupo debe ser EXACTO (tabla `ESP` en `tools/generar_datos.py`).
- Regenerar: `python3 tools/generar_datos.py datos/fuente.csv datos_heas.json`; subir CSV y JSON a `main`.
  Si solo se sube un CSV, la acción `.github/workflows/actualizar-datos.yml` regenera y publica el JSON sola.
- Un grupo mal escrito o nuevo hace que el script **falle** con un mensaje claro (así un error de tipeo no publica un
  servicio falso): corregir el texto o, si es un grupo nuevo, añadirlo a `ESP` (ámbito + nombre de especialidad).
- Los datos nuevos tardan unos minutos en llegar a los celulares (caché de GitHub raw).
- NO hace falta tocar `sw.js` para cambios de datos; solo si cambian archivos de la app (subir `CACHE_NAME`).

## Reglas de convivencia con las otras PWA del usuario (mismo dominio `marceoviedo1980.github.io`)
Mantener nombres propios: caché `heas-dx-*`, claves `heasDx…` en localStorage, `id` de manifest propio.
Nunca borrar cachés ni datos que no empiecen con `heas-dx`/`heasDx`.

## Archivos
`index.html`, `styles.css`, `script.js` (app) · `sw.js` (red primero) · `manifest.json` + iconos ·
`datos/fuente.csv` + `datos/cambios.csv` (fuentes) · `datos_heas.json` (generado) · `tools/generar_datos.py`.

## Notas
- Rama de trabajo: `main`. Probar en navegador móvil antes de subir cambios de interfaz.
- Convención de commits: mensaje en español, claro y corto.
- Códigos: diagnóstico = letra+2 dígitos (+ `.dígito`); procedimiento = letra+8 dígitos.
