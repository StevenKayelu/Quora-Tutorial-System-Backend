export function getPublicIdFromUrl(url) {
  if (!url) return null;

  /**
   * Example URL:
   * https://res.cloudinary.com/dny5wiazy/image/upload/v1766229652/system_info_uploads/abc123.png
   */

  const parts = url.split("/");
  const fileWithExt = parts.pop(); // abc123.png
  const folder = parts.pop();      // system_info_uploads

  const publicId = `${folder}/${fileWithExt.split(".")[0]}`;

  return publicId;
}
