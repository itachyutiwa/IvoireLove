// PostgreSQL Schema pour les abonnements
export const createSubscriptionTable = async (pool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('trial', 'day', 'week', 'month', '3months', '6months', 'year')),
      start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_date TIMESTAMP NOT NULL,
      message_limit INTEGER NOT NULL DEFAULT -1,
      messages_used INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      auto_renew BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
  `;

  await pool.query(query);
};

const SUBSCRIPTION_DURATIONS = {
  trial: 1, // 1 jour
  day: 1,
  week: 7,
  month: 30,
  '3months': 90,
  '6months': 180,
  year: 365,
};

const SUBSCRIPTION_MESSAGE_LIMITS = {
  trial: 3,
  day: -1, // illimité
  week: -1,
  month: -1,
  '3months': -1,
  '6months': -1,
  year: -1,
};

export const SubscriptionModel = {
  async createTrial(pool, userId) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DURATIONS.trial);

    const query = `
      INSERT INTO subscriptions (user_id, type, start_date, end_date, message_limit, messages_used, is_active)
      VALUES ($1, 'trial', $2, $3, $4, 0, TRUE)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      startDate,
      endDate,
      SUBSCRIPTION_MESSAGE_LIMITS.trial,
    ]);

    return this.mapToSubscription(result.rows[0]);
  },

  async create(pool, userId, type) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION_DURATIONS[type]);

    // Désactiver l'ancien abonnement
    await pool.query(
      'UPDATE subscriptions SET is_active = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );

    const query = `
      INSERT INTO subscriptions (user_id, type, start_date, end_date, message_limit, messages_used, is_active)
      VALUES ($1, $2, $3, $4, $5, 0, TRUE)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      type,
      startDate,
      endDate,
      SUBSCRIPTION_MESSAGE_LIMITS[type],
    ]);

    return this.mapToSubscription(result.rows[0]);
  },

  async findByUserId(pool, userId) {
    const query = `
      SELECT * FROM subscriptions
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapToSubscription(result.rows[0]) : null;
  },

  async incrementMessagesUsed(pool, userId) {
    const query = `
      UPDATE subscriptions
      SET messages_used = messages_used + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_active = TRUE
      RETURNING *
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? this.mapToSubscription(result.rows[0]) : null;
  },

  async checkLimit(pool, userId) {
    // En développement : toujours autoriser l'envoi de messages (illimité)
    if (process.env.NODE_ENV === 'development') {
      return { canSend: true, remaining: -1 };
    }
    
    const subscription = await this.findByUserId(pool, userId);
    
    if (!subscription) {
      return { canSend: false, remaining: 0 };
    }

    // Vérifier si l'abonnement est expiré
    if (new Date(subscription.endDate) < new Date()) {
      await pool.query(
        'UPDATE subscriptions SET is_active = FALSE WHERE id = $1',
        [subscription.id]
      );
      return { canSend: false, remaining: 0 };
    }

    // Illimité
    if (subscription.messageLimit === -1) {
      return { canSend: true, remaining: -1 };
    }

    const remaining = subscription.messageLimit - subscription.messagesUsed;
    return {
      canSend: remaining > 0 && subscription.isActive,
      remaining,
    };
  },

  mapToSubscription(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      startDate: row.start_date.toISOString(),
      endDate: row.end_date.toISOString(),
      messageLimit: row.message_limit,
      messagesUsed: row.messages_used,
      isActive: row.is_active,
      autoRenew: row.auto_renew,
    };
  },
};

