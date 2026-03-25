# Adminia — Decisions

Decisiones canónicas del proyecto. No se reabren sin aprobación del Human Lead.

## DEC-001: Alcance del MVP
- **Decisión:** El MVP cubre el módulo financiero completo: prorrateo de agua, gastos, estados de cuenta, conciliación bancaria, recibos y portal de condóminos.
- **Excluido:** Pago a proveedores, calendarización de servicios, notificaciones automáticas.
- **Razón:** El ciclo mensual debe resolverse completo para eliminar Excel. Un MVP parcial no sirve.

## DEC-002: Stack tecnológico
- **Decisión:** React + Tailwind (frontend), Supabase (backend/DB/auth), Vercel (hosting).
- **Razón:** Costo $0 en fase inicial con free tiers. Stack moderno que Kira/Faber manejan eficientemente. Escala natural a $25-50/mes cuando sea necesario.

## DEC-003: No integración bancaria directa
- **Decisión:** La conciliación se hace importando el extracto bancario en Excel (.xlsx). No se integra directamente con APIs bancarias.
- **Razón:** Las APIs bancarias peruanas son complejas, costosas y reguladas. Importar Excel es pragmático y cubre el 100% del caso de uso.

## DEC-004: Autenticación de condóminos con magic link
- **Decisión:** Los condóminos acceden al portal via magic link por email. Sin contraseñas.
- **Razón:** Minimiza fricción y soporte. Los condóminos no son usuarios power — solo consultan.

## DEC-005: Autenticación de admin con email/contraseña
- **Decisión:** Los administradores (la dueña + el otro admin) usan autenticación estándar con email y contraseña via Supabase Auth.
- **Razón:** Son 2 usuarios, acceden frecuentemente, justifica un login tradicional.

## DEC-006: Morosidad privada en portal
- **Decisión:** La morosidad en el portal web es visible SOLO para el condómino afectado y para la administradora. No hay lista pública de morosos en el portal.
- **Razón:** La publicación en recepción del edificio sigue siendo física (fuera del sistema). Publicar nombres en internet tiene implicaciones legales y de privacidad.

## DEC-007: Monolito simple
- **Decisión:** Arquitectura monolítica. Un solo proyecto React con Supabase como backend. No microservicios.
- **Razón:** 11 edificios, ~300 departamentos máximo, 2 admins. No justifica complejidad arquitectónica.

## DEC-008: Portal web responsive, no app nativa
- **Decisión:** Todo es web. No hay app móvil nativa.
- **Razón:** Los condóminos consultan ocasionalmente. Una web responsive cubre el caso de uso sin el costo de mantener apps nativas.

## DEC-009: Gastos fijos variables por mes
- **Decisión:** Los gastos fijos NO son una plantilla fija — la dueña los registra manualmente cada mes porque varían.
- **Razón:** La realidad operativa de Adminia es que los gastos cambian mes a mes.

## DEC-010: Una cuenta bancaria configurable por edificio
- **Decisión:** Cada edificio tiene configurado si usa su propia cuenta bancaria o la cuenta de Adminia. Esto es un campo de configuración del edificio.
- **Razón:** La realidad actual de Adminia es mixta — algunos edificios tienen cuenta propia, otros no.
