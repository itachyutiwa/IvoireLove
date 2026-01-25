// PostgreSQL Schema pour les paiements
export const createPaymentTable = async (pool) => {
  const query = `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_type VARCHAR(20) NOT NULL,
      payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('MTN', 'ORANGE', 'MOOV', 'WAVE', 'CARD')),
      reference VARCHAR(100) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
      confirmed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, reference, payment_method)
    );

    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
  `;

  await pool.query(query);
};

export const PaymentModel = {
  async create(pool, userId, planType, paymentMethod, reference, amount) {
    const query = `
      INSERT INTO payments (user_id, plan_type, payment_method, reference, amount, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      planType,
      paymentMethod,
      reference,
      amount,
    ]);

    return this.mapToPayment(result.rows[0]);
  },

  async findByReference(pool, reference, paymentMethod) {
    const query = `
      SELECT * FROM payments
      WHERE reference = $1 AND payment_method = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [reference, paymentMethod]);
    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  },

  async findById(pool, paymentId) {
    const query = `
      SELECT * FROM payments
      WHERE id = $1
    `;

    const result = await pool.query(query, [paymentId]);
    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  },

  async confirm(pool, paymentId) {
    const query = `
      UPDATE payments
      SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [paymentId]);
    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  },

  async fail(pool, paymentId) {
    const query = `
      UPDATE payments
      SET status = 'failed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [paymentId]);
    return result.rows.length > 0 ? this.mapToPayment(result.rows[0]) : null;
  },

  mapToPayment(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      planType: row.plan_type,
      paymentMethod: row.payment_method,
      reference: row.reference,
      amount: row.amount,
      status: row.status,
      confirmedAt: row.confirmed_at?.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  },
};

