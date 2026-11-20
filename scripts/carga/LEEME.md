# Prueba de carga extrema

Herramientas usadas para los informes de `docs/informes/`. Reproducen el peor caso:
**233 centros (4.000 alumnos) piden a la vez la generación masiva de expedientes**.

> Ejecutar solo contra una base de datos de pruebas, nunca contra la de producción.

1. Base de datos de pruebas:

   ```bash
   mysql -uroot -e "CREATE DATABASE gestor_carga CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   DATABASE_URL="mysql://USUARIO:CLAVE@127.0.0.1:3306/gestor_carga" npx --no-install prisma migrate deploy
   ```

2. Datos sintéticos (233 centros, 4.000 alumnos, asistencia diaria de septiembre a noviembre).
   Contraseña de todas las cuentas: `CargaExtrema2026`.

   ```bash
   node -e "require('bcryptjs').hash('CargaExtrema2026',10).then(h=>require('fs').writeFileSync('hash.txt',h))"
   python3 scripts/carga/generar_datos.py hash.txt carga.sql      # crea carga.sql y carga.sql.json
   mysql --default-character-set=utf8mb4 -uroot gestor_carga < carga.sql
   ```

3. Arrancar la aplicación contra esa base (`DATABASE_NAME=gestor_carga npm start`, uno o varios procesos)
   y lanzar la prueba:

   ```bash
   CARGA_DATOS=carga.sql.json node scripts/carga/prueba-carga.mjs resultado.json 233 http://localhost:3101[,http://localhost:3102,...]
   ```

   Con varias URL, los centros se reparten entre los procesos (como haría el balanceador).

4. Copiar el JSON a `docs/informes/datos/` y regenerar los informes:
   `node scripts/informes/generar-informes.mjs`.
