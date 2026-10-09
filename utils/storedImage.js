// Streams an image we stored (R2 or a local upload folder) back through the API.
// The membership card is drawn on a <canvas> in the browser, and a canvas can
// only be exported if its images come from our own API origin.
// Only our own storage is read: never an arbitrary URL.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2Client.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// Same folders app.js serves statically
const LOCAL_DIRS = {
  "/uploads/profileimages/": "uploads/profileimages",
  "/storage/assets/": "public",
};
const MAX_BYTES = 5 * 1024 * 1024;
const CACHE = "private, max-age=300";

// Phones don't always report a file type on upload, so trust the bytes
const sniffImageType = (buf) => {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.subarray(0, 6).toString("latin1"))) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
};

const sendBuffer = (res, buf, label) => {
  const type = sniffImageType(buf);
  if (!type) {
    // e.g. an iPhone HEIC photo, which browsers can't draw
    console.warn(`card image: ${label} is not a JPEG/PNG/WebP/GIF image`);
    return res.status(415).end();
  }
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", CACHE);
  return res.end(buf);
};

// Object key inside our bucket for a stored URL. Works for the current public
// base URL and for older uploads saved under a different domain.
const r2KeyFromUrl = (parsed) => {
  let pathname = decodeURIComponent(parsed.pathname);
  const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  try {
    const basePath = new URL(base).pathname.replace(/\/+$/, "");
    if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
  } catch {
    /* no or invalid base URL: use the path as it is */
  }
  return pathname.replace(/^\/+/, "");
};

export async function sendStoredImage(res, url, label = "image") {
  if (!url) return res.status(404).end();

  let parsed = null;
  try {
    if (/^https?:\/\//i.test(url)) parsed = new URL(url);
  } catch {
    console.warn(`card image: ${label} has an invalid URL`);
    return res.status(404).end();
  }
  const pathname = parsed ? decodeURIComponent(parsed.pathname) : url;

  // Local upload folders (older profile photos, bundled assets)
  for (const [prefix, dir] of Object.entries(LOCAL_DIRS)) {
    if (pathname.startsWith(prefix)) {
      const file = path.join(ROOT, dir, path.basename(pathname)); // no "../" escapes
      if (!fs.existsSync(file)) {
        console.warn(`card image: ${label} file not found on the server`);
        return res.status(404).end();
      }
      const buf = fs.readFileSync(file);
      if (buf.length > MAX_BYTES) return res.status(413).end();
      return sendBuffer(res, buf, label);
    }
  }

  // Anything else that is a full URL: read that key from our own bucket
  if (!parsed) {
    console.warn(`card image: ${label} is not a URL we can resolve`);
    return res.status(404).end();
  }
  const key = r2KeyFromUrl(parsed);
  try {
    const obj = await r2Client.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
    if (Number(obj.ContentLength) > MAX_BYTES) return res.status(413).end();
    const buf = Buffer.from(await obj.Body.transformToByteArray());
    return sendBuffer(res, buf, label);
  } catch (err) {
    console.warn(`card image: ${label} not found in storage (key "${key}"): ${err.name || err.message}`);
    return res.status(404).end();
  }
}
