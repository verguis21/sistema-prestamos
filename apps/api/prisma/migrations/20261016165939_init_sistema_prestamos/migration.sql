-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'RUC10');

-- CreateEnum
CREATE TYPE "EstadoPrestamo" AS ENUM ('ACTIVO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoCuota" AS ENUM ('PENDIENTE', 'PAGADA');

-- CreateTable
CREATE TABLE "Agencia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "agenciaId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "identidadVerificada" BOOLEAN NOT NULL DEFAULT false,
    "proveedorIdentidad" TEXT,
    "verificadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestamo" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "agenciaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "plazoMeses" INTEGER NOT NULL,
    "tea" DECIMAL(8,6) NOT NULL DEFAULT 0.30,
    "baseDias" INTEGER NOT NULL DEFAULT 360,
    "diasPeriodo" INTEGER NOT NULL DEFAULT 30,
    "fechaPrestamo" DATE NOT NULL,
    "cuotaFija" DECIMAL(12,2) NOT NULL,
    "interesTotal" DECIMAL(12,2) NOT NULL,
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoPrestamo" NOT NULL DEFAULT 'ACTIVO',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuota" (
    "id" TEXT NOT NULL,
    "prestamoId" TEXT NOT NULL,
    "numeroCuota" INTEGER NOT NULL,
    "fechaVencimiento" DATE NOT NULL,
    "capital" DECIMAL(12,2) NOT NULL,
    "interes" DECIMAL(12,2) NOT NULL,
    "montoCuota" DECIMAL(12,2) NOT NULL,
    "saldoRestante" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoCuota" NOT NULL DEFAULT 'PENDIENTE',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agencia_nombre_key" ON "Agencia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Trabajador_correo_key" ON "Trabajador"("correo");

-- CreateIndex
CREATE INDEX "Trabajador_agenciaId_idx" ON "Trabajador"("agenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_numeroDocumento_key" ON "Cliente"("numeroDocumento");

-- CreateIndex
CREATE INDEX "Prestamo_clienteId_estado_idx" ON "Prestamo"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "Prestamo_agenciaId_idx" ON "Prestamo"("agenciaId");

-- CreateIndex
CREATE INDEX "Prestamo_trabajadorId_idx" ON "Prestamo"("trabajadorId");

-- CreateIndex
CREATE INDEX "Cuota_fechaVencimiento_idx" ON "Cuota"("fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "Cuota_prestamoId_numeroCuota_key" ON "Cuota"("prestamoId", "numeroCuota");

-- AddForeignKey
ALTER TABLE "Trabajador" ADD CONSTRAINT "Trabajador_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "Agencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "Agencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "Prestamo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
