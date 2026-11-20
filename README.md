# Gestor de Becas Web

Aplicación web para la gestión de centros, cursos académicos, alumnado, asignaturas, asistencia y generación de documentación. Esta versión corresponde al **gestor sin módulo de firma**.

> **v1.1.0** — Rediseño institucional (Comunidad de Madrid · Consejería de Educación), optimización para 233 centros simultáneos y ~4.000 alumnos, y guía de despliegue. Ver **[docs/RENDIMIENTO_Y_DESPLIEGUE.md](docs/RENDIMIENTO_Y_DESPLIEGUE.md)**.
>
> **Instalación paso a paso en un PC nuevo para pruebas:** [docs/INSTALACION_LOCAL.md](docs/INSTALACION_LOCAL.md).
>
> **Manual de usuario:** `public/documentos/Manual_Gestor_Becas_v1.1.pdf` (enlazado desde la aplicación). Se genera desde `docs/manual/manual.html` con `node scripts/manual/generar-pdf.mjs`; las capturas se rehacen con `scripts/manual/capturas.mjs`.

## Tecnologías principales

- Next.js
- TypeScript
- Node.js / npm
- Prisma ORM
- MySQL
- Generación de documentos PDF mediante plantillas incluidas en el proyecto

# Instalación detallada

## 1. Requisitos previos

Antes de instalar el servicio deben estar disponibles:

### Node.js

Instalar una versión LTS reciente de Node.js y comprobar la instalación:

```powershell
node --version
npm --version
```

### MySQL

Debe existir un servidor MySQL accesible desde el equipo o servidor donde se ejecutará la aplicación.

Será necesario conocer:

- Host o dirección del servidor
- Puerto de MySQL
- Nombre de la base de datos
- Usuario
- Contraseña

Para desarrollo, MySQL puede ejecutarse en el mismo ordenador que la aplicación.

### Git

Git es necesario si el proyecto se descarga y actualiza directamente desde GitHub:

```powershell
git --version
```

## 2. Descargar el proyecto

Situarse en la carpeta donde se quiera instalar:

```powershell
cd C:\Proyectos
```

Clonar el repositorio:

```powershell
git clone URL_DEL_REPOSITORIO
cd gestor-becas-web
```

Si se recibe como ZIP, descomprimirlo y abrir una terminal en la carpeta raíz.

## 3. Instalar las dependencias

Desde la raíz del proyecto:

```powershell
npm install
```

Este comando instala las dependencias definidas en `package.json`.

La carpeta `node_modules` se genera localmente y no se almacena en GitHub.

## 4. Crear la base de datos

Crear en MySQL una base de datos para el aplicativo. Por ejemplo:

```sql
CREATE DATABASE gestor_becas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

El nombre es orientativo. Puede utilizarse otro siempre que coincida con la configuración del proyecto.

La base de datos local y sus datos de prueba **no se suben a GitHub**.

## 5. Configurar las variables de entorno

Crear o configurar en la raíz del proyecto:

```text
.env
```

Este archivo contiene información propia de cada instalación y **no debe subirse al repositorio**.

Configurar la conexión a MySQL conforme a la variable utilizada por Prisma. Ejemplo:

```env
DATABASE_URL="mysql://USUARIO:CONTRASENA@127.0.0.1:3306/gestor_becas"
```

Sustituir usuario, contraseña, host, puerto y base de datos por los valores reales.

> Nunca guardar contraseñas, credenciales o secretos reales en GitHub.

## 6. Preparar Prisma y la estructura de la base de datos

El modelo se encuentra en:

```text
prisma/schema.prisma
```

Generar Prisma Client:

```powershell
npx prisma generate
```

Comprobar las migraciones:

```powershell
npx prisma migrate status
```

### Base de datos nueva

Las migraciones están en `prisma/migrations`. Aplicarlas mediante:

```powershell
npx prisma migrate deploy
```

Después:

```powershell
npx prisma generate
```

### Base de datos creada con la v1.0

Las instalaciones de la v1.0 no tienen historial de migraciones. Tras hacer copia de seguridad:

```powershell
npx prisma migrate resolve --applied 20261120000000_init
npx prisma migrate deploy
```

El segundo comando solo añade índices de rendimiento; no modifica datos.

### Modificaciones del esquema durante el desarrollo

Cuando se cambie deliberadamente `schema.prisma`, las nuevas migraciones se pueden crear en desarrollo con:

```powershell
npx prisma migrate dev --name descripcion_del_cambio
```

No utilizar `migrate dev` indiscriminadamente en un servidor de producción.

## 7. Plantillas PDF

Las plantillas maestras forman parte de la aplicación y deben conservarse.

Entre ellas:

```text
public/
└── plantillas/
    ├── anexo-i-vacio.pdf
    └── anexo-v-vacio.pdf
