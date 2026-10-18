-- CreateTable
CREATE TABLE "ClienteAgencia" (
    "clienteId" TEXT NOT NULL,
    "agenciaId" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "vinculadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteAgencia_pkey" PRIMARY KEY ("clienteId","agenciaId")
);

-- CreateIndex
CREATE INDEX "ClienteAgencia_agenciaId_idx" ON "ClienteAgencia"("agenciaId");

-- CreateIndex
CREATE INDEX "ClienteAgencia_trabajadorId_idx" ON "ClienteAgencia"("trabajadorId");

-- AddForeignKey
ALTER TABLE "ClienteAgencia" ADD CONSTRAINT "ClienteAgencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAgencia" ADD CONSTRAINT "ClienteAgencia_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "Agencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteAgencia" ADD CONSTRAINT "ClienteAgencia_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
