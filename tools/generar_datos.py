#!/usr/bin/env python3
"""Genera datos_heas.json a partir de datos/fuente.csv (o un .xlsx), columnas: Descripcion | Sigla | Grupo.

Uso:  python3 tools/generar_datos.py datos/fuente.csv datos_heas.json
      (con .xlsx hace falta:  pip install openpyxl)
Sale con error (codigo 1) si hay filas incompletas; avisa si aparece un grupo nuevo.
"""
import sys, os, json, re, csv, collections, datetime

# grupo del sistema -> (ambito, especialidad a mostrar)
CE, HOSP, EMERG, UTI, APOYO = "ce", "hosp", "emerg", "uti", "apoyo"
ESP = {
 "ANATOMIA PATOLÓGICA - SUS": (APOYO, "Anatomía patológica"),
 "ANESTESIOLOGÍA - SUS": (APOYO, "Anestesiología"),
 "AUDIOLOGIA - SUS": (APOYO, "Audiología"),
 "CE - CIRUGIA CARDIOVASCULAR - SUS": (CE, "Cirugía cardiovascular"),
 "CE - CIRUGIA GASTROENTEROLOGICA - SUS": (CE, "Cirugía gastroenterológica"),
 "CE - CIRUGIA GENERAL - SUS": (CE, "Cirugía general"),
 "CE - CIRUGIA MAXILO FACIAL - SUS": (CE, "Cirugía maxilofacial"),
 "CE - CIRUGIA ONCOLOGICA - SUS": (CE, "Cirugía oncológica"),
 "CE - DERMATOLOGÍA - SUS": (CE, "Dermatología"),
 "CE - ENDOCRINOLOGÍA - SUS": (CE, "Endocrinología"),
 "CE - GASTROENTEROLOGIA - SUS": (CE, "Gastroenterología"),
 "CE - GERIATRIA - SUS": (CE, "Geriatría"),
 "CE - GINECO - OBSTETRICIA - SUS": (CE, "Ginecología y Obstetricia"),
 "SUS - CE - GINECO - OBSTETRICIA": (CE, "Ginecología y Obstetricia"),
 "CE - HEMATOLOGIA - SUS": (CE, "Hematología"),
 "CE - HEMODIALISIS - SUS": (CE, "Hemodiálisis"),
 "CE - INFECTOLOGÍA - SUS": (CE, "Infectología"),
 "CE - MEDICINA DEL DOLOR-PALIATIVO - SUS": (CE, "Medicina del dolor - Paliativo"),
 "CE - MEDICINA FISICA Y REHABILITACION - SUS": (CE, "Medicina física y rehabilitación"),
 "CE - MEDICINA INTERNA - SUS": (CE, "Medicina interna"),
 "CE - MEDICINA NUCLEAR - SUS": (CE, "Medicina nuclear"),
 "CE - NEFROLOGIA - SUS": (CE, "Nefrología"),
 "CE - NEUMOLOGIA - SUS": (CE, "Neumología"),
 "CE - NEUROCIRUGIA - SUS": (CE, "Neurocirugía"),
 "CE - NEUROLOGÍA - SUS": (CE, "Neurología"),
 "CE - NUTRICION - SUS": (CE, "Nutrición"),
 "CE - OFTALMOLOGÍA - SUS": (CE, "Oftalmología"),
 "CE - ONCOLOGIA - SUS": (CE, "Oncología"),
 "CE - OTORRINOLARINGOLOGIA - SUS": (CE, "Otorrinolaringología"),
 "CE - PEDIATRIA - SUS": (CE, "Pediatría"),
 "CE - PSICOLOGIA - SUS": (CE, "Psicología"),
 "CE - PSIQUIATRIA - SUS": (CE, "Psiquiatría"),
 "CE - RADIOTERAPIA - SUS": (CE, "Radioterapia"),
 "CE - REUMATOLOGIA - SUS": (CE, "Reumatología"),
 "CE - TRAUMATOLOGÍA - SUS": (CE, "Traumatología"),
 "CE - UROLOGIA - SUS": (CE, "Urología"),
 "CE-CARDIOLOGÍA - SUS": (CE, "Cardiología"),
 "DISCAPACIDAD - SUS": (APOYO, "Discapacidad"),
 "EMERGENCIAS - SUS": (EMERG, "Emergencias"),
 "FARMACIA - SUS": (APOYO, "Farmacia"),
 "FISIOTERAPIA - SUS": (APOYO, "Fisioterapia"),
 "FONOAUDIOLOGÍA - SUS": (APOYO, "Fonoaudiología"),
 "HOSP - CIRUGIA GENERAL - SUS": (HOSP, "Cirugía general"),
 "HOSP - CIRUGIA MAXILO FACIAL - SUS": (HOSP, "Cirugía maxilofacial"),
 "HOSP - GINECOLOGÍA Y OBSTETRICIA - SUS": (HOSP, "Ginecología y Obstetricia"),
 "HOSP - MEDICINA INTERNA - SUS": (HOSP, "Medicina interna"),
 "HOSP - NEONATOLOGIA - SUS": (HOSP, "Neonatología"),
 "HOSP - OTORRINOLARINGOLOGIA - SUS": (HOSP, "Otorrinolaringología"),
 "HOSP - PEDIATRIA - SUS": (HOSP, "Pediatría"),
 "SUS - HOSP - PEDIATRIA": (HOSP, "Pediatría"),
 "HOSP - TRAUMATOLOGÍA - SUS": (HOSP, "Traumatología"),
 "HOSP - UROLOGIA - SUS": (HOSP, "Urología"),
 "IMAGENOLOGIA - SUS": (APOYO, "Imagenología"),
 "LABORATORIO - SUS": (APOYO, "Laboratorio"),
 "TELESALUD - SUS": (APOYO, "Telesalud"),
 "TERAPIA INTENSIVA - SUS": (UTI, "Terapia intensiva"),
 "TERAPIA INTENSIVA NEONATAL - SUS": (UTI, "Terapia intensiva neonatal"),
 "UNIDAD TRANSFUSIONAL - SUS": (APOYO, "Unidad transfusional"),
}

