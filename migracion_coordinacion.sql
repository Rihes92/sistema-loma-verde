-- Tablas para el módulo de Coordinación: docentes y sus asignaciones
-- (materia + grado/grupo). Mismo patrón genérico "id + datos jsonb"
-- usado en lv_malla, lv_planeadores, lv_examenes, lv_banco, etc.

create table if not exists lv_docentes (
  id text primary key,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

create table if not exists lv_asignaciones (
  id text primary key,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

create or replace function lv_coord_set_actualizado()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lv_docentes_actualizado on lv_docentes;
create trigger trg_lv_docentes_actualizado
before update on lv_docentes
for each row execute function lv_coord_set_actualizado();

drop trigger if exists trg_lv_asignaciones_actualizado on lv_asignaciones;
create trigger trg_lv_asignaciones_actualizado
before update on lv_asignaciones
for each row execute function lv_coord_set_actualizado();
