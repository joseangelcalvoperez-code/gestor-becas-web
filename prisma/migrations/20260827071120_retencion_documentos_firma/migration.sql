-- AlterTable
ALTER TABLE `documentos_firma` ADD COLUMN `motivo_eliminacion_pdf` VARCHAR(100) NULL,
    ADD COLUMN `pdf_disponible_hasta` DATETIME(3) NULL,
    ADD COLUMN `pdf_eliminado_en` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `firmas_documentos` ADD COLUMN `evidencia_disponible_hasta` DATETIME(3) NULL;
