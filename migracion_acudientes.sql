-- Tabla para la base de datos compartida de acudientes.
-- Mismo patrón genérico "id + datos jsonb" usado en lv_malla,
-- lv_docentes, lv_asignaciones, etc.

create table if not exists lv_acudientes (
  id text primary key,
  datos jsonb not null,
  actualizado_en timestamptz not null default now()
);

create or replace function lv_acudientes_set_actualizado()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lv_acudientes_actualizado on lv_acudientes;
create trigger trg_lv_acudientes_actualizado
before update on lv_acudientes
for each row execute function lv_acudientes_set_actualizado();
