import { StadiumShell } from "@/components/stadium-shell";

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StadiumShell contentClassName="items-start justify-center px-6 py-10">
      <div className="w-full max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </div>
    </StadiumShell>
  );
}
