import { Upload } from "@aws-sdk/lib-storage";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client } from "./r2Client.js";
import { Readable } from "stream";

/**
 * Upload a file to R2
 * @param {Object} options
 * @param {Express.Multer.File} options.file - multer file (buffer or stream)
 * @param {string} options.folder - folder in bucket
 * @returns {string} public URL
 */
// Specialized function for image uploads
export async function uploadImageToR2(file, folder) {
  if (!file) throw new Error("No file provided for R2 upload");

  const filename = file.originalname || "file";
  const key = `${folder}/${Date.now()}-${filename}`;

  const body = file.buffer
    ? Readable.from(file.buffer)
    : file.stream;

  if (!body) throw new Error("File has no buffer or stream");

  const uploader = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.mimetype,
    },
  });

  await uploader.done();

  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`;
}
// General function for various file uploads
export async function uploadToR2({ file, folder }) {
  if (!file) throw new Error("No file provided for R2 upload");

  const filename = file.originalname || file.filename || "file";
  const key = `${folder}/${Date.now()}-${filename}`;

  // Wrap buffer in Readable if necessary
  const body = file.buffer
    ? Readable.from(file.buffer)
    : file.stream
    ? file.stream
    : null;

  if (!body) throw new Error("File has no buffer or stream");

  const uploader = new Upload({
    client: r2Client,
    params: {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: file.mimetype || "application/octet-stream",
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024, // 5MB
  });

  await uploader.done();

  return `${process.env.R2_PUBLIC_BASE_URL}/${key}`; // keep public URL for browser access

}

/**
 * Delete a file from R2
 * @param {string} key - folder/filename
 */
export async function deleteFromR2(key) {
  if (!key) return;
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Extract key from full URL
 */
export function getKeyFromUrl(url) {
  try {
    const parsed = new URL(url);
    // Remove leading slash
    const path = parsed.pathname.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
    // Decode URI-encoded characters
    return decodeURIComponent(path);
  } catch (err) {
    console.error("Invalid URL in getKeyFromUrl:", url);
    return url;
  }
}

