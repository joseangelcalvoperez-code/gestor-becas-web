-- DropForeignKey
ALTER TABLE `alumnos` DROP FOREIGN KEY `alumnos_centro_id_fkey`;

-- DropIndex
DROP INDEX `alumnos_centro_id_dni_activo_key` ON `alumnos`;

-- CreateIndex
CREATE INDEX `alumnos_centro_id_dni_idx` ON `alumnos`(`centro_id`, `dni`);

-- CreateIndex
CREATE INDEX `alumnos_centro_id_expediente_idx` ON `alumnos`(`centro_id`, `expediente`);
