-- AlterTable
ALTER TABLE `cursos_academicos` ADD COLUMN `actual` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `cursos_academicos_centro_id_actual_idx` ON `cursos_academicos`(`centro_id`, `actual`);
