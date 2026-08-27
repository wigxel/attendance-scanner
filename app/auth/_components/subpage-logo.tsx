import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubpageLogo() {
  const pathname = usePathname()

  if (!pathname.startsWith('/blog')) return null;

  return <Link
    href={"/blog"}
    className="text-lg text-blue-500 tracking-tightest"
  >
    Makers
  </Link>
}
