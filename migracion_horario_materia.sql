-- Ejecutar UNA VEZ en Supabase → SQL Editor
-- Agrega la columna que separa el horario de cada materia. Sin esto,
-- todas las materias comparten las mismas celdas de día+bloque y
-- borrar/agregar una clase en una materia afecta a las demás.
alter table horario add column if not exists ctx_materia text;
