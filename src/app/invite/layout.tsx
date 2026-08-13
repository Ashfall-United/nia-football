import { StadiumShell } from "@/components/stadium-shell";

export default function InviteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StadiumShell contentClassName="items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        {children}
      </div>
    </StadiumShell>
  );
}
