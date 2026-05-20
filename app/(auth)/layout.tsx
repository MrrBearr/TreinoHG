export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="absolute inset-0 -z-10 bg-gradient-mesh" />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
