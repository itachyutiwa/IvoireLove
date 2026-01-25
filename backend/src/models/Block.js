// PostgreSQL Schema pour les blocages
export const createBlockTable = async (pool) => {
  const query = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS blocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocker_id, blocked_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_user_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_created ON blocks(created_at DESC);
  `;

  await pool.query(query);
};

export const BlockModel = {
  async create(pool, blockerId, blockedUserId) {
    if (!blockerId || !blockedUserId) throw new Error('blockerId et blockedUserId requis');
    if (blockerId === blockedUserId) throw new Error('Impossible de se bloquer soi-même');

    const query = `
      INSERT INTO blocks (blocker_id, blocked_user_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_user_id) DO NOTHING
      RETURNING *
    `;
    const result = await pool.query(query, [blockerId, blockedUserId]);
    if (result.rows.length === 0) {
      // Déjà bloqué
      const existing = await pool.query(
        'SELECT * FROM blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
        [blockerId, blockedUserId]
      );
      return existing.rows.length ? this.mapToBlock(existing.rows[0]) : null;
    }
    return this.mapToBlock(result.rows[0]);
  },

  async remove(pool, blockerId, blockedUserId) {
    const query = `
      DELETE FROM blocks
      WHERE blocker_id = $1 AND blocked_user_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [blockerId, blockedUserId]);
    return result.rows.length > 0 ? this.mapToBlock(result.rows[0]) : null;
  },

  // Utilisateurs à exclure: ceux que j'ai bloqués OU qui m'ont bloqué
  async getExcludedUserIds(pool, userId) {
    const query = `
      SELECT blocked_user_id AS user_id FROM blocks WHERE blocker_id = $1
      UNION
      SELECT blocker_id AS user_id FROM blocks WHERE blocked_user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows.map((r) => r.user_id);
  },

  async isBlockedEitherWay(pool, userA, userB) {
    const query = `
      SELECT 1 FROM blocks
      WHERE (blocker_id = $1 AND blocked_user_id = $2)
         OR (blocker_id = $2 AND blocked_user_id = $1)
      LIMIT 1
    `;
    const result = await pool.query(query, [userA, userB]);
    return result.rows.length > 0;
  },

  mapToBlock(row) {
    if (!row) return null;
    return {
      id: row.id,
      blockerId: row.blocker_id,
      blockedUserId: row.blocked_user_id,
      createdAt: row.created_at.toISOString(),
    };
  },
};

