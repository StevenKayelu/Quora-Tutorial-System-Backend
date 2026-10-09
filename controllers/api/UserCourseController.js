import db from "../../config/db.js";
import UserCourseModel from "../../models/UserCourseModel.js";
import UserSubscriptionModel from "../../models/UserSubscriptionModel.js";
import { getUserAcademic } from "../../models/AcademicModel.js";
import { getSystemInfo } from "../../models/SystemInfoModel.js";
import { sendStoredImage } from "../../utils/storedImage.js";

export default class UserCourseController {
  constructor() {
    this.model = new UserCourseModel();
  }

  // -------------------- GET SUBSCRIBED SCHOOLS --------------------
  async getSubscribedSchools(req, res) {
    try {
      const userId = req.user.id;
      const schools = await this.model.getSchoolsByUser(userId);

      res.status(200).json({ success: true, data: schools });
    } catch (err) {
      console.error("getSubscribedSchools:", err);
      res.status(500).json({ success: false, message: "Failed to load subscribed schools." });
    }
  }

  // -------------------- GET SUBSCRIBED COURSES BY SCHOOL --------------------
  async getSubscribedCourses(req, res) {
    try {
      const userId = req.user.id;
      const { school_id } = req.params;
      if (!school_id) return res.status(400).json({ success: false, message: "School ID is required." });

      const courses = await this.model.getCoursesByUserAndSchool(userId, school_id);
      res.status(200).json({ success: true, data: courses });

    } catch (err) {
      console.error("getSubscribedCourses:", err);
      res.status(500).json({ success: false, message: "Failed to load subscribed courses." });
    }
  }

