import app from "./app.js";

// Public static folders (profile images, contact videos) are mounted in app.js.
// Do NOT mount the whole uploads/ directory: it holds legacy course PDFs.

const PORT = process.env.APP_PORT || 5010;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
