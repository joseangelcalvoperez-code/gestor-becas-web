/*
  Warnings:

  - A unique constraint covering the columns `[centro_id,email]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `usuarios_email_key` ON `usuarios`;

-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `apellidos` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX `usuarios_email_idx` ON `usuarios`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `usuarios_centro_id_email_key` ON `usuarios`(`centro_id`, `email`);
