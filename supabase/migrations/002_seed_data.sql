-- ============================================================
-- Adminia — Seed Data
-- STORY-004: Datos de prueba
-- ============================================================
-- Ejecutar DESPUÉS de 001_initial_schema.sql y seed_admin.sql
-- Idempotente: usa ON CONFLICT DO NOTHING donde es posible

-- ========================
-- ORGANIZACIÓN
-- ========================

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Adminia')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- EDIFICIOS
-- ========================

INSERT INTO buildings (id, organization_id, name, address, total_units, bank_account_type, bank_account_name, payment_deadline_day)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Residencial Los Olivos', 'Av. Universitaria 1234, Los Olivos, Lima', 6, 'own', 'BCP Cta. Corriente 191-123456-0-01', 15),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Torre Miraflores', 'Calle Schell 456, Miraflores, Lima', 20, 'adminia', 'Cuenta Adminia - Interbank', 20),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Condominio San Borja', 'Av. San Borja Norte 789, San Borja, Lima', 47, 'own', 'BBVA Cta. Corriente 0011-0234-56789', 10)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- DEPARTAMENTOS — Residencial Los Olivos (6 deptos)
-- Total m²: 55 + 72 + 85 + 65 + 120 + 90 = 487
-- ========================

INSERT INTO units (id, building_id, unit_number, area_sqm, owner_name, owner_email, owner_phone, is_active)
VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '101', 55.00, 'María García Flores', 'maria.garcia@email.com', '987654321', true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '102', 72.00, 'Carlos Rodríguez Huamán', 'carlos.rodriguez@email.com', '987654322', true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '201', 85.00, 'Ana Quispe Mendoza', 'ana.quispe@email.com', '987654323', true),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '202', 65.00, 'Jorge Flores Castillo', 'jorge.flores@email.com', NULL, true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '301', 120.00, 'Rosa Huamán Torres', 'rosa.huaman@email.com', '987654325', true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '302', 90.00, 'Luis Mendoza Vargas', 'luis.mendoza@email.com', '987654326', true)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- DEPARTAMENTOS — Torre Miraflores (20 deptos)
-- Pisos 1-10, 2 deptos por piso (A y B)
-- ========================

INSERT INTO units (id, building_id, unit_number, area_sqm, owner_name, owner_email, owner_phone, is_active)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', '101', 65.00, 'Pedro Castillo López', 'pedro.castillo@email.com', '976543210', true),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '102', 58.00, 'Sofía Vargas Ramos', 'sofia.vargas@email.com', '976543211', true),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', '201', 70.00, 'Miguel Torres Silva', 'miguel.torres@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', '202', 52.00, 'Carmen López Díaz', 'carmen.lopez@email.com', '976543213', true),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '301', 75.00, 'Fernando Ramos Cruz', 'fernando.ramos@email.com', '976543214', true),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', '302', 48.00, 'Elena Silva Morales', 'elena.silva@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', '401', 80.00, 'Ricardo Díaz Paredes', 'ricardo.diaz@email.com', '976543216', true),
  ('30000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000002', '402', 55.00, 'Patricia Cruz Salazar', 'patricia.cruz@email.com', '976543217', true),
  ('30000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', '501', 85.00, 'Alberto Morales Vega', 'alberto.morales@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000002', '502', 60.00, 'Isabel Paredes Luna', 'isabel.paredes@email.com', '976543219', true),
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000002', '601', 90.00, 'Javier Salazar Ruiz', 'javier.salazar@email.com', '976543220', true),
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000002', '602', 45.00, 'Daniela Vega Ortiz', 'daniela.vega@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000002', '701', 78.00, 'Raúl Luna Campos', 'raul.luna@email.com', '976543222', true),
  ('30000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000002', '702', 62.00, 'Lucía Ruiz Herrera', 'lucia.ruiz@email.com', '976543223', true),
  ('30000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000002', '801', 95.00, 'Andrés Ortiz Chávez', 'andres.ortiz@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000002', '802', 50.00, 'Valentina Campos Ríos', 'valentina.campos@email.com', '976543225', true),
  ('30000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000002', '901', 72.00, 'Héctor Herrera Soto', 'hector.herrera@email.com', '976543226', true),
  ('30000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000002', '902', 68.00, 'Gabriela Chávez Peña', 'gabriela.chavez@email.com', NULL, true),
  ('30000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000002', '1001', 88.00, 'Martín Ríos Aguilar', 'martin.rios@email.com', '976543228', true),
  ('30000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000002', '1002', 56.00, 'Camila Soto Delgado', 'camila.soto@email.com', '976543229', true)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- DEPARTAMENTOS — Condominio San Borja (47 deptos)
