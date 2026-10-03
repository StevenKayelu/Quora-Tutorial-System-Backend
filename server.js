

import express from "express";
import app from "./app.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  "/uploads/contact-videos",
  express.static(path.join(__dirname, "uploads/contact-videos"))
);



const PORT = process.env.APP_PORT || 5010;

app.listen(PORT, () => {
   credentials: true 
	console.log(`Server running  on port ${PORT}`);
});
