-- CreateIndex
CREATE INDEX `matriculas_centro_id_curso_academico_id_grado_id_curso_idx` ON `matriculas`(`centro_id`, `curso_academico_id`, `grado_id`, `curso`);

-- CreateIndex
CREATE INDEX `asistencias_matricula_id_anio_mes_idx` ON `asistencias`(`matricula_id`, `anio`, `mes`);

-- CreateIndex
CREATE INDEX `asistencias_centro_id_anio_mes_idx` ON `asistencias`(`centro_id`, `anio`, `mes`);

