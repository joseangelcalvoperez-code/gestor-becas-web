/*
  Warnings:

  - You are about to drop the column `curso` on the `alumnos` table. All the data in the column will be lost.
  - You are about to drop the column `expediente` on the `alumnos` table. All the data in the column will be lost.
  - You are about to drop the column `grado_id` on the `alumnos` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `alumnos` DROP FOREIGN KEY `alumnos_grado_id_fkey`;

-- DropIndex
DROP INDEX `alumnos_centro_id_expediente_idx` ON `alumnos`;

-- DropIndex
DROP INDEX `alumnos_grado_id_idx` ON `alumnos`;

-- AlterTable
ALTER TABLE `alumnos` DROP COLUMN `curso`,
    DROP COLUMN `expediente`,
    DROP COLUMN `grado_id`;

-- CreateTable
CREATE TABLE `cursos_academicos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cursos_academicos_centro_id_idx`(`centro_id`),
    UNIQUE INDEX `cursos_academicos_centro_id_nombre_key`(`centro_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matriculas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `alumno_id` INTEGER NOT NULL,
    `curso_academico_id` INTEGER NOT NULL,
    `grado_id` INTEGER NOT NULL,
    `curso` INTEGER NOT NULL,
    `expediente` VARCHAR(191) NOT NULL DEFAULT '',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `matriculas_centro_id_idx`(`centro_id`),
    INDEX `matriculas_alumno_id_idx`(`alumno_id`),
    INDEX `matriculas_curso_academico_id_idx`(`curso_academico_id`),
    INDEX `matriculas_grado_id_idx`(`grado_id`),
    INDEX `matriculas_centro_id_expediente_idx`(`centro_id`, `expediente`),
    UNIQUE INDEX `matriculas_centro_id_alumno_id_curso_academico_id_key`(`centro_id`, `alumno_id`, `curso_academico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alumnos` ADD CONSTRAINT `alumnos_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cursos_academicos` ADD CONSTRAINT `cursos_academicos_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `alumnos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_curso_academico_id_fkey` FOREIGN KEY (`curso_academico_id`) REFERENCES `cursos_academicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_grado_id_fkey` FOREIGN KEY (`grado_id`) REFERENCES `grados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