-- Pisos 1-12, 4 deptos por piso (101-104, 201-204, etc.)
-- Piso 12 tiene solo 3 deptos (penthouse más grandes)
-- ========================

INSERT INTO units (id, building_id, unit_number, area_sqm, owner_name, owner_email, owner_phone, is_active)
VALUES
  -- Piso 1
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '101', 75.00, 'Roberto Aguilar Romero', 'roberto.aguilar@email.com', '965432100', true),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', '102', 68.00, 'Sandra Delgado Ponce', 'sandra.delgado@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '103', 82.00, 'Enrique Romero Mejía', 'enrique.romero@email.com', '965432102', true),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000003', '104', 60.00, 'Teresa Ponce Gutiérrez', 'teresa.ponce@email.com', '965432103', true),
  -- Piso 2
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', '201', 78.00, 'Oscar Mejía Navarro', 'oscar.mejia@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', '202', 65.00, 'Marta Gutiérrez Rojas', 'marta.gutierrez@email.com', '965432105', true),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', '203', 85.00, 'Sergio Navarro Espinoza', 'sergio.navarro@email.com', '965432106', true),
  ('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', '204', 62.00, 'Claudia Rojas Medina', 'claudia.rojas@email.com', NULL, true),
  -- Piso 3
  ('40000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', '301', 80.00, 'Alejandro Espinoza Sánchez', 'alejandro.espinoza@email.com', '965432108', true),
  ('40000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', '302', 70.00, 'Natalia Medina Castro', 'natalia.medina@email.com', '965432109', true),
  ('40000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000003', '303', 88.00, 'Guillermo Sánchez Reyes', 'guillermo.sanchez@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000003', '304', 64.00, 'Adriana Castro Córdova', 'adriana.castro@email.com', '965432111', true),
  -- Piso 4
  ('40000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000003', '401', 76.00, 'Diego Reyes Tapia', 'diego.reyes@email.com', '965432112', true),
  ('40000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000003', '402', 72.00, 'Verónica Córdova Lozano', 'veronica.cordova@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000003', '403', 90.00, 'Pablo Tapia Miranda', 'pablo.tapia@email.com', '965432114', true),
  ('40000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000003', '404', 66.00, 'Lorena Lozano Bustamante', 'lorena.lozano@email.com', '965432115', true),
  -- Piso 5
  ('40000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000003', '501', 82.00, 'Gustavo Miranda Cáceres', 'gustavo.miranda@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000003', '502', 68.00, 'Carolina Bustamante Zavala', 'carolina.bustamante@email.com', '965432117', true),
  ('40000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000003', '503', 86.00, 'Mauricio Cáceres Villanueva', 'mauricio.caceres@email.com', '965432118', true),
  ('40000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000003', '504', 60.00, 'Silvia Zavala Contreras', 'silvia.zavala@email.com', NULL, true),
  -- Piso 6
  ('40000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000003', '601', 78.00, 'Eduardo Villanueva Paz', 'eduardo.villanueva@email.com', '965432120', true),
  ('40000000-0000-0000-0000-000000000022', '10000000-0000-0000-0000-000000000003', '602', 74.00, 'Pamela Contreras Aliaga', 'pamela.contreras@email.com', '965432121', true),
  ('40000000-0000-0000-0000-000000000023', '10000000-0000-0000-0000-000000000003', '603', 92.00, 'César Paz Huamaní', 'cesar.paz@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000024', '10000000-0000-0000-0000-000000000003', '604', 63.00, 'Roxana Aliaga Tello', 'roxana.aliaga@email.com', '965432123', true),
  -- Piso 7
  ('40000000-0000-0000-0000-000000000025', '10000000-0000-0000-0000-000000000003', '701', 80.00, 'Víctor Huamaní Ochoa', 'victor.huamani@email.com', '965432124', true),
  ('40000000-0000-0000-0000-000000000026', '10000000-0000-0000-0000-000000000003', '702', 70.00, 'Beatriz Tello Figueroa', 'beatriz.tello@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000027', '10000000-0000-0000-0000-000000000003', '703', 88.00, 'Julio Ochoa Valdivia', 'julio.ochoa@email.com', '965432126', true),
  ('40000000-0000-0000-0000-000000000028', '10000000-0000-0000-0000-000000000003', '704', 66.00, 'Liliana Figueroa Arce', 'liliana.figueroa@email.com', '965432127', true),
  -- Piso 8
  ('40000000-0000-0000-0000-000000000029', '10000000-0000-0000-0000-000000000003', '801', 84.00, 'Arturo Valdivia Rivas', 'arturo.valdivia@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000030', '10000000-0000-0000-0000-000000000003', '802', 72.00, 'Mariela Arce Quintana', 'mariela.arce@email.com', '965432129', true),
  ('40000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', '803', 90.00, 'Rubén Rivas Pariona', 'ruben.rivas@email.com', '965432130', true),
  ('40000000-0000-0000-0000-000000000032', '10000000-0000-0000-0000-000000000003', '804', 64.00, 'Yolanda Quintana Espejo', 'yolanda.quintana@email.com', NULL, true),
  -- Piso 9
  ('40000000-0000-0000-0000-000000000033', '10000000-0000-0000-0000-000000000003', '901', 82.00, 'Raúl Pariona Cárdenas', 'raul.pariona@email.com', '965432132', true),
  ('40000000-0000-0000-0000-000000000034', '10000000-0000-0000-0000-000000000003', '902', 70.00, 'Pilar Espejo Gallegos', 'pilar.espejo@email.com', '965432133', true),
  ('40000000-0000-0000-0000-000000000035', '10000000-0000-0000-0000-000000000003', '903', 86.00, 'Félix Cárdenas Montalvo', 'felix.cardenas@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000036', '10000000-0000-0000-0000-000000000003', '904', 62.00, 'Gloria Gallegos Huanca', 'gloria.gallegos@email.com', '965432135', true),
  -- Piso 10
  ('40000000-0000-0000-0000-000000000037', '10000000-0000-0000-0000-000000000003', '1001', 85.00, 'Ernesto Montalvo Arias', 'ernesto.montalvo@email.com', '965432136', true),
  ('40000000-0000-0000-0000-000000000038', '10000000-0000-0000-0000-000000000003', '1002', 74.00, 'Olga Huanca Vera', 'olga.huanca@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000039', '10000000-0000-0000-0000-000000000003', '1003', 92.00, 'Hugo Arias Benítez', 'hugo.arias@email.com', '965432138', true),
  ('40000000-0000-0000-0000-000000000040', '10000000-0000-0000-0000-000000000003', '1004', 66.00, 'Irma Vera Salcedo', 'irma.vera@email.com', '965432139', true),
  -- Piso 11
  ('40000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000003', '1101', 88.00, 'Manuel Benítez Ccama', 'manuel.benitez@email.com', NULL, true),
  ('40000000-0000-0000-0000-000000000042', '10000000-0000-0000-0000-000000000003', '1102', 76.00, 'Julia Salcedo Mamani', 'julia.salcedo@email.com', '965432141', true),
  ('40000000-0000-0000-0000-000000000043', '10000000-0000-0000-0000-000000000003', '1103', 94.00, 'Alfredo Ccama Palomino', 'alfredo.ccama@email.com', '965432142', true),
  ('40000000-0000-0000-0000-000000000044', '10000000-0000-0000-0000-000000000003', '1104', 68.00, 'Susana Mamani Ticona', 'susana.mamani@email.com', NULL, true),
  -- Piso 12 (Penthouses — 3 deptos más grandes)
  ('40000000-0000-0000-0000-000000000045', '10000000-0000-0000-0000-000000000003', '1201', 130.00, 'Francisco Palomino Aquino', 'francisco.palomino@email.com', '965432144', true),
  ('40000000-0000-0000-0000-000000000046', '10000000-0000-0000-0000-000000000003', '1202', 140.00, 'Graciela Ticona Huarachi', 'graciela.ticona@email.com', '965432145', true),
  ('40000000-0000-0000-0000-000000000047', '10000000-0000-0000-0000-000000000003', '1203', 150.00, 'Hernán Aquino Choquehuanca', 'hernan.aquino@email.com', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- PERIODOS — Residencial Los Olivos
-- ========================

INSERT INTO periods (id, building_id, year, month, water_reading_previous, water_reading_current, water_total_cost, status, published_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2026, 1, 1000, 1150, 450.00, 'closed', '2026-01-20T10:00:00Z'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 2026, 2, 1150, 0, 0.00, 'draft', NULL)
ON CONFLICT (building_id, year, month) DO NOTHING;

-- ========================
-- GASTOS — Enero 2026, Los Olivos
-- ========================

INSERT INTO expenses (id, period_id, concept, amount, category)
VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Limpieza', 800.00, 'fixed'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Seguridad', 1200.00, 'fixed'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Mantenimiento ascensor', 350.00, 'fixed'),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', 'Luz áreas comunes', 280.00, 'variable'),
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 'Agua', 450.00, 'water')
ON CONFLICT (id) DO NOTHING;

