# Adminia — Features & Data Model

## Modelo de Datos

### organization
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| name | text | "Adminia" |
| created_at | timestamp | |

### buildings
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| organization_id | uuid | FK → organization |
| name | text | Nombre del edificio |
| address | text | Dirección en Lima |
| total_units | int | Cantidad de departamentos |
| bank_account_type | enum | 'own' o 'adminia' |
| bank_account_name | text | Nombre del banco/cuenta |
| payment_deadline_day | int | Día límite de pago (1-28) |
| created_at | timestamp | |

### units (departamentos)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| building_id | uuid | FK → buildings |
| unit_number | text | "101", "PH-A", etc. |
| area_sqm | decimal | Metros cuadrados |
| owner_name | text | Nombre del propietario/residente |
| owner_email | text | Para magic link |
| owner_phone | text | Opcional |
| is_active | boolean | Default true |
| created_at | timestamp | |

### users
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK, Supabase Auth |
| email | text | |
| role | enum | 'admin' o 'condo' |
| organization_id | uuid | FK → organization (solo admin) |
| unit_id | uuid | FK → units (solo condo, nullable) |
| created_at | timestamp | |

### periods
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| building_id | uuid | FK → buildings |
| year | int | 2026 |
| month | int | 1-12 |
| water_reading_previous | decimal | Lectura anterior del medidor |
| water_reading_current | decimal | Lectura actual |
| water_total_cost | decimal | Costo total de agua del edificio |
| status | enum | 'draft', 'published', 'closed' |
| published_at | timestamp | Nullable |
| created_at | timestamp | |

### expenses (gastos del mes)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| period_id | uuid | FK → periods |
| concept | text | "Limpieza", "Seguridad", etc. |
| amount | decimal | Monto en soles |
| category | enum | 'fixed', 'variable', 'water' |
| created_at | timestamp | |

### statements (estados de cuenta por depto)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| period_id | uuid | FK → periods |
| unit_id | uuid | FK → units |
| water_charge | decimal | Prorrateo de agua |
| expenses_charge | decimal | Prorrateo de gastos |
| previous_balance | decimal | Saldo pendiente anterior |
| total_due | decimal | Total a pagar |
| status | enum | 'pending', 'paid', 'partial', 'overdue' |
| created_at | timestamp | |

### bank_imports (extractos importados)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| building_id | uuid | FK → buildings |
| period_id | uuid | FK → periods |
| file_name | text | Nombre del archivo original |
| imported_at | timestamp | |

### bank_transactions (movimientos parseados)
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| bank_import_id | uuid | FK → bank_imports |
| date | date | Fecha del movimiento |
| amount | decimal | Monto |
| reference | text | Referencia bancaria |
| description | text | Descripción del banco |
| matched_unit_id | uuid | FK → units, nullable |
| match_status | enum | 'unmatched', 'suggested', 'confirmed', 'rejected' |
| created_at | timestamp | |

### payments
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| statement_id | uuid | FK → statements |
| bank_transaction_id | uuid | FK → bank_transactions |
| amount | decimal | Monto pagado |
| payment_date | date | |
| confirmed_by | uuid | FK → users (admin) |
| confirmed_at | timestamp | |

### receipts
| Campo | Tipo | Nota |
|-------|------|------|
| id | uuid | PK |
| payment_id | uuid | FK → payments |
| receipt_number | text | Correlativo: "ADM-2026-001" |
| generated_at | timestamp | |

## Features por Pantalla

### 1. Login
- Admin: email + password
- Condómino: ingresa email → recibe magic link → accede

### 2. Dashboard Admin — Lista de Edificios
- Cards con: nombre edificio, # departamentos, status del periodo actual
- Indicador: periodo actual abierto/publicado/cerrado
- Botón: entrar al edificio

### 3. Edificio — Wizard Mensual
- **Paso 1:** Ingresar lectura de agua (anterior se auto-llena)
- **Paso 2:** Registrar gastos del mes (lista editable, agregar/quitar)
- **Paso 3:** Revisión automática: tabla con cada depto, su prorrateo de agua, prorrateo de gastos, saldo anterior, total
- **Paso 4:** Publicar estados de cuenta (quedan visibles para condóminos en el portal)

### 4. Edificio — Conciliación Bancaria
- Subir archivo Excel del extracto
- Sistema parsea y muestra movimientos
- Match automático por monto contra estados de cuenta pendientes
- Admin confirma o reasigna matches ambiguos
- Al confirmar: se crea el pago y se genera el recibo automáticamente

### 5. Edificio — Vista de Morosidad
- Tabla: departamentos con saldo pendiente
- Filtro por periodo
- Historial de morosidad por departamento

### 6. Portal Condómino — Estado de Cuenta
- Estado actual: cuánto debe, desglose (agua, gastos, saldo anterior)
- Indicador claro: "Al día" o "Saldo pendiente: S/ X"
- Botón descargar recibo (si ya pagó)

### 7. Portal Condómino — Historial
- Lista de periodos anteriores con monto y status
- Click en cualquier periodo para ver detalle

### 8. Portal Condómino — Ingresos y Egresos del Edificio
- Tabla resumen del periodo: todos los ingresos y egresos
- Sin datos personales de otros condóminos — solo totales

## Lógica de Prorrateo
```
consumo_total = lectura_actual - lectura_anterior
costo_agua_por_m2 = costo_total_agua / sum(m2_todos_deptos)
agua_depto = costo_agua_por_m2 * m2_depto

gastos_por_m2 = sum(gastos_mes) / sum(m2_todos_deptos)
gastos_depto = gastos_por_m2 * m2_depto

total_depto = agua_depto + gastos_depto + saldo_anterior
```

## Lógica de Conciliación
1. Parsear Excel del banco → extraer fecha, monto, referencia
2. Para cada movimiento, buscar statements pendientes con monto exacto igual
3. Si hay match único → status = 'suggested'
4. Si hay match múltiple (dos deptos deben lo mismo) → admin elige
5. Si no hay match → queda 'unmatched' para revisión manual
6. Admin confirma → se crea payment + receipt, statement pasa a 'paid'
