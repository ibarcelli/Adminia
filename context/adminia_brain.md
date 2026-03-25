# Adminia Brain

## Visión
Transformar Adminia de una operación manual basada en Excel/WhatsApp a una plataforma web profesional que automatice el ciclo financiero mensual de administración de edificios.

## Filosofía
- **Simplicidad radical:** Cada pantalla resuelve una sola cosa. No features que nadie pidió.
- **La dueña es la usuaria #1:** Si ella no puede completar el ciclo mensual en menos de 30 min por edificio, fallamos.
- **Cero fricción para condóminos:** Portal ultra simple, acceso sin contraseñas (magic link), solo consulta.
- **Costo mínimo viable:** Free tiers primero, escalar solo cuando sea necesario.

## El Problema
2 personas administran 11 edificios manualmente. El proceso mensual consume ~3 horas por edificio (~33 horas/mes). Esto limita el crecimiento y proyecta una imagen poco profesional.

## Mindset
- Esto no es un SaaS que se vende — es una herramienta interna que profesionaliza el servicio de Adminia
- Si en el futuro Adminia quiere venderlo a otras administradoras, la arquitectura lo permite, pero NO es el objetivo ahora
- El MVP debe cubrir el ciclo mensual completo. Un MVP que solo haga prorrateo pero no concilie no sirve — la dueña seguiría en Excel para la otra mitad

## Scope
- **IN:** Prorrateo de agua, registro de gastos, estados de cuenta, conciliación bancaria, recibos, portal de condóminos, visibilidad de morosidad
- **OUT:** Pago a proveedores, calendarización de servicios, notificaciones automáticas (post-MVP), reportes comparativos (post-MVP)
