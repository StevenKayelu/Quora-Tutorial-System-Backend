import multer from "multer";

/* =========================================================
   MEMORY STORAGE FOR ALL UPLOADS (R2)
========================================================= */
const memoryStorage = multer.memoryStorage();

/* =========================================================
   PROFILE IMAGE UPLOAD
========================================================= */
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

export const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

/* =========================================================
   NOTES UPLOAD (PDF / DOCX → memory for R2)
========================================================= */
const notesFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF or DOCX files are allowed"), false);
};

export const uploadNotes = multer({
  storage: memoryStorage,
  fileFilter: notesFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

/* =========================================================
   CONTACT VIDEOS (MP4 / MOV / etc → memory for R2)
========================================================= */
const videoFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) cb(null, true);
  else cb(new Error("Only video files are allowed"), false);
};

export const uploadContactVideo = multer({
  storage: memoryStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB max
});

/* =========================================================
   TEST PAPERS (PDF → memory for R2)
========================================================= */
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

export const uploadTermTest = multer({
  storage: memoryStorage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

/* =========================================================
   TUTORIAL SHEETS (PDF / DOC / DOCX → memory for R2)
========================================================= */
const tutorialSheetFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF or DOCX files are allowed"), false);
};

export const uploadTutorialSheet = multer({
  storage: memoryStorage,
  fileFilter: tutorialSheetFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

export const uploadProfileImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});
