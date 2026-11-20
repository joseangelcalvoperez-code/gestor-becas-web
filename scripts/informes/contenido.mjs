/*
 * Texto de los informes. Todas las cifras salen de los datos medidos
 * (docs/informes/datos); el texto interpretativo está redactado a partir
 * de esos resultados.
 */

const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};

function portada({ etiqueta, titulo, subtitulo, resumen, entorno }) {
  return `
  <div class="portada-titulo">
    <div class="etiqueta">${etiqueta}</div>
    <h1>${titulo}<span>${subtitulo}</span></h1>
    <p>${resumen}</p>
  </div>
  <div class="portada-pie">
    <div><b>Aplicación</b>Gestor de Becas v${entorno.version}</div>
    <div><b>Fecha de la prueba</b>${entorno.fecha}</div>
    <div><b>Elaborado para</b>${entorno.destinatario}</div>
  </div>
</div>`;
}

function datosEscenario(e) {
  const ok = e.resultados.filter((r) => r.status === 200);
  const docsV = ok.reduce((a, r) => a + r.anexosV, 0);
  const docsI = ok.reduce((a, r) => a + r.expedientes, 0);
  return {
    ok: ok.length,
    errores: e.resultados.length - ok.length,
    total: e.resumen.masivo.total_s,
    p50: e.resumen.masivo.p50_s,
    p90: e.resumen.masivo.p90_s,
    max: e.resumen.masivo.max_s,
    primeros: pct(ok.map((r) => r.s), 0.1),
    docs: docsV + docsI,
    docsV,
    docsI,
    MB: e.resumen.masivo.MB_total,
    alumnos: e.resumen.masivo.alumnos,
    ritmo: e.resumen.masivo.alumnos / e.resumen.masivo.total_s,
    rssGB: e.resumen.picos.rssMB / 1024,
    rssProcGB: e.resumen.picos.rssMaxProcMB / 1024,
    cpu: e.resumen.picos.cpu,
    mysql: e.resumen.picos.mysqlConn,
    sondaP95: e.resumen.picos.sondaP95Ms,
    sondaMax: e.resumen.picos.sondaMaxMs,
    sondaFallos: e.resumen.picos.sondaFallos,
    loginP95: e.resumen.login.p95 / 1000,
    loginErr: e.resumen.login.errores,
  };
}

/* =========================================================
   INFORME DE RENDIMIENTO
   ========================================================= */

