-- AlterTable
ALTER TABLE `documentos_firma` MODIFY `estado` ENUM('PENDIENTE', 'PARCIAL', 'FIRMADO', 'RECHAZADO', 'ANULADO') NOT NULL DEFAULT 'PENDIENTE';

-- AlterTable
ALTER TABLE `eventos_firma` MODIFY `tipo` ENUM('ENVIO_CREADO', 'DOCUMENTO_ANADIDO', 'ENVIO_ENVIADO', 'ACCESO_FIRMANTE', 'DOCUMENTO_FIRMADO', 'DOCUMENTO_RECHAZADO', 'RECHAZO_RETIRADO', 'LOTE_PROCESADO', 'LOTE_FIRMADO', 'DOCUMENTO_ANULADO', 'ENVIO_COMPLETADO', 'ENVIO_CANCELADO') NOT NULL;

-- AlterTable
ALTER TABLE `firmantes_envio` MODIFY `estado` ENUM('PENDIENTE', 'PARCIAL', 'FIRMADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE';

-- CreateTable
CREATE TABLE `rechazos_documentos_firma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documento_firma_id` INTEGER NOT NULL,
    `firmante_envio_id` INTEGER NOT NULL,
    `observaciones` TEXT NULL,
    `fecha_rechazo` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ip` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rechazos_documentos_firma_documento_firma_id_idx`(`documento_firma_id`),
    INDEX `rechazos_documentos_firma_firmante_envio_id_idx`(`firmante_envio_id`),
    INDEX `rechazos_documentos_firma_fecha_rechazo_idx`(`fecha_rechazo`),
    UNIQUE INDEX `rechazos_documentos_firma_documento_firma_id_firmante_envio__key`(`documento_firma_id`, `firmante_envio_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rechazos_documentos_firma` ADD CONSTRAINT `rechazos_documentos_firma_documento_firma_id_fkey` FOREIGN KEY (`documento_firma_id`) REFERENCES `documentos_firma`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rechazos_documentos_firma` ADD CONSTRAINT `rechazos_documentos_firma_firmante_envio_id_fkey` FOREIGN KEY (`firmante_envio_id`) REFERENCES `firmantes_envio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
