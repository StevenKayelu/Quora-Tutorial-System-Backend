import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2Client.js";

/**
 * Stream a file from R2
 * @param {string} key - folder/filename
 * @returns {Readable} stream
 */
export async function streamFromR2(key) {
  if (!key) throw new Error("Key is required for streaming");

  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  const response = await r2Client.send(command);

  if (!response.Body) throw new Error("Empty object body");

  return response.Body;
}
