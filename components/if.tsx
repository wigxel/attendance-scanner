
interface IfProps {
  cond: boolean;
  children: React.ReactNode;
}

export function If({ cond, children }: IfProps) {
  if (!cond) return null;
  return <>{children}</>;
}