  // -------------------- GET USER COURSE IDS --------------------
  async getCourseIds(req, res) {
    try {
      const userId = req.user.id;
      const ids = await UserSubscriptionModel.getSubscribedCourseIds(userId);
      res.json({ success: true, data: ids });
    } catch (err) {
      console.error("getCourseIds error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch course IDs." });
    }
  }

  // -------------------- CHECK IF USER IS SUBSCRIBED --------------------
  async isSubscribed(req, res) {
    try {
      const userId = req.user.id;
      const { courseId } = req.params;

      const subscribed = await UserSubscriptionModel.isSubscribed(userId, courseId);
      res.json({ success: true, subscribed });

    } catch (err) {
      console.error("isSubscribed error:", err);
      res.status(500).json({ success: false, message: "Failed to verify subscription" });
    }
  }

  // -------------------- GET FULL COURSE STRUCTURE --------------------
  async getCourseStructure(req, res) {
    try {
      const userId = req.user.id;
      const { course_id } = req.params;
      if (!course_id) return res.status(400).json({ success: false, message: "Course ID is required." });

      const structure = await this.model.getCourseStructure(userId, course_id);
      if (!structure || structure.access === false)
        return res.status(403).json({ success: false, message: "Not subscribed to this course." });

      res.status(200).json({ success: true, data: structure });

    } catch (err) {
      console.error("getCourseStructure:", err);
      res.status(500).json({ success: false, message: "Failed to load course structure." });
    }
  }

  // -------------------- GET MEMBERSHIP CARD --------------------
  async getMembershipCard(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User not authenticated." });
      }

      const [[user]] = await db.query(
        `SELECT id, u_user_id, first_name, last_name, u_email, u_image
         FROM user
         WHERE id = ?
         LIMIT 1`,
        [userId]
      );

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      const [activeRows] = await db.query(`
        SELECT ucs.id, ucs.course_id, ucs.term_id, ucs.expires_at, ucs.status,
               c.course_name,
               s.school_name,
               t.term_number, t.start_date, t.end_date
        FROM user_course_subscription ucs
        LEFT JOIN courses c ON c.id = ucs.course_id
        LEFT JOIN school s ON s.id = c.school_id
        LEFT JOIN term t ON t.id = ucs.term_id
        WHERE ucs.user_id = ?
          AND ucs.status = 'active'
          AND ucs.expires_at >= CURDATE()
        ORDER BY ucs.expires_at DESC, c.course_name ASC
      `, [userId]);

      const [fallbackRows] = await db.query(`
        SELECT ucs.id, ucs.course_id, ucs.term_id, ucs.expires_at, ucs.status,
               c.course_name,
               s.school_name,
               t.term_number, t.start_date, t.end_date
        FROM user_course_subscription ucs
        LEFT JOIN courses c ON c.id = ucs.course_id
        LEFT JOIN school s ON s.id = c.school_id
        LEFT JOIN term t ON t.id = ucs.term_id
        WHERE ucs.user_id = ?
        ORDER BY ucs.expires_at DESC, ucs.subscribed_at DESC
      `, [userId]);

      const subscriptions = activeRows.length ? activeRows : fallbackRows;

      const [currentTermRows] = await db.query(`
        SELECT id, term_number, start_date, end_date
        FROM term
        WHERE start_date <= CURDATE()
          AND end_date >= CURDATE()
        ORDER BY start_date DESC
        LIMIT 1
      `);

      const currentTerm = currentTermRows[0] || null;
      const filteredSubscriptions = currentTerm
        ? subscriptions.filter(sub => sub.term_id === currentTerm.id || !sub.term_id)
        : subscriptions;

      const validCourses = (filteredSubscriptions.length ? filteredSubscriptions : subscriptions)
        .filter(sub => sub.course_name)
        .map(sub => ({
          id: sub.course_id,
          name: sub.course_name,
          school: sub.school_name || "General Studies"
        }));

      const courses = validCourses.filter((course, index, list) =>
        list.findIndex(item => item.id === course.id && item.name === course.name) === index
      );

      const [activeMembershipRows] = await db.query(`
        SELECT id, course_id
        FROM user_course_subscription
        WHERE user_id = ?
          AND status = 'active'
          AND expires_at >= CURDATE()
      `, [userId]);

      const activeSubscriptionIds = activeMembershipRows.map(row => row.id).filter(Boolean);
      const activeCourseIds = activeMembershipRows.map(row => row.course_id).filter(Boolean);

      let totalAmount = 0;

      if (activeSubscriptionIds.length || activeCourseIds.length) {
        const [amountRows] = await db.query(`
          SELECT COALESCE(SUM(amount), 0) AS total_amount
          FROM (
            SELECT DISTINCT pt.id, pt.amount
            FROM payment_transaction pt
            LEFT JOIN payment_transaction_courses ptc
              ON ptc.transaction_id = pt.transaction_id
            WHERE pt.user_id = ?
              AND pt.payment_status = 'success'
              AND (
                pt.subscription_id IN (?)
                OR ptc.course_id IN (?)
              )
          ) active_payments
        `, [userId, activeSubscriptionIds, activeCourseIds]);

        totalAmount = Number(amountRows?.[0]?.total_amount || 0);
      }

      const latestExpiry = (filteredSubscriptions.length ? filteredSubscriptions : subscriptions)
        .map(sub => sub.expires_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))[0] || currentTerm?.end_date || null;

      const studentName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Student";
      const studentId = user.u_user_id || String(user.id);
      const programme = [...new Set((courses || []).map(course => course.school).filter(Boolean))].join(", ") || "General Studies";
      const cardNumber = user.u_user_id || `STU-${String(user.id).padStart(6, "0")}`;
      const academic = await getUserAcademic(user.id);

      const payload = {
        studentName,
        studentId,
        studentIdDisplay: studentId,
        programme,
        // The student's chosen year of study (falls back to the old term-based label)
        yearOfStudy: academic?.study_year_name || (currentTerm ? `Year ${currentTerm.term_number}` : "Current Term"),
        school: academic?.school_name || null,
        // mysql2 returns DATE columns as Date objects, not strings
        academicYear: currentTerm ? `${new Date(currentTerm.start_date).getFullYear()} / ${new Date(currentTerm.end_date).getFullYear()}` : "N/A",
        term: currentTerm ? `Term ${currentTerm.term_number}` : "Membership",
        courses,
        amountPaid: Number(totalAmount).toFixed(2),
        cardNumber,
        validUntil: latestExpiry,
        validityText: latestExpiry ? `Valid until ${new Date(latestExpiry).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "No expiry set",
        photo: user.u_image || null,
        email: user.u_email || null,
      };

      return res.status(200).json({ success: true, data: payload });
    } catch (err) {
      console.error("getMembershipCard:", err);
      return res.status(500).json({ success: false, message: "Failed to load membership card." });
    }
  }

  // -------------------- MEMBERSHIP CARD IMAGES --------------------
  // The logged-in student's own photo, or the system logo, served from our API
  // so the card can be drawn on a canvas and saved as an image.
  async getMembershipCardImage(req, res) {
    try {
      const { kind } = req.params;
      let url = null;
      if (kind === "photo") {
        const [[user]] = await db.query("SELECT u_image FROM user WHERE id = ? LIMIT 1", [req.user?.id]);
        url = user?.u_image || null;
      } else if (kind === "logo") {
        url = (await getSystemInfo())?.logo || null;
      } else {
        return res.status(404).end();
      }
      await sendStoredImage(res, url, kind === "photo" ? `photo of user ${req.user?.id}` : "logo");
    } catch (err) {
      console.error("getMembershipCardImage:", err);
      if (!res.headersSent) res.status(404).end();
    }
  }
}
