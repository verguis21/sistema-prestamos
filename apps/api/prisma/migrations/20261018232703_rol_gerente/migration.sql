-- CreateEnum
CREATE TYPE "RolTrabajador" AS ENUM ('ASESOR', 'GERENTE');

-- AlterTable
ALTER TABLE "Trabajador" ADD COLUMN     "rol" "RolTrabajador" NOT NULL DEFAULT 'ASESOR';
