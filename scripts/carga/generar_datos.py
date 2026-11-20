import random, datetime, sys
random.seed(2026)
H=open(sys.argv[1]).read().strip()
OUT=open(sys.argv[2],"w",encoding="utf-8")
N_CENTROS=233; TOTAL=4000
# Reparto desigual realista (log-normal), normalizado a 4000
pesos=[random.lognormvariate(0,0.6) for _ in range(N_CENTROS)]
f=TOTAL/sum(pesos); n=[max(4,round(p*f)) for p in pesos]
while sum(n)>TOTAL: i=random.randrange(N_CENTROS); n[i]=max(4,n[i]-1)
while sum(n)<TOTAL: n[random.randrange(N_CENTROS)]+=1
NOW="'2026-11-20 08:00:00.000'"
GRADOS={"Técnico en Gestión Administrativa":{1:[("0437","Comunicación empresarial y atención al cliente"),("0438","Operaciones administrativas de compraventa"),("0439","Empresa y Administración"),("0440","Tratamiento informático de la información"),("0441","Técnica contable"),("0156","Inglés profesional")],2:[("0442","Operaciones administrativas de recursos humanos"),("0443","Tratamiento de la documentación contable"),("0446","Empresa en el aula"),("0448","Operaciones auxiliares de gestión de tesorería"),("0451","Formación en centros de trabajo")]},
"Técnico en Sistemas Microinformáticos y Redes":{1:[("0221","Montaje y mantenimiento de equipos"),("0222","Sistemas operativos monopuesto"),("0223","Aplicaciones ofimáticas"),("0225","Redes locales"),("0229","Formación y orientación laboral"),("0156","Inglés profesional")],2:[("0224","Sistemas operativos en red"),("0226","Seguridad informática"),("0227","Servicios en red"),("0228","Aplicaciones web"),("0230","Empresa e iniciativa emprendedora")]}}
L="TRWAGMYFPDXBNJZSQVHLCKE"
def dni(k): return f"{k:08d}{L[k%23]}"
NOMBRES=["Lucía","Daniel","Sara","Hugo","Marta","Adrián","Paula","Iván","Noelia","Sergio","Carla","Pablo","Elena","Mario","Laura","Álvaro","Irene","Jorge","Nerea","Raúl"]
APELL=["García","Martín","López","Sánchez","Pérez","Gómez","Fernández","Ruiz","Díaz","Moreno","Álvarez","Romero","Navarro","Torres","Domínguez","Vázquez","Ramos","Gil","Serrano","Molina"]
rows={k:[] for k in ["centros","usuarios","cursos","grados","prof","asig","alum","mat","conv","asis","dias"]}
ids={k:0 for k in rows}
def nid(k): ids[k]+=1; return ids[k]
def q(s): return "'"+str(s).replace("'","''")+"'"
dniseq=40000000
for c in range(N_CENTROS):
    cid=nid("centros"); cod=f"281{c+1:05d}"
    rows["centros"].append(f"({cid},{q('IES Centro de Carga '+str(c+1))},{q(cod)},'Q2800000A','Calle Prueba 1','Madrid','Madrid','910000000',{q(f'centro{c+1}@carga.local')},1,{NOW},{NOW})")
    rows["usuarios"].append(f"({nid('usuarios')},{cid},{q('Secretaría '+str(c+1))},{q(f'carga{c+1}@carga.local')},{q(H)},1,0,NULL,NULL,{NOW},{NOW})")
    cur=nid("cursos"); rows["cursos"].append(f"({cur},{cid},'2026-2027','2026-09-01 00:00:00.000','2027-06-30 00:00:00.000',1,1,{NOW},{NOW})")
    asig_por={}
    for gnom,cursos in GRADOS.items():
        gid=nid("grados"); rows["grados"].append(f"({gid},{cid},{q(gnom)},1,{NOW},{NOW})")
        for cu,mods in cursos.items():
            lista=[]
            for i,(co,no) in enumerate(mods):
                pid=nid("prof"); dniseq+=1
                rows["prof"].append(f"({pid},{cid},{q(random.choice(NOMBRES))},{q(random.choice(APELL)+' '+random.choice(APELL))},{q(dni(dniseq))},1,{NOW},{NOW})")
                aid=nid("asig"); rows["asig"].append(f"({aid},{cid},{gid},{pid},{cu},{q(co)},{q(no)},{NOW},{NOW})")
                lista.append(aid)
            asig_por[(gid,cu)]=lista
    claves=list(asig_por.keys())
    for s in range(n[c]):
        alid=nid("alum"); dniseq+=1
        rows["alum"].append(f"({alid},{cid},{q(random.choice(NOMBRES))},{q(random.choice(APELL)+' '+random.choice(APELL))},{q(dni(dniseq))},1,{NOW},{NOW})")
        gid,cu=random.choice(claves)
        mid=nid("mat"); rows["mat"].append(f"({mid},{cid},{alid},{cur},{gid},{cu},{q(f'2026/{s+1:03d}')},1,{NOW},{NOW})")
        conv=set()
        if random.random()<0.03:
            a=random.choice(asig_por[(gid,cu)]); conv.add(a); rows["conv"].append(f"({nid('conv')},{mid},{a},{NOW},{NOW})")
        for ai,a in enumerate(asig_por[(gid,cu)]):
            if a in conv: continue
            for mes,ult in [(9,30),(10,31),(11,27)]:
                asid=nid("asis"); ta=tn=0; dias=[]
                for d in range(1,ult+1):
                    dt=datetime.date(2026,mes,d)
                    if dt.weekday()>4: continue
                    if (d+ai)%5 not in (0,2): continue
                    falta=random.random()<0.08
                    ha,hn=(0,3) if falta else (3,0); ta+=ha; tn+=hn
                    dias.append(f"({asid},'{dt}',{ha},{hn},{NOW},{NOW})")
                rows["asis"].append(f"({asid},{cid},{mid},{a},2026,{mes},{ta},{tn},NULL,{NOW},{NOW})")
                rows["dias"].extend(dias)