def clasificar(grupo):
    g = re.sub(r"\s+", " ", str(grupo).strip())
    if g not in ESP:
        raise KeyError(g)
    return ESP[g]

def leer_filas(src):
    if src.lower().endswith(".csv"):
        with open(src, newline="", encoding="utf-8-sig") as f:
            lector = csv.reader(f)
            next(lector, None)  # encabezado
            return [tuple((c or "").strip() for c in r[:3]) + ("",) * (3 - len(r[:3])) for r in lector if any((c or "").strip() for c in r)]
    import openpyxl
    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
    return [tuple(str(c or "").strip() for c in r[:3]) for r in ws.iter_rows(min_row=2, values_only=True) if r and any(r[:3])]

def aplicar_cambios(filas, ruta):
    """datos/cambios.csv: Accion,Descripción,Sigla,Grupo   (Accion = AGREGAR o QUITAR). Se aplica en orden."""
    if not os.path.exists(ruta):
        return filas
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        lector = csv.reader(f)
        next(lector, None)
        cambios = [[(c or "").strip() for c in r] + [""] * 4 for r in lector if any((c or "").strip() for c in r)]
    filas = list(filas)
    errores = []
    for n, (acc, desc, sigla, grupo) in [(i + 2, c[:4]) for i, c in enumerate(cambios)]:
        a = acc.upper()
        s_ = re.sub(r"\s+", "", sigla).upper()
        if a in ("AGREGAR", "AGREGA", "AÑADIR", "ANADIR", "ALTA"):
            if not s_ or not grupo:
                errores.append(f"cambios.csv fila {n}: AGREGAR necesita Sigla y Grupo"); continue
            if not desc:  # si el código ya existe, se reutiliza su descripción
                desc = next((f[0] for f in filas if re.sub(r"\s+", "", f[1]).upper() == s_), "")
            if not desc:
                errores.append(f"cambios.csv fila {n}: el código {s_} es nuevo; falta la Descripción"); continue
            if not any(re.sub(r"\s+", "", f[1]).upper() == s_ and f[2] == grupo for f in filas):
                filas.append((desc, s_, grupo))
        elif a in ("QUITAR", "QUITA", "BORRAR", "ELIMINAR", "BAJA"):
            antes = len(filas)
            filas = [f for f in filas if not (re.sub(r"\s+", "", f[1]).upper() == s_ and (not grupo or f[2] == grupo))]
            if len(filas) == antes:
                print(f"AVISO cambios.csv fila {n}: no había {s_} / {grupo or '(todos los grupos)'} para quitar", file=sys.stderr)
        else:
            errores.append(f"cambios.csv fila {n}: Accion {acc!r} no reconocida (use AGREGAR o QUITAR)")
    if errores:
        for e in errores: print("ERROR:", e, file=sys.stderr)
        sys.exit(1)
    print(f"{len(cambios)} cambios aplicados desde cambios.csv")
    return filas

def main(src, dst):
    filas = leer_filas(src)
    filas = aplicar_cambios(filas, os.path.join(os.path.dirname(os.path.abspath(src)), "cambios.csv"))
    malas = [(i + 2, f) for i, f in enumerate(filas) if not all(f)]
    if malas:
        for n, f in malas[:20]:
            print(f"ERROR fila {n}: incompleta {f}", file=sys.stderr)
        sys.exit(1)
    if len(filas) < 1000:
        print(f"ERROR: solo {len(filas)} filas; el archivo parece incompleto y no se genera nada.", file=sys.stderr)
        sys.exit(1)
    desconocidos = collections.Counter()
    servicios, indice = [], {}
    por_codigo = collections.OrderedDict()
    nombres = collections.defaultdict(collections.Counter)
    for desc, sigla, grupo in filas:
        sigla = re.sub(r"\s+", "", sigla).upper()
        try:
            a, e = clasificar(grupo)
        except KeyError:
            desconocidos[grupo] += 1
            continue
        if (a, e) not in indice:
            indice[(a, e)] = len(servicios)
            servicios.append({"a": a, "e": e})
        por_codigo.setdefault(sigla, set()).add(indice[(a, e)])
        nombres[sigla][re.sub(r"\s+", " ", desc)] += 1
    if desconocidos:
        for g, n in desconocidos.items():
            print(f"ERROR: grupo no reconocido {g!r} ({n} filas). Revise que esté escrito igual que los demás; "
                  "si es un grupo nuevo, agréguelo a la tabla ESP de tools/generar_datos.py.", file=sys.stderr)
        sys.exit(1)
    items = [[c, nombres[c].most_common(1)[0][0], sorted(g)] for c, g in por_codigo.items()]
    items.sort(key=lambda x: x[0])
    datos = {"version": datetime.date.today().isoformat(), "servicios": servicios, "items": items}
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(filas)} filas -> {len(items)} códigos, {len(servicios)} servicios -> {dst}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
