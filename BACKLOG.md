# Adminia — BACKLOG

## Fase 1: Foundation

### STORY-001: Scaffold del proyecto [P0]
- **Como** developer, **quiero** un proyecto React+TS+Tailwind configurado con Supabase client, **para** tener la base donde construir
- **Tasks:** Create React app con Vite+TS, instalar Tailwind, instalar @supabase/supabase-js, configurar estructura de carpetas, crear .env.example
- **Skill:** N/A
- **DoD:** `npm run dev` levanta sin errores, Tailwind funciona, Supabase client se inicializa
- **Dependencias:** Ninguna

### STORY-002: Esquema de base de datos [P0]
- **Como** developer, **quiero** todas las tablas creadas en Supabase con sus relaciones, **para** tener el modelo de datos listo
- **Tasks:** SQL migration con todas las tablas definidas en adminia_features.md, crear enums, crear indexes, configurar RLS básico
- **Skill:** N/A
- **DoD:** Todas las tablas existen en Supabase, relaciones FK funcionan, RLS permite operaciones básicas
- **Dependencias:** STORY-001

### STORY-003: Autenticación admin [P0]
- **Como** administradora, **quiero** hacer login con email y contraseña, **para** acceder al dashboard
- **Tasks:** Página de login, hook useAuth, protección de rutas admin, redirect post-login
- **Skill:** N/A
- **DoD:** Admin puede registrarse, hacer login y logout. Rutas /admin/* protegidas.
- **Dependencias:** STORY-001, STORY-002

### STORY-004: Seed data de prueba [P0]
- **Como** developer, **quiero** datos de prueba realistas, **para** desarrollar y testear sin datos reales
- **Tasks:** Script seed con: 1 organización, 3 edificios (4, 20, 47 deptos), departamentos con m² variados, 2 usuarios admin
- **Skill:** N/A
- **DoD:** Ejecutar seed carga datos coherentes. Los edificios tienen departamentos con m² realistas.
- **Dependencias:** STORY-002

---

## Fase 2: Core Admin

### STORY-005: Dashboard admin — lista de edificios [P0]
- **Como** administradora, **quiero** ver todos mis edificios con su status actual, **para** saber qué necesita atención
- **Tasks:** Página /admin, BuildingCard component, query a buildings + periodo actual, indicador de status del periodo
- **Skill:** N/A
- **DoD:** Dashboard muestra cards de edificios con nombre, # deptos, status del periodo actual
- **Dependencias:** STORY-003, STORY-004

### STORY-006: Configuración de edificio [P1]
- **Como** administradora, **quiero** ver y editar la configuración de un edificio, **para** mantener datos actualizados
- **Tasks:** Página /admin/buildings/:id/settings, formulario de datos del edificio, lista de departamentos con m², CRUD de departamentos
- **Skill:** N/A
- **DoD:** Admin puede editar nombre, dirección, cuenta bancaria del edificio. Puede agregar/editar/desactivar departamentos.
- **Dependencias:** STORY-005

### STORY-007: Wizard mensual — Paso 1: Lectura de agua [P0]
- **Como** administradora, **quiero** registrar la lectura actual del medidor de agua, **para** iniciar el ciclo mensual
- **Tasks:** Página /admin/buildings/:id/period, crear periodo si no existe, formulario lectura actual (anterior auto-fill), input de costo total de agua, validación
- **Skill:** N/A
- **DoD:** Admin puede crear periodo, ingresar lectura y costo de agua. Lectura anterior se muestra del periodo pasado.
- **Dependencias:** STORY-005

### STORY-008: Wizard mensual — Paso 2: Registro de gastos [P0]
- **Como** administradora, **quiero** registrar los gastos del mes, **para** incluirlos en el prorrateo
- **Tasks:** Lista editable de gastos (concepto + monto + categoría), agregar/editar/eliminar, subtotal visible
- **Skill:** N/A
- **DoD:** Admin puede agregar N gastos con concepto y monto. Total se calcula en tiempo real.
- **Dependencias:** STORY-007

### STORY-009: Wizard mensual — Paso 3: Prorrateo automático [P0]
- **Como** administradora, **quiero** ver el cálculo automático de cuánto debe cada departamento, **para** revisar antes de publicar
- **Tasks:** Lógica de prorrateo (agua por m² + gastos por m² + saldo anterior), tabla de resultados por depto, totales, validación de cuadre
- **Skill:** N/A
- **DoD:** Tabla muestra cada depto con desglose correcto. Suma de prorrateos = total de gastos + agua. Saldos anteriores incluidos.
- **Dependencias:** STORY-008

### STORY-010: Wizard mensual — Paso 4: Publicar [P0]
- **Como** administradora, **quiero** publicar los estados de cuenta, **para** que los condóminos puedan verlos
- **Tasks:** Botón publicar con confirmación, crear registros en statements, cambiar status del periodo a 'published', timestamp
- **Skill:** N/A
- **DoD:** Al publicar, se crean statements individuales por depto. Periodo queda como 'published'. Acción irreversible con confirmación.
- **Dependencias:** STORY-009

---

## Fase 3: Conciliación

### STORY-011: Importar extracto bancario [P0]
- **Como** administradora, **quiero** subir el extracto bancario en Excel, **para** iniciar la conciliación
- **Tasks:** FileUploader component, parser de Excel (SheetJS), mapeo de columnas (fecha, monto, referencia), preview de movimientos importados
- **Skill:** N/A
- **DoD:** Admin sube .xlsx, sistema muestra tabla de movimientos parseados. Manejo de error si el formato no es reconocido.
- **Dependencias:** STORY-010

### STORY-012: Match automático de pagos [P0]
- **Como** administradora, **quiero** que el sistema sugiera qué pagos corresponden a qué departamento, **para** no hacerlo manualmente
- **Tasks:** Algoritmo de match por monto exacto contra statements pendientes, UI de sugerencias (match único vs. ambiguo), estado visual por movimiento
- **Skill:** N/A
- **DoD:** Movimientos con match único aparecen como 'sugerido'. Ambiguos se marcan para decisión manual. Sin match quedan como 'sin asignar'.
- **Dependencias:** STORY-011

### STORY-013: Confirmar pagos y generar recibos [P0]
- **Como** administradora, **quiero** confirmar los matches y que se generen recibos automáticamente, **para** completar la conciliación
- **Tasks:** Botón confirmar por movimiento y confirmar todos, crear payment + receipt al confirmar, actualizar statement status, generar número de recibo correlativo
- **Skill:** N/A
- **DoD:** Al confirmar, statement pasa a 'paid', payment se crea, receipt con número correlativo se genera. Admin puede confirmar uno por uno o todos los sugeridos.
- **Dependencias:** STORY-012

### STORY-014: Vista de morosidad [P1]
- **Como** administradora, **quiero** ver qué departamentos tienen saldo pendiente, **para** dar seguimiento
- **Tasks:** Página /admin/buildings/:id/arrears, tabla de deptos con saldo > 0, filtro por periodo, indicador de meses consecutivos de deuda
- **Skill:** N/A
- **DoD:** Admin ve lista clara de morosos con monto y antigüedad. Filtrable por periodo.
- **Dependencias:** STORY-013

---

## Fase 4: Portal Condómino

### STORY-015: Autenticación condómino con magic link [P0]
- **Como** condómino, **quiero** acceder al portal ingresando solo mi email, **para** no manejar contraseñas
- **Tasks:** Página login condómino, flujo magic link con Supabase Auth, redirect a /portal, protección de rutas portal
- **Skill:** N/A
- **DoD:** Condómino ingresa email, recibe link, hace click, accede al portal. Link expira en 1 hora.
- **Dependencias:** STORY-002

### STORY-016: Portal — Estado de cuenta actual [P0]
- **Como** condómino, **quiero** ver cuánto debo este mes con el desglose, **para** saber qué pagar
- **Tasks:** Página /portal, query statement del periodo actual, desglose (agua, gastos, saldo anterior), StatusBadge (al día/pendiente), botón descargar recibo si pagó
- **Skill:** N/A
- **DoD:** Condómino ve su estado de cuenta del mes actual con desglose claro. Si pagó, puede descargar recibo.
- **Dependencias:** STORY-015, STORY-010

### STORY-017: Portal — Historial de pagos [P0]
- **Como** condómino, **quiero** ver mis pagos anteriores, **para** tener control de mi historial
- **Tasks:** Página /portal/history, lista de periodos con monto y status, click para ver detalle, descarga de recibo por periodo
- **Skill:** N/A
- **DoD:** Condómino ve lista de todos los periodos con status. Puede expandir cualquiera para ver detalle y descargar recibo.
- **Dependencias:** STORY-016

### STORY-018: Portal — Ingresos y egresos del edificio [P1]
- **Como** condómino, **quiero** ver en qué se gasta el dinero del edificio, **para** tener transparencia
- **Tasks:** Página /portal/building, resumen de ingresos (cuotas cobradas) y egresos (gastos) del periodo actual, sin datos individuales de otros condóminos
- **Skill:** N/A
- **DoD:** Condómino ve tabla resumen de ingresos y egresos totales del edificio. No ve información de otros departamentos.
- **Dependencias:** STORY-016

### STORY-019: Generación de recibo PDF [P1]
- **Como** condómino, **quiero** descargar mi recibo como PDF, **para** tener comprobante
- **Tasks:** Template de recibo con datos de Adminia, edificio, departamento, periodo, monto, número de recibo, fecha de pago. Render a PDF descargable.
- **Skill:** N/A
- **DoD:** Recibo se genera como PDF con todos los datos. Se ve profesional. Descargable desde el portal.
- **Dependencias:** STORY-013, STORY-016

---

## Fase 5: Polish & Launch

### STORY-020: Manejo de errores y edge cases [P1]
- **Como** developer, **quiero** que la app maneje errores gracefully, **para** que no se rompa en producción
- **Tasks:** Error boundaries, loading states, empty states, validación de formularios, manejo de errores de Supabase, manejo de Excel con formato inesperado
- **Skill:** N/A
- **DoD:** No hay pantallas rotas. Todos los estados tienen feedback visual. Errores muestran mensaje claro.
- **Dependencias:** Todas las stories anteriores

### STORY-021: Prueba con edificio real [P0]
- **Como** dueña de Adminia, **quiero** correr un ciclo mensual completo con un edificio real, **para** validar que funciona
- **Tasks:** Cargar datos reales de un edificio, ejecutar ciclo completo (lectura → gastos → prorrateo → publicar → conciliar → recibos), condóminos acceden al portal
- **Skill:** N/A
- **DoD:** Un ciclo mensual completo ejecutado con datos reales. La dueña confirma que los números cuadran. Al menos 3 condóminos accedieron al portal.
- **Dependencias:** STORY-020

### STORY-022: Deploy a producción con dominio [P0]
- **Como** dueña de Adminia, **quiero** que la plataforma esté en línea con su propio dominio, **para** compartirla con condóminos
- **Tasks:** Configurar dominio en Vercel, SSL, variables de producción en Supabase, verificar RLS en producción
- **Skill:** N/A
- **DoD:** Plataforma accesible en dominio propio, HTTPS, datos de producción aislados de desarrollo.
- **Dependencias:** STORY-021
