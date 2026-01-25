// PostgreSQL Schema pour les matchs
export const createMatchTable = async (pool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);
    CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);
  `;

  await pool.query(query);
};

export const MatchModel = {
  async create(pool, user1Id, user2Id) {
    // S'assurer que user1_id < user2_id pour éviter les doublons
    const [id1, id2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    const query = `
      INSERT INTO matches (user1_id, user2_id)
      VALUES ($1, $2)
      ON CONFLICT (user1_id, user2_id) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(query, [id1, id2]);
    return result.rows.length > 0 ? this.mapToMatch(result.rows[0]) : null;
  },

  async findByUserId(pool, userId) {
    const query = `
      SELECT m.*, 
        CASE WHEN m.user1_id = $1 THEN u2.* ELSE u1.* END as other_user
      FROM matches m
      LEFT JOIN users u1 ON m.user1_id = u1.id
      LEFT JOIN users u2 ON m.user2_id = u2.id
      WHERE m.user1_id = $1 OR m.user2_id = $1
      ORDER BY m.last_activity DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map((row) => ({
      id: row.id,
      users: [row.user1_id, row.user2_id],
      createdAt: row.created_at.toISOString(),
      lastActivity: row.last_activity?.toISOString(),
    }));
  },

  async exists(pool, user1Id, user2Id) {
    const [id1, id2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
    const query = 'SELECT id FROM matches WHERE user1_id = $1 AND user2_id = $2';
    const result = await pool.query(query, [id1, id2]);
    return result.rows.length > 0;
  },

  mapToMatch(row) {
    if (!row) return null;
    return {
      id: row.id,
      users: [row.user1_id, row.user2_id],
      createdAt: row.created_at.toISOString(),
      lastActivity: row.last_activity?.toISOString(),
    };
  },
};

