import pool from "../config/db.js"; 


export default class PaymentModel {

  /**
   * Create a payment transaction and associate courses
   * - Stores ONLY the MoneyUnify REQUEST transaction_id
   * - Validates course IDs
   * - Atomic (safe rollback)
   */
  static async createTransaction({
    user_id,
    courses = [],
    amount,
    currency,
    payment_method,
    gateway_id,
    transaction_id, // 🔑 MoneyUnify REQUEST ID
    response_data
  }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1️⃣ Insert main transaction (idempotent)
      await conn.query(`
        INSERT INTO payment_transaction
        (
          user_id,
          amount,
          currency,
          payment_status,
          payment_method,
          gateway_id,
          transaction_id,
          response_data,
          created_at
        )
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          response_data = VALUES(response_data)
      `, [
        user_id,
        amount,
        currency,
        payment_method,
        gateway_id,
        transaction_id,
        JSON.stringify(response_data)
      ]);

      // 2️⃣ Validate courses exist
      if (courses.length > 0) {
        const [validCourses] = await conn.query(
          `SELECT id FROM courses WHERE id IN (?)`,
          [courses]
        );

        const validCourseIds = validCourses.map(c => c.id);
        const invalidCourses = courses.filter(id => !validCourseIds.includes(id));

        if (invalidCourses.length > 0) {
          throw new Error(`Invalid course IDs: ${invalidCourses.join(", ")}`);
        }

        // 3️⃣ Attach courses to transaction
        for (const courseId of validCourseIds) {
          await conn.query(`
            INSERT INTO payment_transaction_courses (transaction_id, course_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE course_id = course_id
          `, [transaction_id, courseId]);
        }
      }

      await conn.commit();
      return transaction_id;

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Fetch transaction by REQUEST transaction_id
   */
  static async getByTransaction(transaction_id) {
    const [rows] = await pool.query(
      `SELECT * FROM payment_transaction WHERE transaction_id=? LIMIT 1`,
      [transaction_id]
    );

    return rows.length ? rows[0] : null;
  }

  /**
   * Finalize payment
   * - Updates status
   * - Stores PROVIDER transaction ID (LP...)
   * - Activates subscriptions
   * - Idempotent & safe
   */
  static async finalizeTransaction(
    transaction_id,
    payment_status,
    provider_transaction_id = null
  ) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1️⃣ Lock transaction row
      const [txRows] = await conn.query(`
        SELECT user_id, payment_status
        FROM payment_transaction
        WHERE transaction_id=?
        FOR UPDATE
      `, [transaction_id]);

      if (!txRows.length) {
        throw new Error("Transaction not found");
      }

      // Already finalized → STOP
      if (txRows[0].payment_status === "success" ||
          txRows[0].payment_status === "failed") {
        await conn.commit();
        return;
      }

      const user_id = txRows[0].user_id;

      // 2️⃣ Update transaction
      await conn.query(`
        UPDATE payment_transaction
        SET
          payment_status=?,
          provider_transaction_id=?,
          paid_at=IF(?='success', NOW(), NULL)
        WHERE transaction_id=?
      `, [
        payment_status,
        provider_transaction_id,
        payment_status,
        transaction_id
      ]);

      // 3️⃣ Activate subscriptions ONLY on success
      if (payment_status === "success") {

        const [courses] = await conn.query(`
          SELECT course_id
          FROM payment_transaction_courses
          WHERE transaction_id=?
        `, [transaction_id]);

        for (const { course_id } of courses) {
            const [existing] = await conn.query(`
              SELECT id
              FROM user_course_subscription
              WHERE user_id=? AND course_id=?
              LIMIT 1
            `, [user_id, course_id]);

            if (!existing.length) {
              // Insert new subscription
              await conn.query(`
                INSERT INTO user_course_subscription
                (user_id, course_id, subscribed_at, status)
                VALUES (?, ?, NOW(), 'active')
              `, [user_id, course_id]);
            } else {
              // Update existing subscription safely
              await conn.query(`
                UPDATE user_course_subscription
                SET status='active', subscribed_at=NOW()
                WHERE id=?
              `, [existing[0].id]);
            }
          }


        // 4️⃣ Update user overall subscription status
        const [[{ activeCount }]] = await conn.query(`
          SELECT COUNT(*) AS activeCount
          FROM user_course_subscription
          WHERE user_id=? AND status='active'
        `, [user_id]);

        await conn.query(`
          UPDATE user
          SET u_status=?
          WHERE u_user_id=?
        `, [activeCount > 0 ? "subscribed" : "inactive", user_id]);
      }

      await conn.commit();

    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  /**
   * Fetch all transactions with their courses
   */
  static async getAll() {
    const [transactions] = await pool.query(`
      SELECT
        pt.*,
        u.first_name,
        u.last_name
      FROM payment_transaction pt
      JOIN user u ON pt.user_id = u.u_user_id
      ORDER BY pt.created_at DESC
    `);

    for (const tx of transactions) {
      const [courses] = await pool.query(`
        SELECT c.*
        FROM payment_transaction_courses ptc
        JOIN courses c ON ptc.course_id = c.id
        WHERE ptc.transaction_id=?
      `, [tx.transaction_id]);

      tx.courses = courses;
    }

    return transactions;
  }
}
