# Instalación desde cero en un PC nuevo (pruebas en local)

Guía paso a paso para Windows 10/11. Al final hay una nota para Linux y macOS.
Tiempo aproximado: 30–45 minutos.

---

## Paso 1. Instalar los programas necesarios

### 1.1 Node.js
1. Ir a https://nodejs.org y descargar la versión **LTS**.
2. Instalarla con las opciones por defecto.
3. Abrir **PowerShell** (tecla Windows, escribir `PowerShell`) y comprobar que la instalación funciona:

```powershell
node --version
```

```powershell
npm --version
```

Cada comando debe mostrar un número de versión.

### 1.2 Git
1. Ir a https://git-scm.com/download/win y descargar el instalador.
2. Instalarlo con las opciones por defecto.
3. **Cerrar y volver a abrir PowerShell** y comprobar que funciona:

```powershell
git --version
```

### 1.3 MySQL
1. Ir a https://dev.mysql.com/downloads/installer/ y descargar **MySQL Installer for Windows**.
2. Elegir la instalación **Server only**.
3. Cuando el instalador pida la contraseña de **root**, escribir una y **apuntarla**.
4. Dejar el puerto **3306** y marcar que MySQL se inicie como servicio de Windows.

---

## Paso 2. Crear la base de datos

Abrir **MySQL Command Line Client** desde el menú Inicio e introducir la contraseña de root. Después, copiar y pegar este bloque:

```sql
CREATE DATABASE gestor_becas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE gestor_becas_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'gestor'@'localhost' IDENTIFIED BY 'Cambiar_Esta_Clave_1';
CREATE USER 'gestor'@'127.0.0.1' IDENTIFIED BY 'Cambiar_Esta_Clave_1';

GRANT ALL PRIVILEGES ON gestor_becas.* TO 'gestor'@'localhost', 'gestor'@'127.0.0.1';
GRANT ALL PRIVILEGES ON gestor_becas_shadow.* TO 'gestor'@'localhost', 'gestor'@'127.0.0.1';
FLUSH PRIVILEGES;
EXIT;
```

> Si se cambia la contraseña `Cambiar_Esta_Clave_1`, hay que usar la misma en el paso 4.

---

## Paso 3. Descargar el proyecto

En PowerShell, crear una carpeta de trabajo y entrar en ella:

```powershell
mkdir C:\Proyectos
```

```powershell
cd C:\Proyectos
```

Descargar el proyecto y entrar en su carpeta:

```powershell
git clone https://github.com/joseangelcalvoperez-code/gestor-becas-web.git
```

```powershell
cd gestor-becas-web
```

Así se descarga la versión 1.1 (rama `main`).

> Para probar la versión anterior: `git checkout v1.0.0`. Para volver a la nueva: `git checkout main`.

---

## Paso 4. Configurar el archivo `.env`

Crear el archivo de configuración a partir del ejemplo y abrirlo en el Bloc de notas:

```powershell
copy .env.example .env
```

```powershell
notepad .env
```

Sustituir los valores de ejemplo por estos (la contraseña debe ser la del paso 2):

```env
DATABASE_URL="mysql://gestor:Cambiar_Esta_Clave_1@127.0.0.1:3306/gestor_becas"
SHADOW_DATABASE_URL="mysql://gestor:Cambiar_Esta_Clave_1@127.0.0.1:3306/gestor_becas_shadow"

DATABASE_HOST="127.0.0.1"
DATABASE_PORT="3306"
DATABASE_USER="gestor"
DATABASE_PASSWORD="Cambiar_Esta_Clave_1"
DATABASE_NAME="gestor_becas"

AUTH_SECRET="escriba-aqui-una-frase-larga-y-aleatoria-de-al-menos-32-caracteres"
```

El resto de líneas (rendimiento e identidad) se pueden dejar como están. Guardar y cerrar el Bloc de notas.

> Si la contraseña contiene `@`, `:`, `/` o `#`, en las dos URL hay que escribirlos codificados: `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`.

---

## Paso 5. Instalar dependencias y crear las tablas

