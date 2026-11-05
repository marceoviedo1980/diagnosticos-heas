#!/usr/bin/env python3
"""Convierte el Excel de HEAS (Descripcion | Sigla | Grupo) en datos_heas.json.

Uso:  python3 tools/excel_a_json.py RESULTADO.xlsx datos_heas.json
Requiere:  pip install openpyxl
"""
import sys, json, re, collections, datetime
import openpyxl

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
    if g in ESP:
        return ESP[g]
    # grupo nuevo: se deduce del prefijo y se avisa
    a = CE if g.upper().startswith(("CE", "SUS - CE")) else HOSP if g.upper().startswith(("HOSP", "SUS - HOSP")) else APOYO
    e = re.sub(r"^(SUS - )?(CE|HOSP)\s*-\s*", "", re.sub(r"\s*-\s*SUS$", "", g)).strip().capitalize()
    print("AVISO: grupo nuevo sin clasificar, deducido:", repr(g), "->", a, e, file=sys.stderr)
    return a, e

def main(src, dst):
    ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
    filas = [r for r in ws.iter_rows(min_row=2, values_only=True) if r and r[1]]
    servicios, indice = [], {}
    por_codigo = collections.OrderedDict()
    nombres = collections.defaultdict(collections.Counter)
    for desc, sigla, grupo in filas:
        sigla = re.sub(r"\s+", "", str(sigla)).upper()
        a, e = clasificar(grupo)
        if (a, e) not in indice:
            indice[(a, e)] = len(servicios)
            servicios.append({"a": a, "e": e})
        por_codigo.setdefault(sigla, set()).add(indice[(a, e)])
        nombres[sigla][re.sub(r"\s+", " ", str(desc or "").strip())] += 1
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
