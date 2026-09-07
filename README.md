# Gestor de Becas Web

Aplicación web para gestionar centros educativos, cursos académicos, alumnado, profesorado, asistencias y la generación y firma electrónica de los Anexos I y V.

## Versiones

| Versión | Contenido | Manual |
| --- | --- | --- |
| v1.0.0 | Gestor sin módulo de firmas, conservado en la etiqueta del repositorio original. | [Manual v1 PDF](public/documentos/Manual_Gestor_Becas_v1.0.pdf) |
| v2.0.0 | Gestor con módulo de firmas de Anexos I y V. | [Manual v2 PDF](public/documentos/Manual_Gestor_Becas_v2.0.pdf) · [Fuente editable](docs/manual-v2.md) |

Repositorio de las dos versiones: [gestor-becas-web](https://github.com/joseangelcalvoperez-code/gestor-becas-web).
El manual v1 y su [original Word](Manual_Gestor_Becas_v1.0.docx) se conservan sin modificaciones. Inicio ofrece acceso a ambos manuales.

La v2 se prepara para su incorporación al mismo repositorio manteniendo el historial y la etiqueta v1.0.0. Consulte [la preparación de publicación](docs/publicacion-v2.md) y [los cambios](CHANGELOG.md).

## Funcionalidades de la v2.0.0

- Registro y acceso de usuarios por centro.
- Gestión de cursos académicos, alumnado, grados, asignaturas y profesores.
- Importación y exportación de alumnado y asistencias mediante hojas de cálculo.
- Registro mensual de horas asistidas y no asistidas.
- Generación en PDF de los Anexos I y V.
- Preparación de envíos y firma mediante enlaces personales.
- Firma acumulativa de los profesores en el Anexo I.
- Firma final del director cuando han firmado todos los profesores.
- Incorporación del sello configurado por el centro al Anexo I final.
- Rechazo de documentos con observaciones y trazabilidad de eventos.
- Verificación pública mediante CSV.
- Descarga individual o agrupada de documentos completamente firmados.
- Conservación temporal de PDFs y mantenimiento de evidencias de firma.
- Recuperación de contraseña por correo electrónico.

Los enlaces de firma se distribuyen manualmente desde el detalle del envío; todavía no se envían automáticamente por correo. La subida de PDF externos está deshabilitada.

## Tecnologías

- Next.js 16 con App Router
- React 19 y TypeScript
- Prisma ORM 7
- MySQL o MariaDB
- `pdf-lib` para generar y estampar PDFs
- ExcelJS para importaciones y exportaciones
- Resend como proveedor de correo

## Requisitos

- Node.js 20 o superior
- npm
- MySQL o MariaDB
- Una base principal y otra base vacía para las migraciones de desarrollo

## Instalación local

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env` y completa sus valores:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Para una base nueva y vacía, aplica las migraciones y genera Prisma Client:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   Para actualizar una base v1 existente, revise primero [las instrucciones de actualización](docs/publicacion-v2.md). La v1 publicada no contiene las migraciones SQL iniciales; hay que reconciliar su historial antes de aplicar las de v2.

4. Inicia la aplicación:

   ```bash
   npm run dev
   ```

5. Abre `http://localhost:3000`.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión MySQL/MariaDB utilizada por la aplicación. |
| `SHADOW_DATABASE_URL` | Desarrollo | Base auxiliar vacía usada por Prisma para crear migraciones. |
| `AUTH_SECRET` | Sí | Secreto largo y aleatorio para firmar las sesiones. |
| `APP_URL` | Sí | URL pública usada en enlaces de firma, recuperación y verificación. |
| `NEXT_PUBLIC_APP_URL` | Recomendada | URL pública disponible en el cliente. |
| `EMAIL_PROVIDER` | Para correo | Proveedor de email; actualmente `resend`. |
| `EMAIL_FROM` | Para correo | Remitente verificado por el proveedor. |
| `RESEND_API_KEY` | Para correo | Clave privada de Resend. |
| `EMAIL_DEMO_TO` | No | Destinatario para pruebas de envío. |

## Comandos disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

## Almacenamiento y privacidad

Los originales, documentos firmados y sellos se guardan bajo `storage/`. Esta carpeta, los archivos `.env`, Prisma Client generado, dependencias y artefactos de compilación están excluidos del repositorio.

En producción, `storage/` debe estar respaldado por almacenamiento persistente y privado. Nunca deben publicarse archivos `.env`, copias de la base de datos, documentos firmados, sellos ni secretos.

## Plantillas documentales

Las plantillas PDF maestras están en `public/plantillas/`. Las coordenadas para rellenar y estampar los documentos se encuentran en sus generadores y en `src/lib/firmas/estampar-pdf.ts`.

## Versión

Versión del proyecto: `2.0.0`, con módulo de firmas. La etiqueta `v1.0.0` del repositorio `gestor-becas-web` identifica el gestor original sin firmas.

Antes de desplegar en producción deben configurarse una base de datos, almacenamiento persistente, HTTPS, una URL pública estable y un remitente de correo verificado.
