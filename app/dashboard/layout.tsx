import { TopNavbar } from "@/components/top-navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <TopNavbar />
      <div className="h-[calc(100vh-56px)]">{children}</div>
    </div>
  )
}
