-- Ejecutar UNA VEZ en Supabase → SQL Editor
-- Borra las filas "fantasma" marcadas como eliminadas en el horario,
-- que quedaron de las pruebas de hoy y estaban causando que celdas
-- nuevas se borraran solas al reutilizar el mismo día+bloque.
delete from horario where _eliminado = true;
