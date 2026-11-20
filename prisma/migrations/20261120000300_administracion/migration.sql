-- CreateTable
CREATE TABLE `administradores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `debe_cambiar_clave` BOOLEAN NOT NULL DEFAULT true,
    `clave_temporal_expira` DATETIME(3) NULL,
    `clave_actualizada_at` DATETIME(3) NULL,
    `ultimo_acceso` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `administradores_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_administracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `administrador_id` INTEGER NOT NULL,
    `accion` VARCHAR(191) NOT NULL,
    `detalle` TEXT NULL,
    `centro_id` INTEGER NULL,
    `usuario_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `registro_administracion_created_at_idx`(`created_at`),
    INDEX `registro_administracion_administrador_id_idx`(`administrador_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `registro_administracion` ADD CONSTRAINT `registro_administracion_administrador_id_fkey` FOREIGN KEY (`administrador_id`) REFERENCES `administradores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

