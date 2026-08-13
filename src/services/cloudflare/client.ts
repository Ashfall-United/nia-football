import "server-only";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

export class CloudflareApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "CloudflareApiError";
  }
}

type CloudflareEnvelope<T> = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: T;
};

// Every Cloudflare call goes through here so the account id / API token
// never has to be read anywhere else, and every caller gets the same
// error shape whether Cloudflare rejected the request or credentials are
// simply missing (e.g. no real Cloudflare account configured yet).
export async function cloudflareFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new CloudflareApiError("Cloudflare is not configured.", 0);
  }

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${accountId}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    },
  );

  const body = await response.text();
  const payload = body
    ? (JSON.parse(body) as CloudflareEnvelope<T>)
    : ({
        success: response.ok,
        errors: [],
        result: null as T,
      } satisfies CloudflareEnvelope<T>);

  if (!response.ok || !payload.success) {
    const message = payload.errors?.[0]?.message ?? "Cloudflare request failed.";
    throw new CloudflareApiError(message, response.status);
  }

  return payload.result;
}
