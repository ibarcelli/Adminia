# Adminia — Pipeline

## Tipo de Proyecto
Producto SaaS vertical / herramienta interna web

## Fases

### Fase 1: Foundation (Infraestructura base)
- **Status:** COMPLETADO (STORY-001 a STORY-004)
- **Objetivo:** Repo, proyecto Supabase, proyecto Vercel, esquema de base de datos, autenticación funcionando
- **DoD:** Admin puede hacer login. Supabase tiene todas las tablas creadas. Deploy automático en Vercel funciona.

### Fase 2: Core Admin (Ciclo mensual del admin)
- **Status:** EN PROGRESO (STORY-005 a STORY-010 completadas — wizard mensual completo)
- **Objetivo:** Dashboard admin con el flujo completo: edificios, departamentos, lectura de agua, gastos, prorrateo automático, estados de cuenta
- **DoD:** La dueña puede completar el ciclo de prorrateo para un edificio desde el dashboard. Estados de cuenta se generan automáticamente.

### Fase 3: Conciliación (Pagos y recibos)
- **Status:** PENDIENTE
- **Objetivo:** Importación de extracto bancario, matching semi-automático, generación de recibos, visibilidad de morosidad
- **DoD:** La dueña puede importar un extracto, confirmar matches, y los condóminos que pagaron tienen recibo generado. Los morosos aparecen marcados.

### Fase 4: Portal Condómino
- **Status:** PENDIENTE
- **Objetivo:** Portal web para condóminos con magic link, estado de cuenta, historial, desglose, descarga de recibo
- **DoD:** Un condómino puede acceder via magic link, ver su estado de cuenta actual, revisar historial y descargar su recibo en PDF.

### Fase 5: Polish & Launch
- **Status:** PENDIENTE
- **Objetivo:** UI pulida, manejo de errores, edge cases, prueba con un edificio real, ajustes
- **DoD:** La dueña ha completado un ciclo mensual completo con un edificio real usando la plataforma. Condóminos de ese edificio acceden al portal sin problemas.

## Fases Futuras (fuera del MVP)
- Notificaciones automáticas (email/WhatsApp)
- Reportes comparativos entre meses
- Onboarding de edificios nuevos desde la plataforma
- Módulo de pago a proveedores
- Calendarización de servicios