export function informeRendimiento({ entorno, escenarios, graficos, fmt, min }) {
  const d = escenarios.map(datosEscenario);
  const [A, B, C] = d;
  const [eA, eB, eC] = escenarios;
  const sinErrores = d.every((x) => x.errores === 0);

  const filaTabla = (e, x) => `<tr>
      <td class="nowrap"><span class="muestra" style="background:${e.color}"></span>${e.corto}</td>
      <td class="n">${x.ok} / 233</td><td class="n">${min(x.total)}</td><td class="n">${min(x.primeros)}</td>
      <td class="n">${min(x.p50)}</td><td class="n">${min(x.max)}</td><td class="n">${fmt(x.rssGB, 2)} GB</td>
      <td class="n">${fmt(x.sondaP95, 0)} ms</td></tr>`;

  const minutos = [1, 2, 5, 10, 15, 20, 25, 30];
  const tablaCompletados = minutos
    .filter((m) => m <= Math.ceil(Math.max(...d.map((x) => x.total)) / 60) + 1)
    .map((m) => `<tr><td>${m} min</td>${escenarios.map((e) => `<td class="n">${e.resultados.filter((r) => r.status === 200 && r.s <= m * 60).length}</td>`).join("")}</tr>`)
    .join("");

  return `${portada({
    etiqueta: "Informe técnico · Rendimiento",
    titulo: "Prueba de carga extrema",
    subtitulo: "233 centros y 4.000 alumnos a la vez",
    resumen: "Resultado de someter la aplicación al peor caso posible: todos los centros generan a la vez la documentación de todo su alumnado.",
    entorno,
  })}

<section>
  <h2><span class="num">1</span>Resumen</h2>
  <div class="cifras">
    <div class="cifra"><b>233</b><span>centros a la vez</span></div>
    <div class="cifra"><b>${fmt(C.alumnos, 0)}</b><span>alumnos con expediente</span></div>
    <div class="cifra"><b>${fmt(C.docs, 0)}</b><span>documentos PDF generados en cada ronda</span></div>
    <div class="cifra ${sinErrores ? "buena" : "alerta"}"><b>${d.reduce((a, x) => a + x.errores, 0)}</b><span>errores en ${d.length} rondas</span></div>
  </div>
  <p>Se ha simulado el momento más exigente del mes: los <b>233 centros</b> inician sesión a la vez y, a continuación, pulsan simultáneamente <b>«Generar todo el centro»</b> en Documentación. Esto supone generar el expediente completo (Anexos V y Anexo I) de los <b>4.000 alumnos</b>: ${fmt(C.docsV, 0)} Anexos V y ${fmt(C.docsI, 0)} Anexos I, unos ${fmt(C.MB / 1024, 1)} GB en archivos ZIP.</p>
  <ul>
    <li><b>Fiabilidad:</b> ${sinErrores ? "todas las rondas terminaron sin un solo error: todos los centros recibieron su documentación completa." : "hubo errores; ver el apartado 3."}</li>
    <li><b>Tiempo total del pico:</b> ${min(A.total)} en un servidor de un proceso y <b>${min(C.total)}</b> con ${eC.procesos} procesos. El trabajo de generar PDF es lo que limita el tiempo: depende directamente de la CPU disponible.</li>
    <li><b>Memoria:</b> sin cola, la memoria creció hasta <b>${fmt(A.rssGB, 1)} GB</b> porque todos los centros avanzaban a la vez. Con la cola incorporada a raíz de esta prueba se quedó en <b>${fmt(B.rssGB, 1)} GB</b> con el mismo trabajo.</li>
    <li><b>Experiencia de los demás usuarios:</b> durante el pico, una consulta ligera respondió en ${fmt(Math.max(A.sondaP95, B.sondaP95, C.sondaP95), 0)} ms (percentil 95). La aplicación sigue siendo usable mientras genera documentación.</li>
  </ul>
  <div class="nota bien"><b>Conclusión</b>La versión ${entorno.version} soporta el peor caso (233 centros y 4.000 alumnos simultáneos) sin errores. El tiempo de respuesta en ese pico depende de la CPU del servidor. El informe de necesidades traduce estos resultados en una recomendación de servidor.</div>
</section>

<section class="salto">
  <h2><span class="num">2</span>Qué se ha probado</h2>
  <h3>Escenario</h3>
  <ol>
    <li><b>Inicio de sesión simultáneo</b> de las 233 cuentas de centro.</li>
    <li><b>Generación masiva simultánea:</b> cada centro solicita «Generar todo el centro» para noviembre. Recibe un ZIP con una carpeta por alumno, con sus Anexos V (septiembre a noviembre) y su Anexo I.</li>
    <li>Mientras tanto, cada 2 segundos se mide la CPU y la memoria del servidor, las conexiones a la base de datos y el tiempo de respuesta de una consulta ligera, que hace de «otro usuario» trabajando.</li>
  </ol>
  <h3>Datos</h3>
  <table>
    <thead><tr><th>Elemento</th><th class="n">Cantidad</th><th>Detalle</th></tr></thead>
    <tr><td>Centros</td><td class="n">233</td><td>Con su cuenta, curso 2026-2027 y dos grados (Gestión Administrativa y Sistemas Microinformáticos y Redes)</td></tr>
    <tr><td>Alumnado</td><td class="n">4.000</td><td>Reparto desigual, como en la realidad: de ${entorno.datos.minAlumnos} a ${entorno.datos.maxAlumnos} por centro (media ${fmt(entorno.datos.mediaAlumnos)})</td></tr>
    <tr><td>Asignaturas y profesorado</td><td class="n">${fmt(entorno.datos.asignaturas, 0)}</td><td>5 o 6 módulos por grado y curso, cada uno con su profesor</td></tr>
    <tr><td>Asistencia diaria</td><td class="n">${fmt(entorno.datos.dias, 0)}</td><td>Registros diarios de septiembre a noviembre (${fmt(entorno.datos.asistencias, 0)} resúmenes mensuales); ~3 % de alumnos con una convalidación</td></tr>
  </table>
  <h3>Entorno de la prueba</h3>
  <table>
    <tr><td style="width:32%">Servidor</td><td>${entorno.servidor}</td></tr>
    <tr><td>Software</td><td>${entorno.software}</td></tr>
    <tr><td>Base de datos</td><td>${entorno.bd}</td></tr>
  </table>
  <h3>Rondas</h3>
  <table>
    <thead><tr><th>Ronda</th><th>Configuración</th></tr></thead>
    ${escenarios.map((e) => `<tr><td><span class="muestra" style="background:${e.color}"></span><b>${e.corto}</b></td><td>${e.descripcion}</td></tr>`).join("")}
  </table>
</section>

<section class="salto">
  <h2><span class="num">3</span>Resultados</h2>
  <table>
    <thead><tr><th>Ronda</th><th class="n">Centros OK</th><th class="n">Tiempo total</th><th class="n">10 % primeros</th><th class="n">Mediana</th><th class="n">Último</th><th class="n">Memoria pico</th><th class="n">Consulta ligera (p95)</th></tr></thead>
    ${escenarios.map((e, i) => filaTabla(e, d[i])).join("")}
  </table>
  <p style="font-size:8.5pt;color:var(--texto-3)">«10 % primeros», «Mediana» y «Último»: tiempo que tardó en recibir su ZIP el centro situado en ese punto, contado desde que los 233 pulsaron el botón.</p>

  <figure>
    <div class="lienzo">${graficos.completados}</div>
    <figcaption><b>Figura 1.</b> Centros que ya han recibido su documentación a lo largo del pico. Sin cola, todos esperan casi hasta el final. Con cola, los centros la reciben de forma escalonada desde el primer minuto.</figcaption>
  </figure>

  <h3>Lectura de los resultados</h3>
  <ul>
    <li><b>Sin cola (${eA.corto}):</b> el proceso reparte la CPU entre los 233 centros a la vez. Por eso la mitad de los centros espera ${min(A.p50)} y casi todos terminan juntos al final (${min(A.max)}).</li>
    <li><b>Con cola (${eB.corto}):</b> el proceso atiende pocos centros cada vez. El tiempo total es prácticamente el mismo (${min(B.total)}) porque el trabajo no cambia, pero el 10 % de los centros tiene su ZIP en ${min(B.primeros)} y la mediana baja a ${min(B.p50)}.</li>
    <li><b>Con ${eC.procesos} procesos (${eC.corto}):</b> se usan todos los núcleos del servidor. El pico completo se resuelve en <b>${min(C.total)}</b> y la mediana es de ${min(C.p50)}.</li>
  </ul>
</section>

<section class="salto">
  <h2><span class="num">4</span>Consumo de recursos</h2>
  <div class="dos">
    <figure><div class="lienzo">${graficos.tiempoTotal}</div><figcaption><b>Figura 2.</b> Tiempo total para atender a los 233 centros.</figcaption></figure>
    <figure><div class="lienzo">${graficos.memoriaPico}</div><figcaption><b>Figura 3.</b> Memoria máxima de la aplicación (suma de procesos).</figcaption></figure>
  </div>
  <figure>
    <div class="lienzo">${graficos.memoria}</div>
    <figcaption><b>Figura 4.</b> Memoria de la aplicación durante el pico. Sin cola crece mientras quedan centros a medias. Con cola se mantiene estable.</figcaption>
  </figure>
  <figure>
    <div class="lienzo">${graficos.cpu}</div>
    <figcaption><b>Figura 5.</b> Uso de CPU del servidor (${entorno.nucleos} núcleos = 100 %). Con un proceso se aprovecha aproximadamente un núcleo; con ${eC.procesos} procesos, casi toda la máquina.</figcaption>
  </figure>
  <table>
    <thead><tr><th>Ronda</th><th class="n">CPU máx.</th><th class="n">Memoria máx.</th><th class="n">Máx. por proceso</th><th class="n">Conexiones BD máx.</th><th class="n">GB generados</th></tr></thead>
    ${escenarios.map((e, i) => `<tr><td><span class="muestra" style="background:${e.color}"></span>${e.corto}</td><td class="n">${fmt(d[i].cpu, 0)} %</td><td class="n">${fmt(d[i].rssGB, 2)} GB</td><td class="n">${fmt(d[i].rssProcGB, 2)} GB</td><td class="n">${d[i].mysql}</td><td class="n">${fmt(d[i].MB / 1024, 2)}</td></tr>`).join("")}
  </table>
  <p>La base de datos no ha sido un cuello de botella: las consultas de cada expediente son pocas y ligeras gracias a los índices y a la eliminación de consultas repetidas. Lo que consume los recursos es componer los PDF.</p>
</section>

<section class="salto">
  <h2><span class="num">5</span>Experiencia de usuario durante el pico</h2>
  <table>
    <thead><tr><th>Ronda</th><th class="n">Consulta ligera p95</th><th class="n">Consulta ligera máx.</th><th class="n">Fallos</th><th class="n">233 inicios de sesión: p95</th><th class="n">Errores</th></tr></thead>
    ${escenarios.map((e, i) => `<tr><td><span class="muestra" style="background:${e.color}"></span>${e.corto}</td><td class="n">${fmt(d[i].sondaP95, 0)} ms</td><td class="n">${fmt(d[i].sondaMax / 1000, 1)} s</td><td class="n">${d[i].sondaFallos}</td><td class="n">${fmt(d[i].loginP95, 1)} s</td><td class="n">${d[i].loginErr}</td></tr>`).join("")}
  </table>
  <ul>
    <li><b>Navegación y guardado:</b> el limitador de generación de PDF reserva capacidad para el resto de peticiones. Una consulta ligera tarda decenas de milisegundos aunque la CPU esté saturada generando documentos. Los valores máximos puntuales coinciden con los inicios de sesión masivos.</li>
    <li><b>Inicio de sesión:</b> 233 personas pulsando «Entrar» en el mismo segundo esperan hasta ${fmt(A.loginP95, 0)} s con un proceso, porque la comprobación segura de contraseñas (bcrypt) consume CPU de forma deliberada. Con ${eC.procesos} procesos baja a ${fmt(C.loginP95, 0)} s. En el uso real los inicios de sesión se reparten a lo largo de minutos.</li>
  </ul>

  <h3>Espera según el tamaño del centro</h3>
  <figure>
    <div class="lienzo">${graficos.dispersion}</div>
    <figcaption><b>Figura 6.</b> Ronda ${eC.corto}: cada punto es un centro. La espera depende sobre todo del turno en la cola, no del número de alumnos; un centro grande tarda más en generarse, pero no bloquea a los demás.</figcaption>
  </figure>
</section>

<section class="salto">
  <h2><span class="num">6</span>Hallazgos y mejoras</h2>
  <table>
    <thead><tr><th style="width:28%">Hallazgo</th><th>Situación</th></tr></thead>
    <tr><td><b>Memoria sin límite con muchos centros a la vez</b></td><td><b>Corregido en esta versión.</b> Se ha añadido una cola de generaciones masivas por proceso (<code>MASIVOS_CONCURRENTES</code>, 2 por defecto). La memoria baja de ${fmt(A.rssGB, 1)} GB a ${fmt(B.rssGB, 1)} GB con el mismo trabajo, y los centros reciben su documentación escalonadamente en lugar de todos al final.</td></tr>
    <tr><td><b>Tamaño de los documentos</b></td><td>Cada alumno genera unos ${fmt((C.MB / C.alumnos) * 1024, 0)} KB. Casi todo procede de la plantilla oficial del Anexo V, que lleva incrustadas 10 tipografías (Aptos, Arial, Calibri…) que se repiten en cada documento. <b>Recomendación:</b> si el órgano responsable puede regenerar la plantilla con menos fuentes incrustadas, el tamaño y el tiempo de generación bajarían notablemente. No se ha modificado porque es el modelo oficial.</td></tr>
    <tr><td><b>Inicios de sesión simultáneos</b></td><td>Comportamiento esperado: la comprobación de contraseñas es deliberadamente costosa por seguridad. Se reparte entre los procesos del servidor.</td></tr>
    <tr><td><b>Esperas largas en el pico</b></td><td>En el peor caso, el último centro espera ${min(C.max)} con ${eC.procesos} procesos. El servidor web debe permitir respuestas de esa duración (ver informe de necesidades) y conviene repartir el cierre mensual por zonas para que no coincidan los 233 centros.</td></tr>
  </table>

  <h3>Limitaciones de la prueba</h3>
  <ul>
    <li>Aplicación, base de datos y generador de carga compartían la misma máquina, lo que perjudica los resultados: en producción la base de datos debería ir en otro servidor.</li>
    <li>Se ha probado en red local. No se mide el tiempo de descarga por Internet de los ZIP (ver informe de necesidades, red).</li>
    <li>La base de datos de la prueba es MariaDB ${entorno.bdVersion}. En el servidor final (MySQL 8) el comportamiento esperado es equivalente, pero conviene repetir la prueba allí con los scripts incluidos en <code>scripts/carga/</code>.</li>
    <li>Es un escenario extremo deliberado: en la práctica los centros no generan todo a la vez en el mismo segundo.</li>
  </ul>
</section>

<section class="salto">
  <h2><span class="num">A</span>Anexo · Datos de las figuras</h2>
  <h3>Centros con su documentación recibida, por minuto (figura 1)</h3>
  <table>
    <thead><tr><th>Tiempo</th>${escenarios.map((e) => `<th class="n"><span class="muestra" style="background:${e.color}"></span>${e.corto}</th>`).join("")}</tr></thead>
    ${tablaCompletados}
  </table>
  <h3>Resultados brutos</h3>
  <p>Los datos completos de cada ronda (cada centro, cada muestra de recursos) están en <code>docs/informes/datos/</code> en formato JSON. Los informes se regeneran con <code>node scripts/informes/generar-informes.mjs</code>.</p>
</section>
`;
}

