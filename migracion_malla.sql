-- Tabla para la malla curricular editable por materia.
-- Sigue el mismo patrón que lv_planeadores, lv_examenes, lv_banco, etc.:
-- una tabla genérica "id + datos jsonb", donde "datos" guarda el registro
-- completo (incluyendo el campo materia para poder filtrarlo en la app).
create table if not exists lv_malla (
  id text primary key,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

-- Mantener actualizado_en al día en cada upsert (igual que las demás tablas).
create or replace function lv_malla_set_actualizado()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lv_malla_actualizado on lv_malla;
create trigger trg_lv_malla_actualizado
before update on lv_malla
for each row execute function lv_malla_set_actualizado();
