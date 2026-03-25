# Adminia — UI Architecture

## Estructura de Rutas

```
/login                          → Login (admin email/pwd, condómino magic link)
/admin                          → Dashboard admin (lista de edificios)
/admin/buildings/:id            → Vista del edificio
/admin/buildings/:id/period     → Wizard mensual (prorrateo)
/admin/buildings/:id/reconcile  → Conciliación bancaria
/admin/buildings/:id/arrears    → Vista de morosidad
/admin/buildings/:id/settings   → Config del edificio (cuenta bancaria, deptos)
/portal                         → Portal condómino (estado de cuenta actual)
/portal/history                 → Historial de pagos
/portal/building                → Ingresos/egresos del edificio
```

## Layout
- **Admin:** Sidebar con navegación entre edificios + área de contenido principal
- **Portal condómino:** Header simple con nombre del edificio + tabs (Estado actual, Historial, Edificio)
- **Responsive:** Mobile-first. El admin trabaja en desktop pero debe funcionar en tablet. El condómino accede principalmente desde celular.

## Componentes Reutilizables
- `BuildingCard` — Card resumen de edificio en dashboard
- `DataTable` — Tabla genérica con sorting (TanStack Table)
- `ExpenseForm` — Formulario para agregar/editar gastos
- `StatementRow` — Fila de estado de cuenta con desglose
- `StatusBadge` — Indicador visual: al día / pendiente / moroso
- `WizardStepper` — Navegación del wizard mensual
- `FileUploader` — Para extractos bancarios
- `ReceiptPDF` — Template del recibo generado
- `MoneyDisplay` — Formato de moneda (S/ con 2 decimales)

## Paleta de Colores (provisional)
- Se definirá en fase Motive si se ejecuta
- Por ahora: Tailwind defaults con accent profesional (slate/blue)
- Status: verde (al día), amarillo (pendiente), rojo (moroso)

## Principios de UI
1. Todo texto dentro de bounds — textGrowth fixed-width con fill_container
2. Números siempre alineados a la derecha
3. Montos en formato peruano: S/ 1,234.56
4. Fechas en formato local: 25/03/2026
5. Wizard mensual: progreso visible, no poder avanzar sin completar paso anterior
6. Confirmaciones antes de acciones destructivas (publicar, confirmar pagos)
7. Empty states informativos: "No hay gastos registrados este mes. Agrega el primero."