-- ========================
-- STATEMENTS — Enero 2026, Los Olivos
-- ========================
-- Prorrateo por m²:
--   Total m² = 55 + 72 + 85 + 65 + 120 + 90 = 487
--   Agua total = S/ 450.00 → costo/m² = 450/487 = 0.923817...
--   Gastos (fixed+variable) = 800 + 1200 + 350 + 280 = S/ 2,630.00 → costo/m² = 2630/487 = 5.400411...
--
-- Depto 101 (55m²):  agua = 50.81, gastos = 297.02, total = 347.83
-- Depto 102 (72m²):  agua = 66.52, gastos = 388.83, total = 455.35
-- Depto 201 (85m²):  agua = 78.52, gastos = 459.03, total = 537.55
-- Depto 202 (65m²):  agua = 60.04, gastos = 351.03, total = 411.07
-- Depto 301 (120m²): agua = 110.86, gastos = 648.05, total = 758.91
-- Depto 302 (90m²):  agua = 83.14, gastos = 486.04, total = 569.18
-- Verificación: 347.83+455.35+537.55+411.07+758.91+569.18 = 3079.89 ≈ 3080 (450+2630)

INSERT INTO statements (id, period_id, unit_id, water_charge, expenses_charge, previous_balance, total_due, status)
VALUES
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 50.81, 297.02, 0, 347.83, 'paid'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 66.52, 388.83, 0, 455.35, 'paid'),
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 78.52, 459.03, 0, 537.55, 'paid'),
  ('70000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 60.04, 351.03, 0, 411.07, 'pending'),
  ('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 110.86, 648.05, 0, 758.91, 'paid'),
  ('70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 83.14, 486.04, 0, 569.18, 'pending')
ON CONFLICT (period_id, unit_id) DO NOTHING;
