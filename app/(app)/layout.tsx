import { SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full" data-user-name={profile?.full_name || user.email}>
        {children}
      </div>
    </SidebarProvider>
  )
}
