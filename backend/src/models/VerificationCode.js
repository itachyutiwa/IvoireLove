// Modèle pour les codes de vérification
export const createVerificationCodeTable = async (pool) => {
  // Créer la table si elle n'existe pas
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS verification_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255),
      phone VARCHAR(20),
      code VARCHAR(6) NOT NULL,
      type VARCHAR(20) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(createTableQuery);

  // Vérifier si la contrainte existe et la supprimer si nécessaire
  try {
    const checkConstraintQuery = `
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'verification_codes' 
      AND constraint_type = 'CHECK' 
      AND constraint_name LIKE '%type%';
    `;

    const constraintResult = await pool.query(checkConstraintQuery);
    
    // Supprimer l'ancienne contrainte si elle existe
    if (constraintResult.rows.length > 0) {
      for (const row of constraintResult.rows) {
        const dropConstraintQuery = `ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS ${row.constraint_name};`;
        await pool.query(dropConstraintQuery);
      }
    }

    // Ajouter la nouvelle contrainte avec tous les types
    const addConstraintQuery = `
      ALTER TABLE verification_codes 
      ADD CONSTRAINT verification_codes_type_check 
      CHECK (type IN ('email', 'phone', 'registration', 'password_reset'));
    `;

    await pool.query(addConstraintQuery);
  } catch (error) {
    // Si la contrainte existe déjà avec le bon format, on continue
    if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
      // Vérifier si la contrainte actuelle inclut password_reset
      const checkCurrentConstraint = await pool.query(`
        SELECT check_clause 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'verification_codes_type_check';
      `);
      
      if (checkCurrentConstraint.rows.length > 0) {
        const constraintClause = checkCurrentConstraint.rows[0].check_clause;
        if (!constraintClause.includes('password_reset')) {
          // Supprimer et recréer la contrainte
          await pool.query(`ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_type_check;`);
          await pool.query(`
            ALTER TABLE verification_codes 
            ADD CONSTRAINT verification_codes_type_check 
            CHECK (type IN ('email', 'phone', 'registration', 'password_reset'));
          `);
        }
      }
    } else {
      throw error;
    }
  }

  // Créer les index
  const createIndexesQuery = `
    CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
  `;

  await pool.query(createIndexesQuery);
};

export const VerificationCodeModel = {
  async create(pool, { email, phone, code, type = 'registration' }) {
    // Le code expire dans 10 minutes (ou 15 minutes pour password_reset)
    const expiresAt = new Date();
    const expirationMinutes = type === 'password_reset' ? 15 : 10;
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    const query = `
      INSERT INTO verification_codes (email, phone, code, type, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [email || null, phone || null, code, type, expiresAt]);
    return result.rows[0];
  },

  async findByCode(pool, code, email = null, phone = null) {
    let query = 'SELECT * FROM verification_codes WHERE code = $1 AND verified = FALSE AND expires_at > CURRENT_TIMESTAMP';
    const params = [code];

    if (email) {
      query += ' AND email = $2';
      params.push(email);
    } else if (phone) {
      query += ' AND phone = $2';
      params.push(phone);
    }

    query += ' ORDER BY created_at DESC LIMIT 1';

    const result = await pool.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  },

  async markAsVerified(pool, codeId) {
    const query = 'UPDATE verification_codes SET verified = TRUE WHERE id = $1';
    await pool.query(query, [codeId]);
  },

  async cleanupExpired(pool) {
    // Supprimer les codes expirés de plus de 24h
    const query = 'DELETE FROM verification_codes WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL \'24 hours\'';
    await pool.query(query);
  },
};

