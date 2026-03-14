# InvestoolsApp — CLAUDE.md

Aplicación de herramientas de inversión (investment tools) construida con Nuxt 4 y Vue 3.

---

## Stack tecnológico

### Runtime y gestor de paquetes
- **Bun** — usar siempre `bun` en lugar de npm/pnpm/yarn
  - `bun install` — instalar dependencias
  - `bun run dev` — servidor de desarrollo
  - `bun run build` — build de producción
  - `bun run lint` / `bun run lint:fix` — linting

### Framework
- **Nuxt 4** (`nuxt ^4.3.1`) con **Vue 3** (`^3.5.29`)
- **TypeScript** (`^5.9.3`)
- **Vue Router** (`^4.6.4`) — enrutamiento automático vía Nuxt

### Estilos
- **Tailwind CSS v4** (`^4.2.1`) integrado via `@tailwindcss/vite`
  - Configuración en [tailwind.config.ts](tailwind.config.ts) (mínima, extender en `theme.extend`)
  - CSS principal en [app/assets/css/tailwind.css](app/assets/css/tailwind.css) — aquí están las variables de tema (OKLch)
- **tw-animate-css** (`^1.4.0`) — animaciones CSS adicionales
- **tailwind-merge** (`^3.5.0`) + **clsx** (`^2.1.1`) — fusión de clases vía `cn()` utility en [app/lib/utils.ts](app/lib/utils.ts)

### Sistema de diseño — shadcn-vue (New York style)
- **shadcn-nuxt** (`2.4.3`) — módulo Nuxt para shadcn
- **reka-ui** (`^2.8.2`) — primitivos de UI (base de shadcn-vue)
- Estilo: **New York**, color base: **neutral**, CSS variables activadas
- Iconos: **lucide-vue-next** (`^0.576.0`) — siempre usar esta librería para iconos
- Componentes UI en [app/components/ui/](app/components/ui/) — no modificar directamente, usar `npx shadcn-vue@latest add <component>`
- Configuración en [components.json](components.json)

### Estado y datos
- **Pinia** (`@pinia/nuxt 0.11.3`) — state management
- **useFrontDB** — store Pinia con persistencia en **localStorage** (no hay backend aún)
  - Esquema en [app/db/types/FrontDBv1.ts](app/db/types/FrontDBv1.ts)
  - Versión actual del schema: `CURRENT_DB_VERSION = 1`
  - Migraciones en [app/db/migrations.ts](app/db/migrations.ts)

### Utilidades
- **@vueuse/core** + **@vueuse/nuxt** (`^14.2.1`) — composables de Vue
- **@nuxtjs/color-mode** (`^4.0.0`) — modo oscuro/claro sin sufijo de clase (`classSuffix: ''`)

### Linting
- **ESLint** con `@nuxt/eslint` usando flat config (`eslint.config.mjs`)
- Estilo habilitado (`stylistic: true`)
- ESLint corre con runtime Bun en VSCode

---

## Estructura del proyecto

```
investoolsapp/
├── app/
│   ├── app.vue                  # Entry point de la app
│   ├── assets/css/tailwind.css  # Variables de tema y estilos base
│   ├── components/ui/           # Componentes shadcn (NO editar manualmente)
│   ├── db/                      # Base de datos frontend (localStorage)
│   │   ├── migrations.ts        # Migraciones de schema
│   │   ├── types.ts             # Tipos y versión actual
│   │   ├── types/FrontDBv1.ts   # Schema v1
│   │   └── useFrontDB.ts        # Pinia store con persistencia
│   ├── layouts/
│   │   ├── default.vue          # Layout principal: Header + Sidebar + Slot
│   │   └── default/components/  # Componentes del layout
│   │       ├── AppSidebar.vue
│   │       ├── NavMain.vue
│   │       ├── NavProjects.vue
│   │       ├── NavSecondary.vue
│   │       ├── NavUser.vue
│   │       ├── SearchForm.vue
│   │       ├── SiteHeader.vue
│   │       └── WorkspaceSwitcher.vue
│   ├── lib/utils.ts             # Función cn() para merge de clases Tailwind
│   ├── pages/                   # Rutas automáticas de Nuxt
│   │   ├── index.vue            # Dashboard (/)
│   │   └── tools/              # Directorio para herramientas (/tools/*)
│   └── plugins/
│       └── 01.ssr-width.ts      # Plugin para ancho SSR
├── components.json              # Configuración shadcn
├── nuxt.config.ts               # Configuración Nuxt
├── tailwind.config.ts           # Configuración Tailwind (extender aquí)
├── tsconfig.json                # Referencias a configs generadas por Nuxt
└── package.json
```

---

## Convenciones

### Aliases de importación
- `@/components` → componentes
- `@/components/ui` → componentes shadcn
- `@/lib` → utilidades
- `@/composables` → composables

### Clases Tailwind
Siempre usar la función `cn()` de [app/lib/utils.ts](app/lib/utils.ts) para combinar clases condicionales:
```ts
import { cn } from '@/lib/utils'
```

### Iconos
Importar siempre de `lucide-vue-next`:
```vue
import { Settings, User, ChevronDown } from 'lucide-vue-next'
```

### Modo oscuro
Las clases de modo oscuro usan el prefijo `dark:`. El color mode se gestiona con `@nuxtjs/color-mode` sin sufijo (`dark` en lugar de `dark-mode`).

### Nuevas páginas
Crear archivos en `app/pages/` — Nuxt genera las rutas automáticamente.

### Nuevas herramientas (tools)
Crear en `app/pages/tools/<nombre-herramienta>.vue` — accesibles en `/tools/<nombre>`.

### Nuevos componentes shadcn
```bash
bunx shadcn-vue@latest add <component-name>
```
Los componentes se instalan en `app/components/ui/`.

### Estado global
Usar Pinia stores. Si se necesita persistencia, modelar como `useFrontDB.ts` con localStorage.

---

## Módulos Nuxt configurados

| Módulo | Propósito |
|--------|-----------|
| `@nuxt/eslint` | Linting integrado |
| `shadcn-nuxt` | Componentes UI |
| `@vueuse/nuxt` | Auto-import de composables VueUse |
| `@nuxtjs/color-mode` | Dark/light mode |
| `@pinia/nuxt` | State management |

---

## Notas de desarrollo

- Los ítems de menú con prefijo `***` en [NavMain.vue](app/layouts/default/components/NavMain.vue) son placeholders pendientes de implementar.
- El directorio `app/pages/tools/` está vacío, listo para las herramientas de inversión.
- No hay backend — toda la persistencia es localStorage vía `useFrontDB`.
- `WorkspaceSwitcher` usa datos mock por ahora; conectar con `useFrontDB` cuando se implemente la gestión de workspaces.
