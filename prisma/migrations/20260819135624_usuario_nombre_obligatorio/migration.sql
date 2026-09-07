/*
  Warnings:

  - Made the column `nombre` on table `usuarios` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `usuarios` MODIFY `nombre` VARCHAR(191) NOT NULL;
