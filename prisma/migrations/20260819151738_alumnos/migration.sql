-- CreateTable
CREATE TABLE `alumnos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `grado_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `expediente` VARCHAR(191) NOT NULL DEFAULT '',
    `curso` INTEGER NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `alumnos_centro_id_idx`(`centro_id`),
    INDEX `alumnos_grado_id_idx`(`grado_id`),
    UNIQUE INDEX `alumnos_centro_id_dni_activo_key`(`centro_id`, `dni`, `activo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alumnos` ADD CONSTRAINT `alumnos_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alumnos` ADD CONSTRAINT `alumnos_grado_id_fkey` FOREIGN KEY (`grado_id`) REFERENCES `grados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
