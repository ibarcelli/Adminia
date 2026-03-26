# Adminia — STATUS

## Estado Actual
- **Fase:** 4 — Portal Condómino COMPLETADA
- **Última actualización:** 2026-03-26
- **Historia actual:** STORY-006b + STORY-008b completadas

## Resumen
- Ejecución: EN PROGRESO — Fases 1-4 completadas

## Fases Completadas
- **Fase 1:** Foundation (STORY-001 a 004) — scaffold, DB, auth, seed
- **Fase 2:** Core Admin (STORY-005 a 010) — dashboard, wizard mensual completo
- **Fase 3:** Conciliación (STORY-011 a 014) — import BCP, match, pagos, recibos, morosidad
- **Fase 4:** Portal Condómino (STORY-015 a 018) — auth magic link, estado de cuenta, historial, edificio

## Últimas Ejecuciones
- **STORY-015:** Autenticación condómino con magic link — COMPLETADO
  - LoginPage dual: tabs Admin (email+password) / Condómino (magic link)
  - signInWithOtp para magic link, redirect según role
  - Trigger SQL: auto-crea profile al primer login si email coincide con unit
  - PortalLayout: header + tabs (Estado de cuenta, Historial, Edificio)
  - Rutas /portal/* protegidas con ProtectedRoute role='condo'
- **STORY-016:** Estado de cuenta actual — COMPLETADO
  - useCondoData hook: unit, building, current statement del periodo publicado
  - Indicador grande: "Al día" (verde) o "Saldo pendiente: S/ X" (rojo)
  - Desglose: agua, gastos, saldo anterior, total
  - Placeholder descargar recibo (STORY-019)
- **STORY-017:** Historial de pagos — COMPLETADO
  - Lista de periodos con monto y status badge
  - Filas expandibles: desglose + número de recibo
  - Ordenado del más reciente al más antiguo
- **STORY-018:** Ingresos y egresos del edificio — COMPLETADO
  - Selector de periodo, sección ingresos (cobrados/pendientes)
  - Sección egresos (lista de gastos), balance
  - Sin datos individuales de otros condóminos

## Últimas Ejecuciones (cont.)
- **STORY-006:** Configuración de edificio — COMPLETADO
  - useBuilding hook: crear/editar edificio con todos los campos
  - useUnits hook: CRUD de departamentos con toggle activo/inactivo
  - BuildingSettings: formulario dual (datos edificio + tabla departamentos)
  - Departamentos editables inline (doble click), toggle activo con switch
  - total_units se actualiza automáticamente
  - Botón "+ Nuevo edificio" en dashboard → /admin/buildings/new/settings
  - Ruta /admin/buildings/new/settings para creación
  - Tipo de medidor de agua configurable (general/individual)

- **STORY-006b:** Eliminar edificios + navegación — COMPLETADO
  - Breadcrumbs en todas las páginas de edificio (BuildingView, PeriodWizard, ReconcilePage, ArrearsPage, BuildingSettings)
  - "Adminia" en sidebar ya era clickeable (navega a /admin)
  - Eliminar edificio con confirmación por nombre + modal
  - deleteBuilding en useBuilding hook, ON DELETE CASCADE en DB
- **STORY-008b:** Importar gastos desde extracto — COMPLETADO
  - useExpenseImport hook: parsea egresos del BCP, preview con checkboxes
  - Modal de importación en paso 2 del wizard
  - Admin puede desmarcar, editar concepto y categoría antes de importar
  - Gastos importados se suman a los manuales existentes

## Próxima Acción
- Fase 5: Polish & Launch
  - STORY-019: Generación de recibo PDF
  - STORY-020: Manejo de errores y edge cases
  - STORY-021: Prueba con edificio real
  - STORY-022: Deploy a producción con dominio

## Blockers
- Pendiente: Ives ejecuta todas las migrations (001-006) en Supabase para testing real