```

Estas plantillas son reutilizables para distintos cursos académicos. La aplicación incorpora dinámicamente datos como curso, mes, semanas, alumno, asignaturas y asistencia.

**No sustituir o modificar una plantilla sin comprobar posteriormente las coordenadas de impresión.**

## 8. Arrancar el servicio en desarrollo

Ejecutar:

```powershell
npm run dev
```

Abrir en el navegador:

```text
http://localhost:3000
```

Para detener el servidor:

```text
Ctrl + C
```

## 9. Comprobaciones después de una instalación

Antes de considerar una instalación operativa, verificar:

1. La aplicación arranca sin errores.
2. La conexión con MySQL funciona.
3. Las migraciones están aplicadas.
4. El acceso y la configuración inicial disponibles en esa instalación funcionan.
5. Se pueden configurar los datos del centro y el curso académico.
6. Se pueden crear los datos académicos necesarios.
7. Se puede registrar alumnado y matrícula.
8. Se puede introducir asistencia.
9. Se genera correctamente un ANEXO V.
10. Se genera correctamente un ANEXO I.
11. Funcionan las descargas y generaciones múltiples.
12. Los datos impresos mantienen sus posiciones sobre las plantillas PDF.

## 10. Compilar para producción

Antes de publicar una versión:

```powershell
npm run build
```

Si la compilación finaliza correctamente:

```powershell
npm start
```

Por defecto, Next.js suele utilizar el puerto `3000`, salvo que la instalación configure otro.

Para una instalación accesible desde Internet se recomienda utilizar HTTPS y ejecutar la aplicación detrás de un proxy inverso. La configuración concreta dependerá del servidor o proveedor elegido.

## 11. Actualizar una instalación existente

Antes de actualizar un entorno con información real, realizar una copia de seguridad de MySQL.

Después:

```powershell
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

Finalmente, reiniciar el proceso que mantiene la aplicación en ejecución.

Actualizar el código no equivale a borrar los datos de MySQL, pero cualquier migración debe revisarse antes de aplicarse sobre información real.

## 12. Archivos que no deben subirse a GitHub

Entre otros:

```text
.env
.env.local
node_modules/
.next/
*.sql
*.dump
*.bak
```

Tampoco deben versionarse exportaciones de bases de datos con información real.

## 13. Copias de seguridad

En una instalación real se recomienda mantener copias periódicas de:

- Base de datos MySQL
- Configuración necesaria para reconstruir el servicio
- Plantillas documentales si se personalizan

GitHub conserva el código y su historial, pero **no sustituye una copia de seguridad de la base de datos**.

## 14. Estructura general

```text
gestor-becas-web/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
│   └── plantillas/
├── src/
│   └── app/
├── .gitignore
├── next.config.ts
├── package.json
├── package-lock.json
├── prisma.config.ts
├── README.md
└── tsconfig.json
```

## 15. Instalación rápida para desarrollo

Una vez preparado MySQL:

```powershell
git clone URL_DEL_REPOSITORIO
cd gestor-becas-web
npm install
```

Crear/configurar `.env` y ejecutar:

```powershell
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Abrir:

```text
http://localhost:3000
```

# Versión

**Gestor de Becas Web — v1.1.0**

- Rediseño visual institucional y accesible (WCAG 2.1 AA).
- Generación masiva de expedientes ~2× más rápida, sin llamadas HTTP internas.
- Pool de conexiones configurable, índices nuevos, límite de intentos de login.
- Guía de despliegue para 233 centros: `docs/RENDIMIENTO_Y_DESPLIEGUE.md`.

v1.0.0 — Primera versión estable del gestor web sin módulo de firma.
