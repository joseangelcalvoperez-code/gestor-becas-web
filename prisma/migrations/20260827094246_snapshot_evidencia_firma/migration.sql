-- AlterTable
ALTER TABLE `documentos_firma` ADD COLUMN `snapshot_alumno_apellidos` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_alumno_dni` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_alumno_nombre` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_asignatura_codigo` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_asignatura_nombre` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_capturado_en` DATETIME(3) NULL,
    ADD COLUMN `snapshot_centro_codigo` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_centro_nombre` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_curso_academico_nombre` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_curso_alumno` INTEGER NULL,
    ADD COLUMN `snapshot_expediente` VARCHAR(191) NULL,
    ADD COLUMN `snapshot_grado_nombre` VARCHAR(191) NULL;
