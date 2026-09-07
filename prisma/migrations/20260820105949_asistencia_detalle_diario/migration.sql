-- CreateTable
CREATE TABLE `asistencias_dias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asistencia_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `horas_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `horas_no_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asistencias_dias_asistencia_id_idx`(`asistencia_id`),
    INDEX `asistencias_dias_fecha_idx`(`fecha`),
    UNIQUE INDEX `asistencias_dias_asistencia_id_fecha_key`(`asistencia_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asistencias_dias` ADD CONSTRAINT `asistencias_dias_asistencia_id_fkey` FOREIGN KEY (`asistencia_id`) REFERENCES `asistencias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
