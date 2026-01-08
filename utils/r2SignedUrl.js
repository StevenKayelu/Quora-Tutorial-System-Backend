import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client } from "./r2Client.js";

export async function getSignedUrlFromR2(
  key,
  { expiresIn = 60, disposition = "inline", filename = "file.pdf" } = {}
) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `${disposition}; filename="${filename}"`,
    ResponseContentType: "application/pdf",
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}