Ejecutar estos comandos uno a uno, dentro de la carpeta del proyecto:

```powershell
npm ci
```

```powershell
npx prisma generate
```

```powershell
npx prisma migrate deploy
```

El último comando debe terminar con `All migrations have been successfully applied`.

---

## Paso 6. Arrancar la aplicación

```powershell
npm run dev
```

Abrir el navegador en **http://localhost:3000**.

- La aplicación está lista cuando en PowerShell aparece `Ready`.
- La primera carga de cada pantalla tarda unos segundos: en modo desarrollo se compila al momento.
- Para detener la aplicación, pulsar `Ctrl + C` en PowerShell.

> **Importante:** entrar siempre por `http://localhost:3000`. Si se entra por la IP del equipo (por ejemplo `http://192.168.1.20:3000`), el login no funciona: la cookie de sesión solo se acepta en `localhost` o con HTTPS.

---

## Paso 7. Primeras pruebas (orden recomendado)

1. **Crear la cuenta**: en la pantalla de acceso, *Solicitar alta del centro*. Rellenar los datos y crear el usuario.
2. **Iniciar sesión** con ese usuario.
3. **Datos del centro**: revisar los datos y crear el **curso académico** (por ejemplo `2026-2027`, del 01/09/2026 al 30/06/2027), marcado como *actual*.
4. **Grados y asignaturas**: crear un grado y sus asignaturas con el profesor responsable.
5. **Alumnado**: dar de alta los alumnos a mano o con *Exportar plantilla* → rellenar → *Importar Excel*.
6. **Asistencia**: elegir grado, asignatura y alumno, introducir las horas y pulsar *Guardar asistencia*.
7. **Documentación**: generar un Anexo V, un Anexo I, un expediente y la generación masiva del centro.

---

## Paso 8 (opcional). Probar como en producción

El modo producción es más rápido y es el que se usa en el servidor real:

```powershell
npm run build
```

```powershell
npm start
```

La aplicación queda igualmente en http://localhost:3000.

Para comprobar que la aplicación y la base de datos responden, abrir http://localhost:3000/api/estado-db. Debe aparecer `"ok":true`.

---

## Actualizar a una versión más reciente

Con la aplicación detenida (`Ctrl + C`), ejecutar uno a uno:

```powershell
git pull
```

```powershell
npm ci
```

```powershell
npx prisma generate
```

```powershell
npx prisma migrate deploy
```

```powershell
npm run dev
```

---

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `'node' no se reconoce como un comando…` | PowerShell se abrió antes de instalar Node. Cerrarlo y volver a abrirlo. |
| `Cannot resolve environment variable: DATABASE_URL` | No existe el archivo `.env` o está en otra carpeta. Repetir el paso 4 en la carpeta del proyecto. |
| `Access denied for user 'gestor'` | La contraseña del `.env` no coincide con la del paso 2. |
| `Can't reach database server` / `ECONNREFUSED 3306` | MySQL no está arrancado. Abrir *Servicios* de Windows → **MySQL80** → *Iniciar*. |
| `Falta AUTH_SECRET` | Falta la línea `AUTH_SECRET` en el `.env`. |
| El login no hace nada o vuelve a pedir la contraseña | Se está entrando por IP en lugar de `localhost` (ver paso 6). |
| `Port 3000 is in use` | Hay otra copia de la aplicación abierta. Cerrarla o usar `npm run dev -- -p 3001`. |
| `Demasiados intentos fallidos` | Hubo 8 intentos fallidos con ese email. Esperar 15 minutos o reiniciar la aplicación. |

---

## Linux y macOS

Los pasos son los mismos, con estas diferencias:

- **Instalación de programas** (Debian/Ubuntu):

  ```bash
  sudo apt install nodejs npm git mysql-server
  ```

  En macOS: `brew install node git mysql`, y después `brew services start mysql`.
- **Paso 2**: entrar en MySQL con `sudo mysql` y ejecutar el mismo bloque SQL.
- **Paso 4**: en lugar de `copy` y `notepad`, usar `cp .env.example .env` y editarlo con `nano .env`.
