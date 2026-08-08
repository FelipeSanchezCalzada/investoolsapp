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
- **Nuxt 4** (`nuxt 4.4.2`) con **Vue 3** (`3.5.33`)
- **TypeScript** (`6.0.3`)
- **Vue Router** (`5.0.6`) — enrutamiento automático vía Nuxt

### Estilos
- **Tailwind CSS v4** (`4.2.4`) integrado via `@tailwindcss/vite`
  - Configuración en [tailwind.config.ts](tailwind.config.ts) (mínima, extender en `theme.extend`)
  - CSS principal en [app/assets/css/tailwind.css](app/assets/css/tailwind.css) — aquí están las variables de tema (OKLch)
- **tw-animate-css** (`1.4.0`) — animaciones CSS adicionales
- **tailwind-merge** (`3.5.0`) + **clsx** (`2.1.1`) — fusión de clases vía `cn()` utility en [app/lib/utils.ts](app/lib/utils.ts)

### Sistema de diseño — shadcn-vue (New York style)
- **shadcn-nuxt** (`2.6.2`) — módulo Nuxt para shadcn
- **reka-ui** (`2.9.6`) — primitivos de UI (base de shadcn-vue)
- Estilo: **New York**, color base: **neutral**, CSS variables activadas
- Iconos: **@lucide/vue** (`1.8.0`) — siempre usar esta librería para iconos (antes `lucide-vue-next`, renombrada en v1)
- Componentes UI en [app/components/ui/](app/components/ui/) — no modificar directamente, usar `npx shadcn-vue@latest add <component>`
- Configuración en [components.json](components.json)

### Estado y datos
- **Pinia** (`@pinia/nuxt 0.11.3`) — state management
- **useFrontDB** — store Pinia con persistencia en **IndexedDB** via `idb-keyval` + `useIDBKeyval` (no hay backend aún)
  - Esquema en [app/db/types/FrontDBv2.ts](app/db/types/FrontDBv2.ts)
  - Versión actual del schema: `CURRENT_DB_VERSION = 2`
  - Migraciones en [app/db/migrations.ts](app/db/migrations.ts)

### Utilidades
- **@vueuse/core** + **@vueuse/nuxt** (`14.2.1`) — composables de Vue
- **@nuxtjs/color-mode** (`4.0.0`) — modo oscuro/claro sin sufijo de clase (`classSuffix: ''`)

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
│   ├── db/                      # Base de datos frontend (IndexedDB)
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
├── i18n/locales/                # Ficheros de traducción (es.json, en.json)
├── components.json              # Configuración shadcn
├── nuxt.config.ts               # Configuración Nuxt
├── tailwind.config.ts           # Configuración Tailwind (extender aquí)
├── tsconfig.json                # Referencias a configs generadas por Nuxt
└── package.json
```

---

## Convenciones

### Idioma del código — SIEMPRE inglés
**TODO el código va en inglés, sin excepciones.** Aplica a:
- Nombres de variables, funciones, tipos, interfaces, props, eventos y constantes
- Nombres de ficheros y de directorios
- Claves de objetos y campos de la DB
- Comentarios y JSDoc
- Mensajes de commit

El **texto visible para el usuario** nunca se escribe en el código: va en los ficheros de traducción de `i18n/locales/` (ver [i18n](#i18n)). Solo va en español la documentación en `docs/`.

```ts
// ✅ Correcto
const monthlyPayment = computed(() => ...)
type MortgageBinding = { rateReductionPp: number }

// ❌ Incorrecto
const cuotaMensual = computed(() => ...)
type VinculacionHipoteca = { bonificacionPp: number }
```

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
Importar siempre de `@lucide/vue`:
```vue
import { Settings, User, ChevronDown } from '@lucide/vue'
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

### NumberField
No usar `NumberFieldDecrement` ni `NumberFieldIncrement` en los `NumberField`. Solo usar `NumberFieldInput` dentro de `NumberFieldContent`. Solo añadirlos si el usuario lo pide explícitamente.

### Estado global
Usar Pinia stores. Si se necesita persistencia, modelar como `useFrontDB.ts` con IndexedDB.

### i18n
Traducciones con **@nuxtjs/i18n**. Locales: `es` (por defecto) y `en`. Estrategia `no_prefix` (el idioma no va en la URL) con detección por navegador y persistencia en la cookie `i18n_locale`. El selector está en [LocaleSwitcher.vue](app/layouts/default/components/LocaleSwitcher.vue), dentro del header.

- Ficheros de traducción: `i18n/locales/es.json` y `i18n/locales/en.json`. **Ambos deben tener exactamente las mismas claves.**
- En templates: `$t('namespace.key')`, con parámetros `$t('key', { name })` y plurales `$t('key', { count }, count)`.
- En `<script setup>` y composables: `const { t, locale } = useI18n()`.
- Los `NumberField` y los `Intl.NumberFormat` reciben `locale` de `useI18n()`, nunca `'es-ES'` fijo.
- En módulos de `app/lib/` no se traduce: se devuelven **claves i18n** que resuelve el componente (`upfrontCostLabelKey()`, `bindingLabelKey()`, `MortgageWarning = { key, params }`). Los nombres que se persisten en la DB (escenarios, hipotecas de ejemplo) se traducen una sola vez al crearlos, pasando `t` a la factory (`Translate` en [templates.ts](app/lib/mortgage/templates.ts)).
- Las migas de pan de `definePageMeta` guardan `labelKey`, no el texto.

---

## Módulos Nuxt configurados

| Módulo | Propósito |
|--------|-----------|
| `@nuxt/eslint` | Linting integrado |
| `shadcn-nuxt` | Componentes UI |
| `@vueuse/nuxt` | Auto-import de composables VueUse |
| `@nuxtjs/color-mode` | Dark/light mode |
| `@pinia/nuxt` | State management |
| `@nuxtjs/i18n` | Traducciones (es / en) |

---

## Notas de desarrollo

- Los ítems de menú con prefijo `***` en [NavMain.vue](app/layouts/default/components/NavMain.vue) son placeholders pendientes de implementar.
- El directorio `app/pages/tools/` está vacío, listo para las herramientas de inversión.
- No hay backend — toda la persistencia es IndexedDB vía `useFrontDB`.
- `WorkspaceSwitcher` usa datos mock por ahora; conectar con `useFrontDB` cuando se implemente la gestión de workspaces.
