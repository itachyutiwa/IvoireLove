// PostgreSQL Schema pour les swipes
export const createSwipeTable = async (pool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS swipes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL CHECK (action IN ('like', 'dislike', 'superlike')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, target_user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_swipes_user ON swipes(user_id);
    CREATE INDEX IF NOT EXISTS idx_swipes_target ON swipes(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_swipes_action ON swipes(action);
  `;

  await pool.query(query);
};

export const SwipeModel = {
  async create(pool, userId, targetUserId, action) {
    const query = `
      INSERT INTO swipes (user_id, target_user_id, action)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, target_user_id) 
      DO UPDATE SET action = $3, created_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [userId, targetUserId, action]);
    return this.mapToSwipe(result.rows[0]);
  },

  async hasSwiped(pool, userId, targetUserId) {
    const query = 'SELECT action FROM swipes WHERE user_id = $1 AND target_user_id = $2';
    const result = await pool.query(query, [userId, targetUserId]);
    return result.rows.length > 0 ? result.rows[0].action : null;
  },

  async checkMatch(pool, user1Id, user2Id) {
    const query = `
      SELECT user_id, action FROM swipes
      WHERE (user_id = $1 AND target_user_id = $2 AND action IN ('like', 'superlike'))
         OR (user_id = $2 AND target_user_id = $1 AND action IN ('like', 'superlike'))
    `;

    const result = await pool.query(query, [user1Id, user2Id]);
    
    if (result.rows.length < 2) {
      return false;
    }

    // Vérifier si les deux utilisateurs se sont likés
    const user1Liked = result.rows.some(
      (row) => row.user_id === user1Id && ['like', 'superlike'].includes(row.action)
    );
    const user2Liked = result.rows.some(
      (row) => row.user_id === user2Id && ['like', 'superlike'].includes(row.action)
    );

    return user1Liked && user2Liked;
  },

  mapToSwipe(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      targetUserId: row.target_user_id,
      action: row.action,
      timestamp: row.created_at.toISOString(),
    };
  },
};

