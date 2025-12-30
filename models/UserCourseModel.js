import db from "../config/db.js";

export default class UserCourseModel {

  /**
   * Get all schools the user has active subscriptions for
   */
  async getSchoolsByUser(userId) {
    const [rows] = await db.query(`
      SELECT DISTINCT s.id, s.school_name
      FROM school s
      JOIN courses c ON c.school_id = s.id
      JOIN user_course_subscription ucs ON ucs.course_id = c.id
      WHERE ucs.user_id=? AND ucs.status='active'
      ORDER BY s.school_name ASC
    `, [userId]);

    return rows;
  }

  /**
   * Get all courses by school for the user
   */
  async getCoursesByUserAndSchool(userId, schoolId) {
    const [rows] = await db.query(`
      SELECT c.id, c.course_name, c.course_description
      FROM courses c
      JOIN user_course_subscription ucs ON ucs.course_id = c.id
      WHERE ucs.user_id=? AND ucs.status='active' AND c.school_id=?
      ORDER BY c.course_name ASC
    `, [userId, schoolId]);

    return rows;
  }

  /**
   * Check if a user is subscribed to a course
   */
  async isUserSubscribedToCourse(userId, courseId) {
    const [rows] = await db.query(`
      SELECT id
      FROM user_course_subscription
      WHERE user_id=? AND course_id=? AND status='active'
    `, [userId, courseId]);

    return rows.length > 0;
  }

  /**
   * Get full course structure (terms → topics → subtopics → materials)
   */
  async getCourseStructure(userId, courseId) {
    const isSubscribed = await this.isUserSubscribedToCourse(userId, courseId);
    if (!isSubscribed) return null;

    const [terms] = await db.query(`
      SELECT DISTINCT t.id, t.term_number, t.start_date, t.end_date
      FROM term t
      JOIN topic tp ON tp.term_id=t.id
      WHERE tp.course_id=?
      ORDER BY t.term_number ASC
    `, [courseId]);

    for (const term of terms) {
      const [topics] = await db.query(`
        SELECT id, topic_title, topic_description
        FROM topic
        WHERE course_id=? AND term_id=?
        ORDER BY id ASC
      `, [courseId, term.id]);

      for (const topic of topics) {
        const [subtopics] = await db.query(`
          SELECT id, subtopic_title, subtopic_description
          FROM subtopic
          WHERE topic_id=?
          ORDER BY id ASC
        `, [topic.id]);

        for (const subtopic of subtopics) {
          const [materials] = await db.query(`
            SELECT id, material_type, title, file_url, video_url, description
            FROM topic_material
            WHERE subtopic_id=?
            ORDER BY id ASC
          `, [subtopic.id]);

          subtopic.materials = materials;
        }

        topic.subtopics = subtopics;
      }

      const [tests] = await db.query(`
        SELECT id, title, test_type, file_url
        FROM term_test
        WHERE course_id=? AND term_id=?
        ORDER BY id ASC
      `, [courseId, term.id]);

      const [tutorialSheets] = await db.query(`
        SELECT id, title, file_url
        FROM term_tutorial_sheet
        WHERE course_id=? AND term_id=?
        ORDER BY id ASC
      `, [courseId, term.id]);

      term.topics = topics;
      term.tests = tests;
      term.tutorial_sheets = tutorialSheets;
    }

    return terms;
  }
}
