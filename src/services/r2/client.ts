import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class R2NotConfiguredError extends Error {
  constructor() {
    super("R2 is not configured.");
    this.name = "R2NotConfiguredError";
  }
}

function getConfig() {
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;

  if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
    throw new R2NotConfiguredError();
  }

  return { accessKeyId, secretAccessKey, endpoint, bucket };
}

function getClient(config: {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
}) {
  // R2 is S3-compatible; "auto" region is Cloudflare's documented value
  // for the R2 S3 API.
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

async function uploadObject(
  key: string,
  body: Uint8Array | string,
  contentType: string,
): Promise<void> {
  const config = getConfig();
  const client = getClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  const config = getConfig();
  const client = getClient(config);

  const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export const R2Service = {
  uploadObject,
  getSignedDownloadUrl,
};
