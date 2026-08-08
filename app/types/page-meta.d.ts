export interface BreadcrumbItem {
  /** i18n key resolved at render time so the trail follows the active locale. */
  labelKey: string
  to?: string | { name: string }
}

declare module '#app' {
  interface PageMeta {
    breadcrumb?: BreadcrumbItem[]
  }
}

export {}
