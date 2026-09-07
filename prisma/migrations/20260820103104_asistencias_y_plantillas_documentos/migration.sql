-- CreateTable
CREATE TABLE `asistencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `matricula_id` INTEGER NOT NULL,
    `asignatura_id` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `horas_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `horas_no_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asistencias_centro_id_idx`(`centro_id`),
    INDEX `asistencias_matricula_id_idx`(`matricula_id`),
    INDEX `asistencias_asignatura_id_idx`(`asignatura_id`),
    INDEX `asistencias_anio_mes_idx`(`anio`, `mes`),
    UNIQUE INDEX `asistencias_matricula_id_asignatura_id_anio_mes_key`(`matricula_id`, `asignatura_id`, `anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantillas_documentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ANEXO_I', 'ANEXO_V') NOT NULL,
    `curso_inicio` INTEGER NOT NULL,
    `curso_fin` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `nombre` VARCHAR(191) NOT NULL,
    `archivo_key` VARCHAR(191) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `plantillas_documentos_curso_inicio_curso_fin_idx`(`curso_inicio`, `curso_fin`),
    INDEX `plantillas_documentos_tipo_idx`(`tipo`),
    UNIQUE INDEX `plantillas_documentos_tipo_curso_inicio_curso_fin_version_key`(`tipo`, `curso_inicio`, `curso_fin`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_matricula_id_fkey` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_asignatura_id_fkey` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
