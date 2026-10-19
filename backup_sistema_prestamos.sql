


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."EstadoCuota" AS ENUM (
    'PENDIENTE',
    'PAGADA'
);


ALTER TYPE "public"."EstadoCuota" OWNER TO "postgres";


CREATE TYPE "public"."EstadoPrestamo" AS ENUM (
    'ACTIVO',
    'CANCELADO'
);


ALTER TYPE "public"."EstadoPrestamo" OWNER TO "postgres";


CREATE TYPE "public"."RolTrabajador" AS ENUM (
    'ASESOR',
    'GERENTE'
);


ALTER TYPE "public"."RolTrabajador" OWNER TO "postgres";


CREATE TYPE "public"."TipoDocumento" AS ENUM (
    'DNI',
    'RUC10'
);


ALTER TYPE "public"."TipoDocumento" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Agencia" (
    "id" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "ciudad" "text" NOT NULL,
    "activa" boolean DEFAULT true NOT NULL,
    "creadaEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Agencia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Cliente" (
    "id" "text" NOT NULL,
    "tipoDocumento" "public"."TipoDocumento" NOT NULL,
    "numeroDocumento" "text" NOT NULL,
    "nombres" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "identidadVerificada" boolean DEFAULT false NOT NULL,
    "proveedorIdentidad" "text",
    "verificadoEn" timestamp(3) without time zone,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Cliente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ClienteAgencia" (
    "clienteId" "text" NOT NULL,
    "agenciaId" "text" NOT NULL,
    "trabajadorId" "text" NOT NULL,
    "vinculadaEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."ClienteAgencia" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Cuota" (
    "id" "text" NOT NULL,
    "prestamoId" "text" NOT NULL,
    "numeroCuota" integer NOT NULL,
    "fechaVencimiento" "date" NOT NULL,
    "capital" numeric(12,2) NOT NULL,
    "interes" numeric(12,2) NOT NULL,
    "montoCuota" numeric(12,2) NOT NULL,
    "saldoRestante" numeric(12,2) NOT NULL,
    "estado" "public"."EstadoCuota" DEFAULT 'PENDIENTE'::"public"."EstadoCuota" NOT NULL,
    "creadaEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."Cuota" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Prestamo" (
    "id" "text" NOT NULL,
    "clienteId" "text" NOT NULL,
    "agenciaId" "text" NOT NULL,
    "trabajadorId" "text" NOT NULL,
    "monto" numeric(12,2) NOT NULL,
    "plazoMeses" integer NOT NULL,
    "tea" numeric(8,6) DEFAULT 0.30 NOT NULL,
    "baseDias" integer DEFAULT 360 NOT NULL,
    "diasPeriodo" integer DEFAULT 30 NOT NULL,
    "fechaPrestamo" "date" NOT NULL,
    "cuotaFija" numeric(12,2) NOT NULL,
    "interesTotal" numeric(12,2) NOT NULL,
    "montoTotal" numeric(12,2) NOT NULL,
    "estado" "public"."EstadoPrestamo" DEFAULT 'ACTIVO'::"public"."EstadoPrestamo" NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actualizadoEn" timestamp(3) without time zone NOT NULL,
    "numeroDocumentoOperacion" "text",
    "tipoDocumentoOperacion" "public"."TipoDocumento"
);


ALTER TABLE "public"."Prestamo" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Trabajador" (
    "id" "text" NOT NULL,
    "nombres" "text" NOT NULL,
    "apellidos" "text" NOT NULL,
    "correo" "text" NOT NULL,
    "passwordHash" "text" NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "agenciaId" "text" NOT NULL,
    "creadoEn" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rol" "public"."RolTrabajador" DEFAULT 'ASESOR'::"public"."RolTrabajador" NOT NULL
);


ALTER TABLE "public"."Trabajador" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."_prisma_migrations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Agencia"
    ADD CONSTRAINT "Agencia_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ClienteAgencia"
    ADD CONSTRAINT "ClienteAgencia_pkey" PRIMARY KEY ("clienteId", "agenciaId");



ALTER TABLE ONLY "public"."Cliente"
    ADD CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Cuota"
    ADD CONSTRAINT "Cuota_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Prestamo"
    ADD CONSTRAINT "Prestamo_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Trabajador"
    ADD CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "Agencia_nombre_key" ON "public"."Agencia" USING "btree" ("nombre");



CREATE INDEX "ClienteAgencia_agenciaId_idx" ON "public"."ClienteAgencia" USING "btree" ("agenciaId");



CREATE INDEX "ClienteAgencia_trabajadorId_idx" ON "public"."ClienteAgencia" USING "btree" ("trabajadorId");



CREATE UNIQUE INDEX "Cliente_numeroDocumento_key" ON "public"."Cliente" USING "btree" ("numeroDocumento");



CREATE INDEX "Cuota_fechaVencimiento_idx" ON "public"."Cuota" USING "btree" ("fechaVencimiento");



CREATE UNIQUE INDEX "Cuota_prestamoId_numeroCuota_key" ON "public"."Cuota" USING "btree" ("prestamoId", "numeroCuota");



CREATE INDEX "Prestamo_agenciaId_idx" ON "public"."Prestamo" USING "btree" ("agenciaId");



CREATE INDEX "Prestamo_clienteId_estado_idx" ON "public"."Prestamo" USING "btree" ("clienteId", "estado");



CREATE INDEX "Prestamo_trabajadorId_idx" ON "public"."Prestamo" USING "btree" ("trabajadorId");



CREATE INDEX "Trabajador_agenciaId_idx" ON "public"."Trabajador" USING "btree" ("agenciaId");



CREATE UNIQUE INDEX "Trabajador_correo_key" ON "public"."Trabajador" USING "btree" ("correo");



ALTER TABLE ONLY "public"."ClienteAgencia"
    ADD CONSTRAINT "ClienteAgencia_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "public"."Agencia"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ClienteAgencia"
    ADD CONSTRAINT "ClienteAgencia_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ClienteAgencia"
    ADD CONSTRAINT "ClienteAgencia_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "public"."Trabajador"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Cuota"
    ADD CONSTRAINT "Cuota_prestamoId_fkey" FOREIGN KEY ("prestamoId") REFERENCES "public"."Prestamo"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Prestamo"
    ADD CONSTRAINT "Prestamo_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "public"."Agencia"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Prestamo"
    ADD CONSTRAINT "Prestamo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Prestamo"
    ADD CONSTRAINT "Prestamo_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "public"."Trabajador"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Trabajador"
    ADD CONSTRAINT "Trabajador_agenciaId_fkey" FOREIGN KEY ("agenciaId") REFERENCES "public"."Agencia"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE "public"."Agencia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Cliente" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ClienteAgencia" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Cuota" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Prestamo" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Trabajador" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."Agencia" TO "service_role";



GRANT ALL ON TABLE "public"."Cliente" TO "service_role";



GRANT ALL ON TABLE "public"."ClienteAgencia" TO "service_role";



GRANT ALL ON TABLE "public"."Cuota" TO "service_role";



GRANT ALL ON TABLE "public"."Prestamo" TO "service_role";



GRANT ALL ON TABLE "public"."Trabajador" TO "service_role";



GRANT ALL ON TABLE "public"."_prisma_migrations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































