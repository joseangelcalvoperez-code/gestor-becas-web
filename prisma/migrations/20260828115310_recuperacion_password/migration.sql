-- CreateTable
CREATE TABLE `recuperaciones_password` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `usado_en` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `recuperaciones_password_token_hash_key`(`token_hash`),
    INDEX `recuperaciones_password_usuario_id_idx`(`usuario_id`),
    INDEX `recuperaciones_password_expira_en_idx`(`expira_en`),
    INDEX `recuperaciones_password_usado_en_idx`(`usado_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `recuperaciones_password` ADD CONSTRAINT `recuperaciones_password_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
