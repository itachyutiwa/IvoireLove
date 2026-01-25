// PostgreSQL Schema pour les tickets de support
export const createSupportTicketTable = async (pool) => {
  const query = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
  `;

  await pool.query(query);
};

export const SupportTicketModel = {
  async create(pool, userId, subject, body) {
    const query = `
      INSERT INTO support_tickets (user_id, subject, body, status)
      VALUES ($1, $2, $3, 'open')
      RETURNING *
    `;
    const result = await pool.query(query, [userId, subject, body]);
    return result.rows.length ? this.mapToTicket(result.rows[0]) : null;
  },

  async listByUser(pool, userId) {
    const query = `
      SELECT * FROM support_tickets
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map((r) => this.mapToTicket(r));
  },

  mapToTicket(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      subject: row.subject,
      body: row.body,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString() || row.created_at.toISOString(),
    };
  },
};

