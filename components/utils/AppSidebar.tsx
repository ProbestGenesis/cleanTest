"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import logo from "@/assets/image/logo/gesent.jpeg"
import {
  BadgeDollarSign,
  BookOpenCheck,
  CirclePile,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  MessageCircle,
  Users,
  GraduationCap,
  KeyRound
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import Link from "next/link"
import clsx from "clsx"
import { authClient } from "@/lib/auth-client"
import { PageAccessId, normalizePageAccess } from "@/lib/pageAccess"

type SidebarItem = {
  icon: LucideIcon
  name: string
  pageAccess: PageAccessId
  link: string
}
function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
 {/* const { hasUnread, clearUnread } = useMessageNotifications()}*/}

  const role = session?.user?.role
  const isElevatedRole = role === "admin" || role === "superadmin" || role === "assistant_administratif"
  const allowedPageAccess = normalizePageAccess(session?.user?.pageAccess)
  const visibleItems = isElevatedRole
    ? items
    : items.filter((item) => allowedPageAccess.includes(item.pageAccess))

  return (
    <Sidebar>
      <SidebarHeader className="p-0.5">
        <div className="relative w-54 h-32">
          <Image src={logo} alt="logo" fill className="object-contain " />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex flex-col space-y-1 ">
          {visibleItems.map((item, idx) => {
            const isMessages = item.link === "/interne/messages"
            return (
              <Link
                href={item.link}
                key={idx}
                onClick={() => {
                  //if (isMessages) clearUnread()
                }}
              >
                <SidebarMenuItem
                  className={clsx(
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all rounded-full p-1.5 px-4 flex flex-row space-x-4 items-center",
                    {
                      "bg-sidebar-accent text-sidebar-accent-foreground": 
                        item.link === "/" ? pathname === "/" : pathname.startsWith(item.link),
                    }
                  )}
                >
                  <item.icon />
                  <p>{item.name}</p>

                  {/*isMessages && hasUnread && (*/}
                    <span className="ml-auto w-2.5 h-2.5 rounded-full bg-green-500 shrink-0 animate-pulse" />
                  {/*)*/}
                </SidebarMenuItem>
              </Link>
            )
          })}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}

const items: SidebarItem[] = [
  {
    icon: LayoutDashboard,
    name: "Accueil",
    pageAccess: "dashboard",
    link: "/",
  },
  {
    icon: MessageCircle,
    name: "Messagerie",
    pageAccess: "messages",
    link: "/messages",
  },
  {
    icon: Users,
    name: "Gestion des tâches",
    pageAccess: "employees",
    link: "/employees",
  },
  {
    icon: BadgeDollarSign,
    name: "Gestion Ventes",
    pageAccess: "sales",
    link: "/sales",
  },
  {
    icon: CreditCard,
    name: "Gestion Achats",
    pageAccess: "purchases",
    link: "/purchases",
  },
  {
    icon: CirclePile,
    name: "Gestion du stock",
    pageAccess: "stock",
    link: "/stock",
  },
  {
    icon: Landmark,
    name: "Comptabilite",
    pageAccess: "accounting",
    link: "/accounting",
  },
  {
    icon: GraduationCap,
    name: "Formations",
    pageAccess: "trainings",
    link: "/trainings",
  },
  {
    icon: KeyRound,
    name: "Réinitialisations",
    pageAccess: "password_requests",
    link: "/interne/admin/password-requests",
  },
]


export default AppSidebar