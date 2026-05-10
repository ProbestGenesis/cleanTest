export type PageAccessId =
  | "dashboard"
  | "employees"
  | "messages"
  | "stock"
  | "sales"
  | "purchases"
  | "accounting"
  | "clients"
  | "trainings"
  | "password_requests"

export const DEFAULT_PAGE_ACCESS: PageAccessId[] = [
  "dashboard",
  "messages",
  "employees",
  "stock",
  "trainings",
]

export const ALL_PAGE_ACCESS: PageAccessId[] = [
  "dashboard",
  "employees",
  "messages",
  "stock",
  "sales",
  "purchases",
  "accounting",
  "clients",
  "trainings",
  "password_requests",
]

export const PAGE_ACCESS_OPTIONS: { id: PageAccessId; label: string }[] = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "employees", label: "Ressources humaines" },
  { id: "messages", label: "Messagerie" },
  { id: "stock", label: "Stock" },
  { id: "sales", label: "Gestion ventes" },
  { id: "purchases", label: "Gestion achats" },
  { id: "accounting", label: "Comptabilite" },
  { id: "clients", label: "Clients" },
  { id: "trainings", label: "Formations" },
  { id: "password_requests", label: "Demandes de réinitialisation" },
]

export const PAGE_ROUTE_BY_ACCESS: Record<PageAccessId, string> = {
  dashboard: "/",
  employees: "/employees",
  messages: "/messages",
  stock: "/stock",
  sales: "/sales",
  purchases: "/purchases",
  accounting: "/accounting",
  clients: "/clients",
  trainings: "/trainings",
  password_requests: "/interne/admin/password-requests",
}

const PAGE_ACCESS_SET = new Set<PageAccessId>(ALL_PAGE_ACCESS)
const DEFAULT_PAGE_ACCESS_SET = new Set<PageAccessId>(DEFAULT_PAGE_ACCESS)

export function normalizePageAccess(pageAccess: string[] | undefined | null): PageAccessId[] {
  const cleaned = (pageAccess ?? []).filter(
    (value): value is PageAccessId => PAGE_ACCESS_SET.has(value as PageAccessId)
  )
  return Array.from(new Set<PageAccessId>([...DEFAULT_PAGE_ACCESS, ...cleaned]))
}

export function isDefaultPageAccess(pageId: string): boolean {
  return DEFAULT_PAGE_ACCESS_SET.has(pageId as PageAccessId)
}

export function getPageAccessIdFromPath(pathname: string): PageAccessId | null {
  for (const [accessId, route] of Object.entries(PAGE_ROUTE_BY_ACCESS) as [
    PageAccessId,
    string,
  ][]) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return accessId
    }
  }
  return null
}
