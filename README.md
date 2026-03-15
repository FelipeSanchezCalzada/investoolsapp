# Investools

<img src="https://img.shields.io/badge/Nuxt_4-00DC82?logo=nuxtdotjs&logoColor=white" alt="Nuxt"> <img src="https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue"> <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript"> <img src="https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS"> <img src="https://img.shields.io/badge/shadcn--vue-000000?logo=shadcnui&logoColor=white" alt="shadcn-vue"> <img src="https://img.shields.io/badge/Pinia-FFD859?logo=pinia&logoColor=black" alt="Pinia"> <img src="https://img.shields.io/badge/Bun-000000?logo=bun&logoColor=white" alt="Bun"> <img src="https://img.shields.io/github/license/FelipeSanchezCalzada/investoolsapp" alt="License">

Free, open-source investment tools that run entirely in your browser. No backend, no sign-up, no data collection — your financial data never leaves your device.

**[Try it live at investools.app](https://investools.app/)**

<!-- TODO: Add screenshot -->
<!-- ![Investools Screenshot](docs/screenshot.png) -->

## Features

- **Portfolio Rebalancing** — enter your current holdings and target allocation, get the optimal transfers to rebalance
- **100% client-side** — all data stays in your browser (localStorage), no backend, no tracking
- **No account required** — just open and use
- **Responsive** — works on desktop and mobile

## Tech Stack

- **[Nuxt 4](https://nuxt.com/)** + **[Vue 3](https://vuejs.org/)** — framework & rendering
- **[TypeScript](https://www.typescriptlang.org/)** — type safety
- **[Tailwind CSS v4](https://tailwindcss.com/)** — utility-first styling
- **[shadcn-vue](https://www.shadcn-vue.com/)** — UI components (New York style)
- **[Lucide](https://lucide.dev/)** — icons
- **[Pinia](https://pinia.vuejs.org/)** + localStorage — state management
- **[Bun](https://bun.sh/)** — runtime & package manager

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)

### Installation

```bash
git clone https://github.com/FelipeSanchezCalzada/investoolsapp.git
cd investoolsapp
bun install
```

### Development

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

### Linting

```bash
bun run lint        # Check for issues
bun run lint:fix    # Auto-fix issues
```

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) — see the [LICENSE](LICENSE) file for details.

In short: you are free to use, modify, and distribute this software, but any modified version that is made available over a network must also be open-sourced under the same license.
