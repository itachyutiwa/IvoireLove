// PostgreSQL Schema pour les signalements
export const createReportTable = async (pool) => {
  const query = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id VARCHAR(255),
      message_id VARCHAR(255),
      reason VARCHAR(50) NOT NULL,
      details TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
    CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
  `;

  await pool.query(query);
};

export const ReportModel = {
  async create(pool, data) {
    const {
      reporterId,
      reportedUserId,
      conversationId = null,
      messageId = null,
      reason,
      details = null,
    } = data || {};

    if (!reporterId || !reportedUserId) throw new Error('reporterId et reportedUserId requis');
    if (!reason) throw new Error('reason requis');

    const query = `
      INSERT INTO reports (reporter_id, reported_user_id, conversation_id, message_id, reason, details, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'open')
      RETURNING *
    `;
    const result = await pool.query(query, [
      reporterId,
      reportedUserId,
      conversationId,
      messageId,
      reason,
      details,
    ]);
    return result.rows.length > 0 ? this.mapToReport(result.rows[0]) : null;
  },

  mapToReport(row) {
    if (!row) return null;
    return {
      id: row.id,
      reporterId: row.reporter_id,
      reportedUserId: row.reported_user_id,
      conversationId: row.conversation_id,
      messageId: row.message_id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    };
  },
};

