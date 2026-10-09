// Creates in-app notifications for students when new content is uploaded.
// Called after an upload succeeds; never throws, so an upload can't fail
// because notifications couldn't be created.
import pool from "../config/db.js";

const TYPE_LABEL = {
  video: "New video",
  note: "New notes",
  test: "New test paper",
  tutorial: "New tutorial sheet",
};

// Inserts one notification per user with an active, unexpired subscription
// (same rule as canAccessCourse in utils/courseAccess.js).
const notifySubscribers = async ({ type, itemId, itemTitle, courseId, termId }) => {
  if (!courseId || !itemId) return 0;

  const [[context]] = await pool.query(
    `SELECT c.course_name, c.school_id, t.term_number
     FROM courses c
     LEFT JOIN term t ON t.id = ?
     WHERE c.id = ?`,
    [termId || null, courseId]
  );
  if (!context) return 0;

  const title = `${TYPE_LABEL[type]} in ${context.course_name}`;
  const message = `${itemTitle || "Untitled"}${
    context.term_number ? ` — Term ${context.term_number}` : ""
  }`.slice(0, 500);

  const [result] = await pool.query(
    `INSERT INTO notification
       (user_id, type, title, message, school_id, course_id, term_id, item_id)
     SELECT DISTINCT ucs.user_id, ?, ?, ?, ?, ?, ?, ?
     FROM user_course_subscription ucs
     JOIN user u ON u.id = ucs.user_id
     WHERE ucs.course_id = ?
       AND ucs.status = 'active'
       AND ucs.expires_at >= CURDATE()`,
    [type, title.slice(0, 255), message, context.school_id, courseId, termId || null, itemId, courseId]
  );
  return result.affectedRows;
};

const safely = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`notificationService.${label} error:`, error);
    return 0;
  }
};

// Videos and notes hang off a subtopic → topic (which carries course + term)
export const notifyNewTopicMaterial = (materialId) =>
  safely("notifyNewTopicMaterial", async () => {
    const [[m]] = await pool.query(
      `SELECT tm.id, tm.title, tm.material_type,
              t.course_id, COALESCE(t.term_id, tm.term_id) AS term_id
       FROM topic_material tm
       JOIN subtopic st ON st.id = tm.subtopic_id
       JOIN topic t ON t.id = st.topic_id
       WHERE tm.id = ?`,
      [materialId]
    );
    if (!m) return 0;
    return notifySubscribers({
      type: m.material_type === "video" ? "video" : "note",
      itemId: m.id,
      itemTitle: m.title,
      courseId: m.course_id,
      termId: m.term_id,
    });
  });

export const notifyNewTermTest = (testId) =>
  safely("notifyNewTermTest", async () => {
    const [[t]] = await pool.query(
      "SELECT id, title, course_id, term_id FROM term_test WHERE id = ?",
      [testId]
    );
    if (!t) return 0;
    return notifySubscribers({
      type: "test",
      itemId: t.id,
      itemTitle: t.title,
      courseId: t.course_id,
      termId: t.term_id,
    });
  });

export const notifyNewTutorialSheet = (sheetId) =>
  safely("notifyNewTutorialSheet", async () => {
    const [[s]] = await pool.query(
      "SELECT id, title, course_id, term_id FROM term_tutorial_sheet WHERE id = ?",
      [sheetId]
    );
    if (!s) return 0;
    return notifySubscribers({
      type: "tutorial",
      itemId: s.id,
      itemTitle: s.title,
      courseId: s.course_id,
      termId: s.term_id,
    });
  });
