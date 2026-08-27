import PublicHeader from "./_components/public-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PublicHeader />
      {children}
    </div>
  );
}
