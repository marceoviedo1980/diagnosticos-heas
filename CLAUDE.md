# Buscador de Diagnósticos HEAS (PWA)

PWA estática (sin servidor, GitHub Pages) de **Marcelo Oviedo Lazcano** para el Hospital El Alto Sur (HEAS).
Muestra, por diagnóstico o procedimiento, en qué **ámbito** (Consulta externa, Hospitalización, Emergencias,
Terapia intensiva, Servicios de apoyo) y en qué **especialidad** está habilitado.
Usa el término **Procedimientos** (no "prestaciones"). Responder siempre en español.

## Cómo se actualizan los datos (lo más frecuente)
La única fuente de datos es **`datos/fuente.csv`** (columnas `Descripción,Sigla,Grupo`, UTF-8, una fila por
código + grupo). `datos_heas.json` se **genera**; no se edita a mano.
- Agregar un servicio a un código: añadir una fila con ese código y el grupo (nombre del grupo EXACTO, ver tabla `ESP`
  en `tools/generar_datos.py`). Quitar: borrar esa fila.
- Si el código no existe todavía: usar la descripción tal como figura en el sistema del hospital.
- Regenerar:  `python3 tools/generar_datos.py datos/fuente.csv datos_heas.json`
- Subir ambos archivos a `main`. (Si solo se sube el CSV, la acción `.github/workflows/actualizar-datos.yml`
  regenera y publica el JSON sola.)
- Un grupo mal escrito o nuevo hace que el script **falle** con un mensaje claro (así un error de tipeo no publica un servicio falso): corregir el texto o, si es un grupo nuevo, añadirlo a `ESP` (ámbito + nombre de especialidad).
- Los datos nuevos tardan unos minutos en llegar a los celulares (la caché de GitHub raw).
- NO hace falta tocar `sw.js` para cambios de datos; solo si cambian archivos de la app (subir `CACHE_NAME`).

## Reglas de convivencia con las otras PWA del usuario (mismo dominio `marceoviedo1980.github.io`)
Mantener nombres propios: caché `heas-dx-*`, claves `heasDx…` en localStorage, `id` de manifest propio.
Nunca borrar cachés ni datos que no empiecen con `heas-dx`/`heasDx`.

## Archivos
`index.html`, `styles.css`, `script.js` (app) · `sw.js` (red primero) · `manifest.json` + iconos ·
`datos/fuente.csv` (fuente) · `datos_heas.json` (generado) · `tools/generar_datos.py`.

## Notas
- Rama de trabajo: `main`. Probar en navegador móvil antes de subir cambios de interfaz.
- Convención de commits: mensaje en español, claro y corto.
- Códigos: diagnóstico = letra+2 dígitos (+ `.dígito`); procedimiento = letra+8 dígitos.
