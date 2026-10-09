import {
  getSchoolOptions,
  getStudyYears,
  schoolExists,
  studyYearExists,
  getUserAcademic,
  setUserAcademic,
  createStudyYear,
  getNextStudyYearOrder,
  updateStudyYear,
  reorderStudyYears,
  countUsersInStudyYear,
  deleteStudyYear,
  getUserAcademicByUserId,
  setUserAcademicByUserId,
} from "../../models/AcademicModel.js";

const isDuplicate = (error) => error?.code === "ER_DUP_ENTRY";

export default class AcademicController {
  // ===== PUBLIC: dropdown options for registration =====
  async getOptions(req, res) {
    try {
      const [schools, years] = await Promise.all([getSchoolOptions(), getStudyYears()]);
      res.json({
        success: true,
        data: {
          schools,
          years: years.map(({ id, name }) => ({ id, name })),
        },
      });
    } catch (error) {
      console.error("getOptions error:", error);
      res.status(500).json({ success: false, message: "Failed to load registration options" });
    }
  }

  // ===== LOGGED-IN USER: own school + year =====
  // ADMIN: a user's school and year (users are identified by u_user_id)
  async getForUser(req, res) {
    try {
      const data = await getUserAcademicByUserId(req.params.userId);
      if (!data) return res.status(404).json({ success: false, message: "User not found" });
      res.json({ success: true, data: { schoolId: data.school_id, studyYearId: data.study_year_id } });
    } catch (error) {
      console.error("getForUser error:", error);
      res.status(500).json({ success: false, message: "Failed to load the user's school and year" });
    }
  }

  async updateForUser(req, res) {
    try {
      const schoolId = Number(req.body?.schoolId);
      const studyYearId = Number(req.body?.studyYearId);
      if (!schoolId || !(await schoolExists(schoolId)))
        return res.status(400).json({ success: false, message: "Please select a valid school" });
      if (!studyYearId || !(await studyYearExists(studyYearId)))
        return res.status(400).json({ success: false, message: "Please select a valid year of study" });

      if (!(await getUserAcademicByUserId(req.params.userId)))
        return res.status(404).json({ success: false, message: "User not found" });
      await setUserAcademicByUserId(req.params.userId, schoolId, studyYearId);
      res.json({ success: true, message: "School and year updated" });
    } catch (error) {
      console.error("updateForUser error:", error);
      res.status(500).json({ success: false, message: "Failed to update the user's school and year" });
    }
  }

  async getMine(req, res) {
    try {
      const data = await getUserAcademic(req.user.id);
      if (!data) return res.status(404).json({ success: false, message: "User not found" });

      res.json({
        success: true,
        data: {
          schoolId: data.school_id,
          schoolName: data.school_name,
          studyYearId: data.study_year_id,
          studyYearName: data.study_year_name,
          complete: Boolean(data.school_id && data.study_year_id),
        },
      });
    } catch (error) {
      console.error("getMine error:", error);
      res.status(500).json({ success: false, message: "Failed to load your school and year" });
    }
  }

  async updateMine(req, res) {
    try {
      const schoolId = Number(req.body?.schoolId);
      const studyYearId = Number(req.body?.studyYearId);

      if (!schoolId || !(await schoolExists(schoolId)))
        return res.status(400).json({ success: false, message: "Please select a valid school" });
      if (!studyYearId || !(await studyYearExists(studyYearId)))
        return res.status(400).json({ success: false, message: "Please select a valid year of study" });

      // A student picks their school once; after that only an admin can change it
      const current = await getUserAcademic(req.user.id);
      if (current?.school_id && Number(current.school_id) !== schoolId) {
        return res.status(403).json({
          success: false,
          message: "Your school can only be changed by an administrator",
        });
      }

      await setUserAcademic(req.user.id, schoolId, studyYearId);
      res.json({ success: true, message: "School and year saved" });
    } catch (error) {
      console.error("updateMine error:", error);
      res.status(500).json({ success: false, message: "Failed to save your school and year" });
    }
  }

  // ===== ADMIN: study years =====
  async listYears(req, res) {
    try {
      res.json({ success: true, data: await getStudyYears() });
    } catch (error) {
      console.error("listYears error:", error);
      res.status(500).json({ success: false, message: "Failed to load study years" });
    }
  }

  async createYear(req, res) {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });

      const id = await createStudyYear(name, await getNextStudyYearOrder());
      res.status(201).json({ success: true, id });
    } catch (error) {
      if (isDuplicate(error))
        return res.status(409).json({ success: false, message: "That year already exists" });
      console.error("createYear error:", error);
      res.status(500).json({ success: false, message: "Failed to create study year" });
    }
  }

  async updateYear(req, res) {
    try {
      const name = String(req.body?.name || "").trim();
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });

      const years = await getStudyYears();
      const current = years.find((y) => String(y.id) === String(req.params.id));
      if (!current) return res.status(404).json({ success: false, message: "Study year not found" });

      await updateStudyYear(current.id, name, current.sort_order);
      res.json({ success: true });
    } catch (error) {
      if (isDuplicate(error))
        return res.status(409).json({ success: false, message: "That year already exists" });
      console.error("updateYear error:", error);
      res.status(500).json({ success: false, message: "Failed to update study year" });
    }
  }

  async reorderYears(req, res) {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Boolean) : [];
      if (!ids.length) return res.status(400).json({ success: false, message: "ids are required" });

      await reorderStudyYears(ids);
      res.json({ success: true });
    } catch (error) {
      console.error("reorderYears error:", error);
      res.status(500).json({ success: false, message: "Failed to reorder study years" });
    }
  }

  async deleteYear(req, res) {
    try {
      const inUse = await countUsersInStudyYear(req.params.id);
      if (inUse > 0) {
        return res.status(409).json({
          success: false,
          message: `This year is assigned to ${inUse} user${inUse === 1 ? "" : "s"} and can't be removed. Rename it instead.`,
        });
      }

      const deleted = await deleteStudyYear(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: "Study year not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("deleteYear error:", error);
      res.status(500).json({ success: false, message: "Failed to delete study year" });
    }
  }
}
