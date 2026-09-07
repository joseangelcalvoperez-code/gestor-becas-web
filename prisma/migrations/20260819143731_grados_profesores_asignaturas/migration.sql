-- CreateTable
CREATE TABLE `grados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `grados_centro_id_idx`(`centro_id`),
    UNIQUE INDEX `grados_centro_id_nombre_key`(`centro_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profesores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `profesores_centro_id_idx`(`centro_id`),
    UNIQUE INDEX `profesores_centro_id_dni_key`(`centro_id`, `dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asignaturas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `grado_id` INTEGER NOT NULL,
    `profesor_id` INTEGER NOT NULL,
    `curso` INTEGER NOT NULL,
    `codigo` VARCHAR(191) NOT NULL DEFAULT '',
    `nombre` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asignaturas_centro_id_idx`(`centro_id`),
    INDEX `asignaturas_grado_id_idx`(`grado_id`),
    INDEX `asignaturas_profesor_id_idx`(`profesor_id`),
    UNIQUE INDEX `asignaturas_centro_id_grado_id_curso_nombre_key`(`centro_id`, `grado_id`, `curso`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grados` ADD CONSTRAINT `grados_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profesores` ADD CONSTRAINT `profesores_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaturas` ADD CONSTRAINT `asignaturas_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaturas` ADD CONSTRAINT `asignaturas_grado_id_fkey` FOREIGN KEY (`grado_id`) REFERENCES `grados`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asignaturas` ADD CONSTRAINT `asignaturas_profesor_id_fkey` FOREIGN KEY (`profesor_id`) REFERENCES `profesores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
