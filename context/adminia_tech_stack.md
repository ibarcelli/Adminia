# Adminia — Tech Stack

## Frontend
- **Framework:** React 18+ con TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State management:** React Context + hooks (no Redux — la app no es tan compleja)
- **Tablas/Data:** TanStack Table (para tablas de departamentos, gastos, conciliación)
- **PDF generation:** @react-pdf/renderer o html2pdf.js (para recibos descargables)
- **Excel parsing:** SheetJS (xlsx) para importar extractos bancarios
- **Hosting:** Vercel (free tier → Pro cuando escale)

## Backend
- **Plataforma:** Supabase
  - **Base de datos:** PostgreSQL
  - **Autenticación:** Supabase Auth (email/password para admin, magic link para condóminos)
  - **API:** Auto-generated REST API + Row Level Security (RLS)
  - **Storage:** Supabase Storage (para extractos bancarios importados, si se necesita guardar)
- **Tier:** Free (50,000 filas, 500MB, 50,000 MAUs) → Pro ($25/mes) cuando escale

## Deploy
- **CI/CD:** Vercel auto-deploy desde GitHub main branch
- **Dominio:** Por configurar (Ives)
- **SSL:** Incluido con Vercel

## Herramientas de Desarrollo
- **Repo:** GitHub
- **IDE:** VS Code + Claude Code (Faber)
- **Package manager:** npm

## Estimación de Costos
| Servicio | Fase inicial | Escalado |
|----------|-------------|----------|
| Vercel | $0 (free) | $20/mes |
| Supabase | $0 (free) | $25/mes |
| Dominio | ~$12/año | $12/año |
| **Total** | **~$1/mes** | **~$46/mes** |

## Decisiones Técnicas Clave
- Monolito simple, no microservicios (DEC-007)
- Web responsive, no app nativa (DEC-008)
- Importación de Excel para conciliación, no integración bancaria directa (DEC-003)
- Row Level Security en Supabase para aislar datos entre edificios y entre condóminos
