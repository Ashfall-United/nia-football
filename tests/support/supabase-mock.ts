import { vi } from "vitest";

type SupabaseResult<T = unknown> = { data: T; error: unknown };

export type RecordedCall = {
  table: string;
  method: string;
  args: unknown[];
};

// The domain layer talks to Supabase almost entirely through chained
// query-builder calls (`.from().select().eq().eq().maybeSingle()`, etc.)
// that are themselves awaitable. This fakes that shape: every chain
// method records its call and returns the same thenable object, which
// resolves to whatever result was configured for that table. Good enough
// to test authorization/tenant-scoping logic and query construction
// without a real database — it does not simulate RLS or actual filtering.
export function createSupabaseMock(
  responses: Record<string, SupabaseResult>,
) {
  const calls: RecordedCall[] = [];

  const CHAIN_METHODS = [
    "select",
    "eq",
    "neq",
    "in",
    "order",
    "limit",
    "maybeSingle",
    "single",
    "insert",
    "update",
    "delete",
    "upsert",
  ] as const;

  function makeChain(table: string) {
    const result = responses[table] ?? { data: null, error: null };

    const chain: Record<string, unknown> = {
      then(
        onFulfilled?: (value: SupabaseResult) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };

    for (const method of CHAIN_METHODS) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }

    return chain;
  }

  const getUser = vi.fn();

  const client = {
    from: (table: string) => {
      calls.push({ table, method: "from", args: [] });
      return makeChain(table);
    },
    auth: { getUser },
  };

  return { client, calls, getUser };
}
