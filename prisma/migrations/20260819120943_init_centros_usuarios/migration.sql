-- CreateTable
CREATE TABLE `centros` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `cif` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `localidad` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `sello_firma_url` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `centros_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_usuario_key`(`usuario`),
    INDEX `usuarios_centro_id_idx`(`centro_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
