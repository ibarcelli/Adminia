# Adminia — Security

## Datos Sensibles
- Nombres de propietarios/residentes
- Emails de condóminos
- Montos de deudas individuales
- Extractos bancarios importados
- Datos de pagos

## Row Level Security (RLS) en Supabase
- **Admins:** Acceso total a edificios de su organización
- **Condóminos:** Solo ven datos de su propio departamento + datos públicos del edificio (ingresos/egresos totales)
- **Morosidad:** Solo visible para el condómino afectado y para admins. NUNCA para otros condóminos.

## Políticas de Acceso
| Tabla | Admin | Condómino |
|-------|-------|-----------|
| buildings | CRUD (su org) | READ (su edificio, solo nombre/dirección) |
| units | CRUD (su edificio) | READ (solo su unidad) |
| periods | CRUD | READ (solo publicados) |
| expenses | CRUD | READ (solo de periodos publicados) |
| statements | READ ALL (su edificio) | READ (solo su unidad) |
| payments | CRUD | READ (solo su unidad) |
| receipts | READ ALL | READ (solo su unidad) |
| bank_imports | CRUD | NO ACCESS |
| bank_transactions | CRUD | NO ACCESS |

## Variables de Entorno (.env)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Reglas
- NUNCA exponer Supabase service_role key en el frontend
- Todos los accesos van via anon key + RLS
- Los extractos bancarios importados NO se guardan permanentemente — se procesan y se descartan (o se guardan en storage privado)
- Magic links expiran en 1 hora
- No se almacenan contraseñas de bancos ni credenciales financieras
