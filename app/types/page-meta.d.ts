export interface BreadcrumbItem {
  label: string
  to?: string | { name: string }
}

declare module '#app' {
  interface PageMeta {
    breadcrumb?: BreadcrumbItem[]
  }
}

export {}
