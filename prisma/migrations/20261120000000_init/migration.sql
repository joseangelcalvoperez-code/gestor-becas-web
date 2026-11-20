-- CreateTable
CREATE TABLE `centros` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `cif` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `localidad` VARCHAR(191) NOT NULL,
    `provincia` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `sello_firma_url` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `centros_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    INDEX `usuarios_centro_id_idx`(`centro_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `alumnos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellidos` VARCHAR(191) NOT NULL,
    `dni` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `alumnos_centro_id_idx`(`centro_id`),
    INDEX `alumnos_centro_id_dni_idx`(`centro_id`, `dni`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cursos_academicos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fecha_inicio` DATETIME(3) NOT NULL,
    `fecha_fin` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `actual` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cursos_academicos_centro_id_idx`(`centro_id`),
    INDEX `cursos_academicos_centro_id_actual_idx`(`centro_id`, `actual`),
    UNIQUE INDEX `cursos_academicos_centro_id_nombre_key`(`centro_id`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matriculas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `alumno_id` INTEGER NOT NULL,
    `curso_academico_id` INTEGER NOT NULL,
    `grado_id` INTEGER NOT NULL,
    `curso` INTEGER NOT NULL,
    `expediente` VARCHAR(191) NOT NULL DEFAULT '',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `matriculas_centro_id_idx`(`centro_id`),
    INDEX `matriculas_alumno_id_idx`(`alumno_id`),
    INDEX `matriculas_curso_academico_id_idx`(`curso_academico_id`),
    INDEX `matriculas_grado_id_idx`(`grado_id`),
    INDEX `matriculas_centro_id_expediente_idx`(`centro_id`, `expediente`),
    UNIQUE INDEX `matriculas_centro_id_alumno_id_curso_academico_id_key`(`centro_id`, `alumno_id`, `curso_academico_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asistencias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `centro_id` INTEGER NOT NULL,
    `matricula_id` INTEGER NOT NULL,
    `asignatura_id` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `horas_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `horas_no_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asistencias_centro_id_idx`(`centro_id`),
    INDEX `asistencias_matricula_id_idx`(`matricula_id`),
    INDEX `asistencias_asignatura_id_idx`(`asignatura_id`),
    INDEX `asistencias_anio_mes_idx`(`anio`, `mes`),
    UNIQUE INDEX `asistencias_matricula_id_asignatura_id_anio_mes_key`(`matricula_id`, `asignatura_id`, `anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asistencias_dias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asistencia_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `horas_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `horas_no_asistidas` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `observaciones` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `asistencias_dias_asistencia_id_idx`(`asistencia_id`),
    INDEX `asistencias_dias_fecha_idx`(`fecha`),
    UNIQUE INDEX `asistencias_dias_asistencia_id_fecha_key`(`asistencia_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantillas_documentos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('ANEXO_I', 'ANEXO_V') NOT NULL,
    `curso_inicio` INTEGER NOT NULL,
    `curso_fin` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `nombre` VARCHAR(191) NOT NULL,
    `archivo_key` VARCHAR(191) NOT NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `plantillas_documentos_curso_inicio_curso_fin_idx`(`curso_inicio`, `curso_fin`),
    INDEX `plantillas_documentos_tipo_idx`(`tipo`),
    UNIQUE INDEX `plantillas_documentos_tipo_curso_inicio_curso_fin_version_key`(`tipo`, `curso_inicio`, `curso_fin`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `matriculas_asignaturas_convalidadas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matricula_id` INTEGER NOT NULL,
    `asignatura_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `matriculas_asignaturas_convalidadas_matricula_id_idx`(`matricula_id`),
    INDEX `matriculas_asignaturas_convalidadas_asignatura_id_idx`(`asignatura_id`),
    UNIQUE INDEX `matriculas_asignaturas_convalidadas_matricula_id_asignatura__key`(`matricula_id`, `asignatura_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `alumnos` ADD CONSTRAINT `alumnos_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cursos_academicos` ADD CONSTRAINT `cursos_academicos_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_alumno_id_fkey` FOREIGN KEY (`alumno_id`) REFERENCES `alumnos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_curso_academico_id_fkey` FOREIGN KEY (`curso_academico_id`) REFERENCES `cursos_academicos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas` ADD CONSTRAINT `matriculas_grado_id_fkey` FOREIGN KEY (`grado_id`) REFERENCES `grados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_centro_id_fkey` FOREIGN KEY (`centro_id`) REFERENCES `centros`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_matricula_id_fkey` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias` ADD CONSTRAINT `asistencias_asignatura_id_fkey` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asistencias_dias` ADD CONSTRAINT `asistencias_dias_asistencia_id_fkey` FOREIGN KEY (`asistencia_id`) REFERENCES `asistencias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas_asignaturas_convalidadas` ADD CONSTRAINT `matriculas_asignaturas_convalidadas_matricula_id_fkey` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `matriculas_asignaturas_convalidadas` ADD CONSTRAINT `matriculas_asignaturas_convalidadas_asignatura_id_fkey` FOREIGN KEY (`asignatura_id`) REFERENCES `asignaturas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

