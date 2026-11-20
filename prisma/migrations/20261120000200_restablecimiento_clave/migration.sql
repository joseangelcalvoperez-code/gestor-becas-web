-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `clave_actualizada_at` DATETIME(3) NULL,
    ADD COLUMN `clave_temporal_expira` DATETIME(3) NULL,
    ADD COLUMN `debe_cambiar_clave` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `solicitudes_restablecimiento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atendida_at` DATETIME(3) NULL,

    INDEX `solicitudes_restablecimiento_usuario_id_idx`(`usuario_id`),
    INDEX `solicitudes_restablecimiento_atendida_at_idx`(`atendida_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `solicitudes_restablecimiento` ADD CONSTRAINT `solicitudes_restablecimiento_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

