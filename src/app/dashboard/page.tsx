import { requireAuthenticatedUser } from "@/lib/auth/dal";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">Signed in</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
      <p className="max-w-sm text-xs text-muted-foreground">
        Organisation workspaces are not built yet.
      </p>
    </div>
  );
}
