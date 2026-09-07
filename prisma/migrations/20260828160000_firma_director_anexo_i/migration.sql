-- Datos del director configurables por cada centro.
ALTER TABLE `centros`
    ADD COLUMN `director_nombre` VARCHAR(191) NULL,
    ADD COLUMN `director_apellidos` VARCHAR(191) NULL,
    ADD COLUMN `director_dni` VARCHAR(191) NULL,
    ADD COLUMN `director_email` VARCHAR(191) NULL;

-- Los registros existentes son profesores. Los nuevos Anexos I pueden
-- incorporar un firmante director como segunda fase del circuito.
ALTER TABLE `firmantes_envio`
    ADD COLUMN `tipo` ENUM('PROFESOR', 'DIRECTOR') NOT NULL DEFAULT 'PROFESOR';

CREATE INDEX `firmantes_envio_tipo_idx` ON `firmantes_envio`(`tipo`);
