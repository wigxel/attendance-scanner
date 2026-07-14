import { AuthChecker } from "@/components/auth-checker";


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>
    <AuthChecker />
    {children}
  </>
}