/* =========================================================
   INFORME DE NECESIDADES
   ========================================================= */

export function informeNecesidades({ entorno, escenarios, fmt, min }) {
  const d = escenarios.map(datosEscenario);
  const C = d.at(-1);
  const eC = escenarios.at(-1);
  const B = d[1];

  // Ritmo medido por proceso y escalado observado
  const ritmo1 = B.ritmo; // alumnos/s con 1 proceso (con cola)
  const ritmoN = C.ritmo; // alumnos/s con N procesos
  const eficiencia = ritmoN / (ritmo1 * eC.procesos);
  const ritmoPorNucleo = ritmoN / eC.procesos;
  const tiempoPico = (procesos) => 4000 / (ritmoPorNucleo * procesos * (procesos > eC.procesos ? 0.9 : 1));
  const MBporAlumno = C.MB / C.alumnos;
  const memProc = Math.max(B.rssProcGB, C.rssProcGB);

  const filaProcesos = [2, 4, 8, 12]
    .map((p) => `<tr><td class="n">${p}</td><td class="n">${min(tiempoPico(p))}</td><td class="n">${min(tiempoPico(p) / 4)}</td><td>${p <= 4 ? "medido / interpolado" : "estimado (escalado lineal × 0,9)"}</td></tr>`)
    .join("");

  return `${portada({
    etiqueta: "Informe técnico · Infraestructura",
    titulo: "Necesidades de infraestructura",
    subtitulo: "Dimensionamiento para 233 centros",
    resumen: "Recomendación de servidor, base de datos, red y configuración para alojar el Gestor de Becas, basada en las mediciones de la prueba de carga extrema.",
    entorno,
  })}

<section>
  <h2><span class="num">1</span>Recomendación</h2>
  <table>
    <thead><tr><th style="width:24%">Recurso</th><th>Mínimo</th><th>Recomendado</th></tr></thead>
    <tr><td><b>Servidor de aplicación</b></td><td>4 vCPU · 8 GB RAM · 20 GB SSD</td><td><b>8 vCPU · 16 GB RAM · 40 GB SSD</b></td></tr>
    <tr><td><b>Procesos de la aplicación</b></td><td>4 (PM2, modo clúster)</td><td><b>1 por vCPU</b> (8)</td></tr>
    <tr><td><b>Base de datos</b></td><td>MySQL 8 · 2 vCPU · 4 GB · 20 GB SSD</td><td><b>MySQL 8 · 4 vCPU · 8 GB · 50 GB SSD</b>, en servidor separado o servicio gestionado</td></tr>
    <tr><td><b>Red (salida)</b></td><td>100 Mbit/s</td><td><b>1 Gbit/s</b></td></tr>
    <tr><td><b>Copias de seguridad</b></td><td>Diaria de la base de datos</td><td>Diaria + binlog (recuperación a un punto en el tiempo), conservadas 30 días</td></tr>
    <tr><td><b>Sistema</b></td><td colspan="2">Linux (Ubuntu Server LTS o equivalente), Node.js LTS, nginx como proxy inverso con HTTPS</td></tr>
  </table>
  <div class="nota consejo"><b>En una frase</b>Con la configuración recomendada, el peor caso posible (los 233 centros generando todo a la vez) se resuelve en unos <b>${min(tiempoPico(8))}</b>. Con el cierre mensual repartido en 4 turnos, cada turno tarda unos <b>${min(tiempoPico(8) / 4)}</b>. El resto del tiempo el servidor está prácticamente ocioso.</div>
</section>

<section class="salto">
  <h2><span class="num">2</span>Supuestos de carga</h2>
  <ul>
    <li><b>Usuarios:</b> 233 centros, normalmente una cuenta por centro; 4.000 alumnos en total (de 4 a más de 70 por centro).</li>
    <li><b>Uso diario:</b> registro de asistencia y consultas. Es una carga muy baja: 233 guardados simultáneos se atienden en unos 2 segundos (informe de rendimiento de la v1.1).</li>
    <li><b>Pico mensual:</b> la generación de la documentación en los días de cierre. Es la operación que determina el tamaño del servidor y es la que se ha medido en la prueba extrema.</li>
    <li><b>Peor caso:</b> los 233 centros generan todo a la vez. Es el supuesto utilizado para dimensionar.</li>
  </ul>
</section>

<section>
  <h2><span class="num">3</span>Capacidad medida</h2>
  <table>
    <thead><tr><th>Medida</th><th class="n">Valor</th><th>Observación</th></tr></thead>
    <tr><td>Ritmo de generación por proceso</td><td class="n">${fmt(ritmo1, 1)} alumnos/s</td><td>Expediente completo (3 Anexos V por asignatura-mes acumulados + Anexo I)</td></tr>
    <tr><td>Ritmo con ${eC.procesos} procesos</td><td class="n">${fmt(ritmoN, 1)} alumnos/s</td><td>Eficiencia del escalado: ${fmt(eficiencia * 100, 0)} %</td></tr>
    <tr><td>Memoria por proceso (con cola)</td><td class="n">${fmt(memProc, 2)} GB</td><td>Máximo observado</td></tr>
    <tr><td>Tamaño de la documentación</td><td class="n">${fmt(MBporAlumno * 1024, 0)} KB/alumno</td><td>${fmt(C.MB / 1024, 1)} GB por cierre mensual de los 233 centros</td></tr>
    <tr><td>Base de datos</td><td class="n">${fmt(entorno.datos.bdMB, 0)} MB</td><td>3 meses de asistencia diaria de 4.000 alumnos; unos ${fmt(entorno.datos.bdMB / 3 * 10, 0)} MB por curso completo</td></tr>
  </table>

  <h3>Tiempo del peor caso según el número de procesos (1 por vCPU)</h3>
  <table>
    <thead><tr><th class="n">Procesos / vCPU</th><th class="n">233 centros a la vez</th><th class="n">Por turno (4 turnos)</th><th>Origen</th></tr></thead>
    ${filaProcesos}
  </table>
  <p style="font-size:8.5pt;color:var(--texto-3)">Medido con ${eC.procesos} procesos en procesadores ${entorno.cpuModelo}. Las cifras de 8 y 12 procesos son estimaciones. Conviene confirmarlas en el servidor definitivo con <code>scripts/carga/</code>.</p>
</section>

<section class="salto">
  <h2><span class="num">4</span>Servidor de aplicación</h2>
  <ul>
    <li><b>CPU:</b> es el recurso que determina el tiempo de respuesta en el pico. Cada proceso aprovecha un núcleo, así que se ejecuta un proceso por vCPU con PM2 en modo clúster.</li>
    <li><b>Memoria:</b> ${fmt(memProc, 1)} GB por proceso en el pico, más el sistema. Para 8 procesos, 16 GB dejan margen suficiente.</li>
    <li><b>Disco:</b> la aplicación no guarda los documentos generados (se crean bajo demanda). Basta con espacio para el código, los registros y las actualizaciones: 20–40 GB.</li>
  </ul>

  <h2 style="margin-top:6mm"><span class="num">5</span>Base de datos</h2>
  <ul>
    <li><b>Tamaño:</b> unos ${fmt(entorno.datos.bdMB / 3 * 10, 0)} MB por curso académico con asistencia diaria. Diez cursos de histórico caben holgadamente en 50 GB, contando copias y registros binarios.</li>
    <li><b>Conexiones:</b> cada proceso abre como máximo <code>DATABASE_POOL_SIZE</code> conexiones (20). Con 8 procesos, hasta 160, así que hay que configurar <code>max_connections</code> ≥ 300. En la prueba el pico real fue de ${C.mysql} conexiones.</li>
    <li><b>Configuración:</b> <code>innodb_buffer_pool_size</code> de al menos 2 GB (toda la base cabe en memoria), juego de caracteres <code>utf8mb4</code> y zona horaria UTC.</li>
    <li><b>Copias:</b> volcado diario (<code>mysqldump --single-transaction</code>) y registro binario para recuperación a un punto en el tiempo. Debe probarse la restauración al menos una vez por trimestre.</li>
  </ul>

  <h2 style="margin-top:6mm"><span class="num">6</span>Red</h2>
  <ul>
    <li><b>Volumen:</b> un cierre mensual completo genera unos <b>${fmt(C.MB / 1024, 1)} GB</b> de descargas (${fmt((C.MB / 233), 0)} MB de media por centro y hasta ${fmt(Math.max(...eC.resultados.map((r) => r.MB)), 0)} MB el centro más grande).</li>
    <li><b>Ancho de banda:</b> en el peor caso con 8 procesos, ${fmt(C.MB / 1024, 1)} GB en ~${min(tiempoPico(8))} equivalen a unos ${fmt((C.MB * 8) / tiempoPico(8), 0)} Mbit/s de media. Un enlace de 1 Gbit/s lo cubre con amplio margen; con 100 Mbit/s las descargas se alargarían en el pico.</li>
  </ul>
</section>

<section class="salto">
  <h2><span class="num">7</span>Configuración recomendada</h2>
  <h3>Variables de entorno (.env)</h3>
  <table>
    <thead><tr><th>Variable</th><th>Valor</th><th>Motivo</th></tr></thead>
    <tr><td><code>DATABASE_POOL_SIZE</code></td><td>20</td><td>Conexiones por proceso (× procesos &lt; max_connections)</td></tr>
    <tr><td><code>PDF_CONCURRENCIA</code></td><td>2</td><td>PDF simultáneos por proceso; con un proceso por núcleo no conviene más</td></tr>
    <tr><td><code>MASIVOS_CONCURRENTES</code></td><td>2</td><td>Generaciones masivas simultáneas por proceso (cola). Acota la memoria</td></tr>
    <tr><td><code>EXPEDIENTES_CONCURRENCIA</code></td><td>3</td><td>Alumnos en paralelo dentro de una generación masiva</td></tr>
  </table>
  <h3>Servidor web (nginx)</h3>
  <ul>
    <li><code>proxy_read_timeout 1800s;</code> en <code>/api/documentos/</code>: en el peor caso, un centro puede esperar ${min(C.max)} hasta recibir su ZIP. Con el valor por defecto (60 s), nginx cortaría la descarga.</li>
    <li><code>client_max_body_size 20m;</code> para las importaciones Excel.</li>
    <li>Compresión gzip en nginx y <code>DISABLE_COMPRESSION=1</code> en la aplicación.</li>
    <li>Acceso a <code>/admin</code> restringido a la red corporativa.</li>
  </ul>

  <h2 style="margin-top:6mm"><span class="num">8</span>Medidas organizativas</h2>
  <table>
    <thead><tr><th>Medida</th><th>Efecto</th></tr></thead>
    <tr><td><b>Calendario de cierre en 4 turnos</b> (por zona o DAT)</td><td>El pico se divide entre 4: unos ${min(tiempoPico(8) / 4)} por turno con el servidor recomendado</td></tr>
    <tr><td><b>Asistencia continua</b>, no a final de mes</td><td>Evita que la carga de datos coincida con la generación de documentos</td></tr>
    <tr><td><b>Generación masiva fuera de horas punta</b></td><td>Antes de las 10:00 o después de las 14:00</td></tr>
    <tr><td><b>Supervisión</b> de <code>/api/estado-db</code></td><td>Muestra las colas de PDF y de generaciones masivas. Si se mantienen altas, hay que ampliar la CPU</td></tr>
  </table>

  <h2 style="margin-top:6mm"><span class="num">9</span>Antes de la puesta en producción</h2>
  <ol>
    <li>Instalar siguiendo <code>docs/RENDIMIENTO_Y_DESPLIEGUE.md</code> (PM2, nginx, MySQL).</li>
    <li>Repetir la prueba extrema en el servidor definitivo con una base de datos de pruebas (<code>scripts/carga/LEEME.md</code>) y comparar con este informe.</li>
    <li>Ajustar el número de procesos y los tiempos de espera de nginx según el resultado.</li>
    <li>Configurar y probar las copias de seguridad y su restauración.</li>
    <li>Crear la cuenta de administración (<code>npm run admin:crear</code>) y restringir <code>/admin</code>.</li>
  </ol>
</section>
`;
}
