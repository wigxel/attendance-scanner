import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function DestroyFutureStateOnReserve() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/reserve") return;

    window.history.pushState(null, "", window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  return null;
}
