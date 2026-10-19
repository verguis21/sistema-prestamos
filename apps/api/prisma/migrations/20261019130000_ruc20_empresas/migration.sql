-- RUC20 is used as an operation document ONLY. Cliente stays a natural person (DNI or RUC10).
ALTER TYPE "TipoDocumento" ADD VALUE IF NOT EXISTS 'RUC20';

CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "estadoSunat" TEXT,
    "representanteId" TEXT NOT NULL,
    "representacionRevisadaEn" TIMESTAMP(3) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- Only backend Prisma/owner accesses these rows. Supabase anon/auth has no policies.
ALTER TABLE "Empresa" ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX "Empresa_ruc_key" ON "Empresa"("ruc");
CREATE INDEX "Empresa_representanteId_idx" ON "Empresa"("representanteId");
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_representanteId_fkey"
  FOREIGN KEY ("representanteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prestamo" ADD COLUMN "empresaId" TEXT;
CREATE INDEX "Prestamo_empresaId_idx" ON "Prestamo"("empresaId");
ALTER TABLE "Prestamo" ADD CONSTRAINT "Prestamo_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
