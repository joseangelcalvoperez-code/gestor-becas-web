/*
 * Gráficos SVG estáticos para los informes PDF (sin dependencias).
 * Paleta categórica validada (azul, naranja, aguamarina): ver informe.
 */

export const COLORES = ["#2a78d6", "#eb6834", "#1baf7a"];

const TINTA = "#1d2733";
const TINTA_2 = "#5f6b7a";
const REJILLA = "#e3e7ec";

function escala(d0, d1, r0, r1) {
  return (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

function pasos(max, n = 5) {
  const bruto = max / n;
  const mag = 10 ** Math.floor(Math.log10(bruto || 1));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto) ?? bruto;
  const valores = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) valores.push(+v.toFixed(6));
  return valores;
}

const fmt = (v) =>
  Math.abs(v) >= 1000 ? v.toLocaleString("es-ES", { maximumFractionDigits: 0 }) : v.toLocaleString("es-ES", { maximumFractionDigits: 1 });

/**
 * Gráfico de líneas. series: [{ nombre, puntos: [[x, y], ...] }]
 * Una sola escala Y. Etiqueta directa al final de cada línea.
 */
export function lineas({ series, ancho = 680, alto = 260, ejeX, ejeY, maxY, maxX, etiquetasFinales = true }) {
  const m = { t: 14, r: etiquetasFinales ? 150 : 16, b: 40, l: 56 };
  const todosX = series.flatMap((s) => s.puntos.map((p) => p[0]));
  const todosY = series.flatMap((s) => s.puntos.map((p) => p[1]));
  const xMax = maxX ?? Math.max(...todosX);
  const ticksY = pasos(maxY ?? Math.max(...todosY) * 1.05);
  const yMax = ticksY[ticksY.length - 1];
  const ticksX = pasos(xMax, 6).filter((v) => v <= xMax * 1.001);
  const x = escala(0, xMax, m.l, ancho - m.r);
  const y = escala(0, yMax, alto - m.b, m.t);

  let svg = `<svg viewBox="0 0 ${ancho} ${alto}" width="100%" role="img" font-family="inherit" font-size="11">`;

  for (const v of ticksY) {
    svg += `<line x1="${m.l}" x2="${ancho - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${REJILLA}" stroke-width="1"/>`;
    svg += `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="${TINTA_2}">${fmt(v)}</text>`;
  }
  for (const v of ticksX) {
    svg += `<text x="${x(v)}" y="${alto - m.b + 16}" text-anchor="middle" fill="${TINTA_2}">${fmt(v)}</text>`;
  }
  svg += `<line x1="${m.l}" x2="${ancho - m.r}" y1="${alto - m.b}" y2="${alto - m.b}" stroke="${TINTA_2}" stroke-width="1"/>`;
  svg += `<text x="${(m.l + ancho - m.r) / 2}" y="${alto - 6}" text-anchor="middle" fill="${TINTA_2}">${ejeX}</text>`;
  svg += `<text transform="translate(13 ${(m.t + alto - m.b) / 2}) rotate(-90)" text-anchor="middle" fill="${TINTA_2}">${ejeY}</text>`;

  // Etiquetas finales sin solaparse
  const finales = series.map((s, i) => {
    const p = s.puntos[s.puntos.length - 1];
    return { i, yPos: y(p[1]), x: x(p[0]), texto: s.nombre };
  }).sort((a, b) => a.yPos - b.yPos);
  for (let k = 1; k < finales.length; k++) {
    if (finales[k].yPos - finales[k - 1].yPos < 13) finales[k].yPos = finales[k - 1].yPos + 13;
  }

  series.forEach((s, i) => {
    const d = s.puntos.map((p, k) => `${k ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
    svg += `<path d="${d}" fill="none" stroke="${COLORES[i]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  if (etiquetasFinales) {
    for (const f of finales) {
      svg += `<circle cx="${f.x}" cy="${y(series[f.i].puntos.at(-1)[1])}" r="3.5" fill="${COLORES[f.i]}" stroke="#fff" stroke-width="1.5"/>`;
      svg += `<text x="${ancho - m.r + 8}" y="${f.yPos + 4}" fill="${TINTA}" font-weight="600">${f.texto}</text>`;
      svg += `<line x1="${f.x + 4}" x2="${ancho - m.r + 5}" y1="${y(series[f.i].puntos.at(-1)[1])}" y2="${f.yPos}" stroke="${COLORES[f.i]}" stroke-width="1"/>`;
    }
  }

  return svg + "</svg>";
}

/** Dispersión: puntos [[x, y]] de una sola serie. */
export function dispersion({ puntos, ancho = 680, alto = 250, ejeX, ejeY, color = COLORES[0] }) {
  const m = { t: 14, r: 16, b: 40, l: 56 };
  const ticksY = pasos(Math.max(...puntos.map((p) => p[1])) * 1.05);
  const ticksX = pasos(Math.max(...puntos.map((p) => p[0])) * 1.02, 8);
  const x = escala(0, ticksX.at(-1), m.l, ancho - m.r);
  const y = escala(0, ticksY.at(-1), alto - m.b, m.t);
  let svg = `<svg viewBox="0 0 ${ancho} ${alto}" width="100%" role="img" font-family="inherit" font-size="11">`;
  for (const v of ticksY) {
    svg += `<line x1="${m.l}" x2="${ancho - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${REJILLA}"/>`;
    svg += `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end" fill="${TINTA_2}">${fmt(v)}</text>`;
  }
  for (const v of ticksX) svg += `<text x="${x(v)}" y="${alto - m.b + 16}" text-anchor="middle" fill="${TINTA_2}">${fmt(v)}</text>`;
  svg += `<line x1="${m.l}" x2="${ancho - m.r}" y1="${alto - m.b}" y2="${alto - m.b}" stroke="${TINTA_2}"/>`;
  svg += `<text x="${(m.l + ancho - m.r) / 2}" y="${alto - 6}" text-anchor="middle" fill="${TINTA_2}">${ejeX}</text>`;
  svg += `<text transform="translate(13 ${(m.t + alto - m.b) / 2}) rotate(-90)" text-anchor="middle" fill="${TINTA_2}">${ejeY}</text>`;
  for (const [a, b] of puntos) svg += `<circle cx="${x(a).toFixed(1)}" cy="${y(b).toFixed(1)}" r="4" fill="${color}" fill-opacity="0.75" stroke="#fff" stroke-width="1.2"/>`;
  return svg + "</svg>";
}

/** Barras horizontales: filas [{ nombre, valor }], una serie por color de escenario. */
export function barras({ filas, ancho = 680, unidad = "", alto }) {
  const h = alto ?? filas.length * 34 + 16;
  const m = { l: 210, r: 70 };
  const max = Math.max(...filas.map((f) => f.valor));
  const x = escala(0, max, m.l, ancho - m.r);
  let svg = `<svg viewBox="0 0 ${ancho} ${h}" width="100%" role="img" font-family="inherit" font-size="12">`;
  filas.forEach((f, i) => {
    const yy = 8 + i * 34;
    svg += `<text x="${m.l - 10}" y="${yy + 16}" text-anchor="end" fill="${TINTA}">${f.nombre}</text>`;
    svg += `<rect x="${m.l}" y="${yy + 3}" width="${Math.max(2, x(f.valor) - m.l)}" height="20" rx="4" fill="${COLORES[f.color ?? i]}"/>`;
    svg += `<text x="${x(f.valor) + 8}" y="${yy + 17}" fill="${TINTA}" font-weight="600">${fmt(f.valor)}${unidad}</text>`;
  });
  return svg + "</svg>";
}
