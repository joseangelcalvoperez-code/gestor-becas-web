-- AlterTable
ALTER TABLE `asistencias_dias` ADD COLUMN `observaciones` TEXT NULL;

-- CreateTable
CREATE TABLE `matriculas_asignaturas_convalidadas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matricula_id` INTEGER NOT NULL,
    `asignatura_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `matriculas_asignaturas_convalidadas_matricula_id_idx`(`matricula_id`),
    INDEX `matriculas_asignaturas_convalidadas_asignatura_id_idx`(`asignatura_id`),
    UNIQUE INDEX `matriculas_asignaturas_convalidadas_matricula_id_asignatura__key`(`matricula_id`, `asignatura_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `matriculas_asignaturas_convalidadas` ADD CONSTRAINT `matriculas_asignaturas_convalidadas_matricula_id_fkey` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas_asignaturas_convalidadas` ADD CONSTRAINT `matriculas_asignaturas_convalidadas_asignatura_id_fkey` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
