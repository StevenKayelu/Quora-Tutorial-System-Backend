// Streams an image we stored (R2 or a local upload folder) back through the API.
// The membership card is drawn on a <canvas> in the browser, and a canvas can
// only be exported if its images come from our own API origin.
// Only our own storage is read: never an arbitrary URL.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2Client.js";
import { getKeyFromUrl } from "./r2Upload.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same folders app.js serves statically
const LOCAL_DIRS = {
  "/uploads/profileimages/": "uploads/profileimages",
  "/storage/assets/": "public",
};
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const MAX_BYTES = 5 * 1024 * 1024;
const CACHE = "private, max-age=300";

export async function sendStoredImage(res, url) {
  if (!url) return res.status(404).end();

  const r2Base = process.env.R2_PUBLIC_BASE_URL;
  if (r2Base && url.startsWith(`${r2Base}/`)) {
    const obj = await r2Client.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: getKeyFromUrl(url) })
    );
    if (!String(obj.ContentType || "").startsWith("image/")) return res.status(415).end();
    if (Number(obj.ContentLength) > MAX_BYTES) return res.status(413).end();
    res.setHeader("Content-Type", obj.ContentType);
    res.setHeader("Cache-Control", CACHE);
    obj.Body.pipe(res);
    return;
  }

  let pathname = url;
  try {
    if (/^https?:\/\//i.test(url)) pathname = new URL(url).pathname;
  } catch {
    return res.status(404).end();
  }

  for (const [prefix, dir] of Object.entries(LOCAL_DIRS)) {
    if (pathname.startsWith(prefix)) {
      const name = path.basename(decodeURIComponent(pathname)); // no "../" escapes
      const file = path.join(ROOT, dir, name);
      if (!IMAGE_EXT.test(name) || !fs.existsSync(file)) return res.status(404).end();
      return res.sendFile(file, { headers: { "Cache-Control": CACHE } });
    }
  }
  return res.status(404).end();
}
