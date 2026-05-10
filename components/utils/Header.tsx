"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex w-full items-center bg-sidebar-accent p-2 py-4 border-b">
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <div className="font-semibold text-lg">Gesent</div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Add other header elements here if needed */}
        </div>
      </div>
    </header>
  )
}

export default Header
