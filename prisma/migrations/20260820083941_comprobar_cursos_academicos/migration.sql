-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
