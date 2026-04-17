import { Suspense } from "react"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { TopNavbar } from "@/components/top-navbar"

const sidebarStyle = {
  "--sidebar-width": "224px",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen overflow-hidden">
      <TopNavbar />
      <SidebarProvider style={sidebarStyle} className="h-[calc(100vh-56px)]">
        <Suspense fallback={null}>
          <AppSidebar variant="sidebar" mode="data-overview" />
        </Suspense>
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="h-[calc(100%-3rem)] overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
