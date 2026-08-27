"use client";
import { Slot } from "@radix-ui/react-slot";
import { useEffectEvent } from "@radix-ui/react-use-effect-event";
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type MenuContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

export const MenuContext = createContext<MenuContextValue>({
  open: true,
  setOpen: () => {},
  toggle: () => {},
});

export function useMobileMenu() {
  return useContext(MenuContext);
}

/**
 * MobileMenu
 * Root provider that holds the open state and provides helpers.
 */
export const MobileMenu: React.FC<{
  children?: ReactNode;
  defaultOpen?: boolean;
}> = ({ children, defaultOpen = false }) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  const toggle = () => setOpen((v) => !v);

  return (
    <MenuContext.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MenuContext.Provider>
  );
};

/**
 * Trigger
 * A button that toggles the menu open/closed. Accepts pass-through props.
 */
export const MobileMenuTrigger: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
> = ({ children, asChild = false, ...rest }) => {
  const ctx = useMobileMenu();

  if (!ctx) {
    throw new Error("Trigger must be used within a MobileMenu");
  }

  const Component = asChild ? Slot : "div";

  return (
    <Component
      aria-expanded={ctx.open}
      aria-controls="mobile-menu-content"
      // @ts-expect-error Not a problem
      onClick={() => {
        ctx.toggle();
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};

/**
 * Content
 * Popup panel that renders into a portal, handles escape to close, clicking outside, and basic focus-trap.
 */
type MobileMenuContentProps = {
  children?: ReactNode;
  id?: string;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
};

export function MobileMenuContent(props: MobileMenuContentProps) {
  const {
    children,
    id = "mobile-menu-content",
    className,
    innerClassName,
    style,
  } = props;

  const ctx = useMobileMenu();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      ctx.setOpen(false);
    } else if (e.key === "Tab") {
      // Basic focus trap
      if (!containerRef.current) return;
      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(Boolean);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  useEffect(() => {
    // Save previously focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Focus the container or first focusable element
    const el = containerRef.current;
    if (el) {
      const focusables = el.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length) {
        focusables[0].focus();
      } else {
        el.setAttribute("tabindex", "-1");
        el.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // restore focus
      try {
        previouslyFocusedRef.current?.focus();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (ctx.open) {
      document.body.style.overflow = "hidden";
      document.body.style.height = "100vh";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.height = "auto";
    }
  }, [ctx.open]);

  // Create a simple portal target
  const portalRoot = typeof document !== "undefined" ? document.body : null;
  if (!portalRoot) return null;

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      data-show={ctx.open}
      id={id}
      ref={containerRef}
      className={cn(
        className,
        "transition-default",
        "translate-x-full data-[show=true]:translate-x-0",
      )}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 9998,
        ...style,
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
      {/* Panel */}
      <div
        className={cn("flex flex-col", innerClassName)}
        style={{
          position: "absolute",
          inset: "0.5rem",
          zIndex: 1001,
          borderRadius: "1.2rem",
        }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(panel, portalRoot);
}