cols={"centros":"centros (id,nombre,codigo,cif,direccion,localidad,provincia,telefono,email,activo,created_at,updated_at)",
"usuarios":"usuarios (id,centro_id,nombre,email,password_hash,activo,debe_cambiar_clave,clave_temporal_expira,clave_actualizada_at,created_at,updated_at)",
"cursos":"cursos_academicos (id,centro_id,nombre,fecha_inicio,fecha_fin,activo,actual,created_at,updated_at)",
"grados":"grados (id,centro_id,nombre,activo,created_at,updated_at)",
"prof":"profesores (id,centro_id,nombre,apellidos,dni,activo,created_at,updated_at)",
"asig":"asignaturas (id,centro_id,grado_id,profesor_id,curso,codigo,nombre,created_at,updated_at)",
"alum":"alumnos (id,centro_id,nombre,apellidos,dni,activo,created_at,updated_at)",
"mat":"matriculas (id,centro_id,alumno_id,curso_academico_id,grado_id,curso,expediente,activo,created_at,updated_at)",
"conv":"matriculas_asignaturas_convalidadas (id,matricula_id,asignatura_id,created_at,updated_at)",
"asis":"asistencias (id,centro_id,matricula_id,asignatura_id,anio,mes,horas_asistidas,horas_no_asistidas,observaciones,created_at,updated_at)",
"dias":"asistencias_dias (asistencia_id,fecha,horas_asistidas,horas_no_asistidas,created_at,updated_at)"}
OUT.write("SET NAMES utf8mb4; SET foreign_key_checks=0; SET unique_checks=0; SET autocommit=0;\n")
for k in ["centros","usuarios","cursos","grados","prof","asig","alum","mat","conv","asis","dias"]:
    r=rows[k]
    for i in range(0,len(r),2000):
        OUT.write(f"INSERT INTO {cols[k]} VALUES\n"+",\n".join(r[i:i+2000])+";\n")
OUT.write("COMMIT; SET foreign_key_checks=1; SET unique_checks=1;\n")
print({k:len(v) for k,v in rows.items()}, "min/max alumnos por centro:", min(n), max(n), "media:", round(sum(n)/len(n),1))
import json; json.dump({"alumnos_por_centro":n},open(sys.argv[2]+".json","w"))
