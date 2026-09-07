# Publicación de la versión 2

## Identificación de versiones

Destino: `https://github.com/joseangelcalvoperez-code/gestor-becas-web`.
La etiqueta remota existente `v1.0.0` apunta al commit `a6401d9bff8c543b11c5a618a9cb5ac70546ac64`, del gestor sin firmas. Debe conservarse sin moverla ni sobrescribirla.

La carpeta local procede de otro repositorio, `gestor-becas-web-firmas`. Sus etiquetas locales `v1.0.0` y `v.1.0.0` identifican el proyecto con firmas y no deben enviarse al destino. No utilizar `git push --tags`, `--mirror` ni una subida forzada.

La versión nueva es 2.0.0. La integración debe partir del historial del destino, incorporar el código revisado y terminar con una nueva etiqueta `v2.0.0`. Las etiquetas conservan cada versión completa; no hace falta duplicar la aplicación en carpetas v1 y v2.

## Manuales

- Históricos sin cambios: `public/documentos/Manual_Gestor_Becas_v1.0.pdf` y `Manual_Gestor_Becas_v1.0.docx`.
- Actual: `public/documentos/Manual_Gestor_Becas_v2.0.pdf`.
- Fuente editable: `docs/manual-v2.md`.
- Generación: `python scripts/generar-manual.py`, con ReportLab instalado en el entorno de documentación. No añade dependencias al aplicativo.

Inicio ofrece enlaces separados e identifica las versiones con y sin firmas.

## Incorporación al repositorio original

1. Comprobar que el destino no ha recibido cambios nuevos desde la revisión.
2. Crear una rama `codex/version-2` desde la rama principal del destino en una copia separada.
3. Incorporar los archivos revisados del aplicativo y documentación. Excluir `.git`, dependencias, variables reales, almacenamiento, temporales y copias de bases de datos. Mantener los archivos propios del destino que no se hayan reemplazado deliberadamente.
4. Revisar el diff y el esquema Prisma. Existía un cambio local previo en `prisma/schema.prisma`; evaluarlo por separado, sin descartarlo ni asumirlo como parte del manual.
5. Validar compilación y flujos funcionales con datos ficticios.
6. Subir la rama para revisión. Tras integrarla, crear la etiqueta `v2.0.0` en el commit integrado y una release «v2.0.0 · Con módulo de firmas». Mantener la v1 identificada como «Sin módulo de firmas».

## Actualización de una base de datos v1

La v1 publicada contiene el esquema Prisma y `migration_lock.toml`, pero no los SQL iniciales. La v2 incluye migraciones de creación de tablas ya existentes en una instalación v1.

Guardar una copia verificable de la base de datos y ensayar la actualización en una copia aislada. Comparar estructura e historial con los esquemas y SQL del proyecto. Registrar como aplicadas únicamente las migraciones cuya estructura ya esté presente y comprobada; aplicar después las pendientes. Esta reconciliación depende de la base real y no puede resolverse con una lista universal de comandos.

No ejecutar reinicios ni `migrate reset` sobre datos reales. Para una instalación nueva y vacía, seguir el README. Cambiar de etiqueta Git no revierte las migraciones de base de datos.

## Antes de hacer público el repositorio

Revisar el árbol final y el historial que se publicará. `.gitignore` no elimina información registrada en commits anteriores.

Excluir secretos, variables reales, datos de alumnado, exportaciones Excel, copias de bases de datos, enlaces de firma, PDF firmados y sellos reales. Conservar las migraciones SQL del código. Revisar capturas y metadatos de los manuales y Word; buscar texto no detecta datos dentro de imágenes.

Publicar el código no publica la aplicación ni su base de datos. Mantener `storage/` privado y persistente en el despliegue. Comprobar que se pueden compartir los materiales incluidos y elegir la licencia correspondiente; no se ha añadido una licencia por defecto.
