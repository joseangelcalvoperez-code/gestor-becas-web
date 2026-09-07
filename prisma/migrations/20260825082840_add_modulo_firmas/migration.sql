-- CreateTable
CREATE TABLE `envios_firma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `curso_academico_id` INTEGER NULL,
    `tipo` ENUM('DOCUMENTOS_GENERADOS', 'DOCUMENTO_MANUAL') NOT NULL,
    `estado` ENUM('BORRADOR', 'PENDIENTE', 'PARCIAL', 'COMPLETADO', 'CANCELADO') NOT NULL DEFAULT 'BORRADOR',
    `nombre` VARCHAR(191) NOT NULL,
    `anio` INTEGER NULL,
    `mes` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `envios_firma_centro_id_idx`(`centro_id`),
    INDEX `envios_firma_curso_academico_id_idx`(`curso_academico_id`),
    INDEX `envios_firma_estado_idx`(`estado`),
    INDEX `envios_firma_anio_mes_idx`(`anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_firma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `envio_firma_id` INTEGER NOT NULL,
    `matricula_id` INTEGER NULL,
    `asignatura_id` INTEGER NULL,
    `tipo` ENUM('ANEXO_I', 'ANEXO_V', 'OTRO') NOT NULL,
    `nombre_archivo` VARCHAR(191) NOT NULL,
    `archivo_original_key` VARCHAR(191) NOT NULL,
    `archivo_firmado_key` VARCHAR(191) NULL,
    `hash_original` VARCHAR(191) NOT NULL,
    `hash_firmado` VARCHAR(191) NULL,
    `csv` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'PARCIAL', 'FIRMADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE',
    `anio` INTEGER NULL,
    `mes` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `documentos_firma_csv_key`(`csv`),
    INDEX `documentos_firma_envio_firma_id_idx`(`envio_firma_id`),
    INDEX `documentos_firma_matricula_id_idx`(`matricula_id`),
    INDEX `documentos_firma_asignatura_id_idx`(`asignatura_id`),
    INDEX `documentos_firma_estado_idx`(`estado`),
    INDEX `documentos_firma_anio_mes_idx`(`anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `firmantes_envio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `envio_firma_id` INTEGER NOT NULL,
    `profesor_id` INTEGER NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `token` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'FIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fecha_firma` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `firmantes_envio_token_key`(`token`),
    INDEX `firmantes_envio_envio_firma_id_idx`(`envio_firma_id`),
    INDEX `firmantes_envio_profesor_id_idx`(`profesor_id`),
    INDEX `firmantes_envio_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `firmas_documentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_firma_id` INTEGER NOT NULL,
    `firmante_envio_id` INTEGER NOT NULL,
    `fecha_firma` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `hash_documento` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `firmas_documentos_documento_firma_id_idx`(`documento_firma_id`),
    INDEX `firmas_documentos_firmante_envio_id_idx`(`firmante_envio_id`),
    UNIQUE INDEX `firmas_documentos_documento_firma_id_firmante_envio_id_key`(`documento_firma_id`, `firmante_envio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `eventos_firma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `envio_firma_id` INTEGER NOT NULL,
    `tipo` ENUM('ENVIO_CREADO', 'DOCUMENTO_ANADIDO', 'ENVIO_ENVIADO', 'ACCESO_FIRMANTE', 'DOCUMENTO_FIRMADO', 'LOTE_FIRMADO', 'DOCUMENTO_ANULADO', 'ENVIO_COMPLETADO', 'ENVIO_CANCELADO') NOT NULL,
    `descripcion` TEXT NOT NULL,
    `ip` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `eventos_firma_envio_firma_id_idx`(`envio_firma_id`),
    INDEX `eventos_firma_tipo_idx`(`tipo`),
    INDEX `eventos_firma_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `envios_firma` ADD CONSTRAINT `envios_firma_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `envios_firma` ADD CONSTRAINT `envios_firma_curso_academico_id_fkey` FOREIGN KEY (`curso_academico_id`) REFERENCES `cursos_academicos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_firma` ADD CONSTRAINT `documentos_firma_envio_firma_id_fkey` FOREIGN KEY (`envio_firma_id`) REFERENCES `envios_firma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_firma` ADD CONSTRAINT `documentos_firma_matricula_id_fkey` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_firma` ADD CONSTRAINT `documentos_firma_asignatura_id_fkey` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firmantes_envio` ADD CONSTRAINT `firmantes_envio_envio_firma_id_fkey` FOREIGN KEY (`envio_firma_id`) REFERENCES `envios_firma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firmantes_envio` ADD CONSTRAINT `firmantes_envio_profesor_id_fkey` FOREIGN KEY (`profesor_id`) REFERENCES `profesores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firmas_documentos` ADD CONSTRAINT `firmas_documentos_documento_firma_id_fkey` FOREIGN KEY (`documento_firma_id`) REFERENCES `documentos_firma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firmas_documentos` ADD CONSTRAINT `firmas_documentos_firmante_envio_id_fkey` FOREIGN KEY (`firmante_envio_id`) REFERENCES `firmantes_envio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `eventos_firma` ADD CONSTRAINT `eventos_firma_envio_firma_id_fkey` FOREIGN KEY (`envio_firma_id`) REFERENCES `envios_firma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
