import { cn, isSSR } from "@/lib/utils";
import React, { type ComponentProps } from "react";

const ContextDefault = {
  isEmpty: true,
};

const EmptyStateCtx = isSSR()
  ? ({} as React.Context<typeof ContextDefault>)
  : React.createContext(ContextDefault);

function useContext() {
  const context = React.useContext(EmptyStateCtx);
  return isSSR() ? ContextDefault : context;
}

const EmptyStateContent = React.forwardRef<
  HTMLDivElement,
  ComponentProps<"div">
>(function Content(props, ref) {
  const { isEmpty } = useContext();
  if (!isEmpty) return null;

  return (
    <div
      {...props}
      ref={ref}
      className={cn("flex flex-col items-center gap-1", props.className)}
    />
  );
});

const EmptyStateTitle = React.forwardRef<
  HTMLHeadingElement,
  ComponentProps<"h3">
>(function ESTitle(props, ref) {
  return (
    <h6
      ref={ref}
      {...props}
      className={cn("font-500 text-center font-semibold", props.className)}
    />
  );
});

const EmptyStateDescription = React.forwardRef<
  HTMLParagraphElement,
  ComponentProps<"div">
>(function ESDescription(props, ref) {
  return (
    <div
      ref={ref}
      {...props}
      className={cn("text-sm text-muted-foreground", props.className)}
    />
  );
});

function EmptyStateConceal(props: { children?: React.ReactNode }) {
  const { isEmpty } = useContext();

  if (isEmpty) return null;

  return <>{props.children}</>;
}

function EmptyState(props: { isEmpty: boolean; children?: React.ReactNode }) {
  const { isEmpty = true, children } = props;

  if (isSSR()) return <>{children}</>;

  return (
    <EmptyStateCtx.Provider value={{ isEmpty }}>
      {children}
    </EmptyStateCtx.Provider>
  );
}

export {
  EmptyState,
  EmptyStateConceal,
  EmptyStateDescription,
  EmptyStateTitle,
  EmptyStateContent,
};
