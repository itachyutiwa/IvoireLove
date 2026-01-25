// PostgreSQL Schema pour les utilisateurs
export const createUserTable = async (pool) => {
  const query = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
      bio TEXT,
      photos TEXT[] DEFAULT '{}',
      location_city VARCHAR(100),
      location_country VARCHAR(100),
      location_region VARCHAR(100),
      location_commune VARCHAR(100),
      location_quartier VARCHAR(100),
      location_lat DECIMAL(10, 8),
      location_lng DECIMAL(11, 8),
      is_online BOOLEAN DEFAULT FALSE,
      preferences_age_min INTEGER DEFAULT 18,
      preferences_age_max INTEGER DEFAULT 99,
      preferences_max_distance INTEGER DEFAULT 50,
      preferences_interested_in TEXT[] DEFAULT '{}',
      verified BOOLEAN DEFAULT FALSE,
      verification_status VARCHAR(20) DEFAULT 'unverified',
      verification_photo_url TEXT,
      verified_at TIMESTAMP,
      privacy_hide_last_active BOOLEAN DEFAULT FALSE,
      privacy_hide_online BOOLEAN DEFAULT FALSE,
      privacy_incognito BOOLEAN DEFAULT FALSE,
      privacy_share_phone VARCHAR(30) DEFAULT 'afterMatch',
      device_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_lat, location_lng);
    CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
  `;

  await pool.query(query);

  // Migration : Ajouter les nouvelles colonnes si elles n'existent pas
  // IMPORTANT: Cette migration doit s'exécuter AVANT toute tentative de création d'index
  try {
    // Vérifier si la table existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (tableExists.rows[0].exists) {
      // La table existe, ajouter les colonnes manquantes
      await pool.query(`
        DO $$ 
        BEGIN
          -- Ajouter location_region si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='users' AND column_name='location_region') THEN
            ALTER TABLE users ADD COLUMN location_region VARCHAR(100);
          END IF;

          -- Ajouter location_commune si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='users' AND column_name='location_commune') THEN
            ALTER TABLE users ADD COLUMN location_commune VARCHAR(100);
          END IF;

          -- Ajouter location_quartier si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='users' AND column_name='location_quartier') THEN
            ALTER TABLE users ADD COLUMN location_quartier VARCHAR(100);
          END IF;

          -- Ajouter is_online si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name='users' AND column_name='is_online') THEN
            ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
          END IF;

          -- Ajouter verification_status si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='verification_status') THEN
            ALTER TABLE users ADD COLUMN verification_status VARCHAR(20) DEFAULT 'unverified';
          END IF;

          -- Ajouter verification_photo_url si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='verification_photo_url') THEN
            ALTER TABLE users ADD COLUMN verification_photo_url TEXT;
          END IF;

          -- Ajouter verified_at si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='verified_at') THEN
            ALTER TABLE users ADD COLUMN verified_at TIMESTAMP;
          END IF;

          -- Ajouter privacy_hide_last_active si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='privacy_hide_last_active') THEN
            ALTER TABLE users ADD COLUMN privacy_hide_last_active BOOLEAN DEFAULT FALSE;
          END IF;

          -- Ajouter privacy_hide_online si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='privacy_hide_online') THEN
            ALTER TABLE users ADD COLUMN privacy_hide_online BOOLEAN DEFAULT FALSE;
          END IF;

          -- Ajouter privacy_incognito si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='privacy_incognito') THEN
            ALTER TABLE users ADD COLUMN privacy_incognito BOOLEAN DEFAULT FALSE;
          END IF;

          -- Ajouter privacy_share_phone si elle n'existe pas
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                         WHERE table_name='users' AND column_name='privacy_share_phone') THEN
            ALTER TABLE users ADD COLUMN privacy_share_phone VARCHAR(30) DEFAULT 'afterMatch';
          END IF;
        END $$;
      `);

      // Créer l'index is_online après avoir ajouté la colonne (si elle existe maintenant)
      await pool.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name='users' AND column_name='is_online') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes 
                           WHERE tablename='users' AND indexname='idx_users_online') THEN
              CREATE INDEX idx_users_online ON users(is_online);
            END IF;
          END IF;
        END $$;
      `);
    }
  } catch (error) {
    console.error('Migration error:', error.message);
    // Ne pas bloquer le démarrage si la migration échoue
    // Les colonnes seront créées lors de la prochaine tentative
  }
};

// Valeurs de localisation par défaut pour les utilisateurs sans ville/commune/quartier
const DEFAULT_LOCATIONS = [
  {
    city: 'Abidjan',
    region: 'Lagunes',
    country: "Côte d'Ivoire",
    communes: ['Cocody', 'Marcory', 'Yopougon', 'Treichville', 'Koumassi', 'Plateau'],
  },
  {
    city: 'Yamoussoukro',
    region: 'Lacs',
    country: "Côte d'Ivoire",
    communes: ['Yamoussoukro-Centre', 'N\'Gattakro', 'Morofé'],
  },
  {
    city: 'Bouaké',
    region: 'Vallée du Bandama',
    country: "Côte d'Ivoire",
    communes: ['Bouaké-Centre', 'Brobo', 'Sakassou'],
  },
  {
    city: 'Daloa',
    region: 'Haut-Sassandra',
    country: "Côte d'Ivoire",
    communes: ['Daloa-Centre', 'Issia', 'Vavoua'],
  },
  {
    city: 'San-Pédro',
    region: 'Bas-Sassandra',
    country: "Côte d'Ivoire",
    communes: ['San-Pédro-Centre', 'Sassandra', 'Tabou'],
  },
];

// Quelques quartiers génériques par défaut
const DEFAULT_QUARTIERS = [
  'Centre-ville',
  'Quartier Résidentiel',
  'Quartier Nord',
  'Quartier Sud',
  'Quartier Est',
  'Quartier Ouest',
];

// Génère une localisation par défaut stable à partir de l'id (ou email) de l'utilisateur
const getDefaultLocation = (userKey) => {
  if (!userKey) {
    // Fallback simple si aucune clé n'est disponible
    const base = DEFAULT_LOCATIONS[0];
    return {
      city: base.city,
      region: base.region,
      country: base.country,
      commune: base.communes[0],
      quartier: DEFAULT_QUARTIERS[0],
    };
  }

  const keyStr = String(userKey);
  let hash = 0;
  for (let i = 0; i < keyStr.length; i++) {
    // Simple hash déterministe
    hash = (hash + keyStr.charCodeAt(i) * (i + 1)) >>> 0;
  }

  const cityIndex = hash % DEFAULT_LOCATIONS.length;
  const cityData = DEFAULT_LOCATIONS[cityIndex];
  const communeIndex = hash % cityData.communes.length;
  const quartierIndex = hash % DEFAULT_QUARTIERS.length;

  return {
    city: cityData.city,
    region: cityData.region,
    country: cityData.country,
    commune: cityData.communes[communeIndex],
    quartier: DEFAULT_QUARTIERS[quartierIndex],
  };
};

export const UserModel = {
  async create(pool, userData) {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      location,
    } = userData;

    // Construire la requête avec les champs de localisation si fournis
    const locationFields = location && (location.country || location.region || location.city || location.commune || location.quartier)
      ? ', location_country, location_region, location_city, location_commune, location_quartier'
      : '';
    
    const locationValues = location && (location.country || location.region || location.city || location.commune || location.quartier)
      ? ', $9, $10, $11, $12, $13'
      : '';

    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name,
        date_of_birth, gender, phone, preferences_interested_in${locationFields}
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8${locationValues})
      RETURNING *
    `;

    const interestedIn = gender === 'male' ? ['female'] : ['male'];

    const params = [
      email,
      passwordHash,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone || null,
      interestedIn,
    ];

    // Ajouter les valeurs de localisation si fournies
    if (location && (location.country || location.region || location.city || location.commune || location.quartier)) {
      params.push(
        location.country || null,
        location.region || null,
        location.city || null,
        location.commune || null,
        location.quartier || null
      );
    }

    const result = await pool.query(query, params);

    return this.mapToUser(result.rows[0]);
  },

  async findByEmail(pool, email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  },

  async findById(pool, id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  },

  async update(pool, id, updates) {
    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      dateOfBirth: 'date_of_birth',
      bio: 'bio',
      photos: 'photos',
      phone: 'phone',
      verified: 'verified',
      verificationStatus: 'verification_status',
      verificationPhotoUrl: 'verification_photo_url',
      verifiedAt: 'verified_at',
      location: null, // Géré séparément
      preferences: null, // Géré séparément
      privacy: null, // Géré séparément
    };

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach((key) => {
      if (key === 'location' && updates.location) {
        fields.push(`location_city = $${paramCount}`);
        values.push(updates.location.city || null);
        paramCount++;
        fields.push(`location_country = $${paramCount}`);
        values.push(updates.location.country || null);
        paramCount++;
        fields.push(`location_region = $${paramCount}`);
        values.push(updates.location.region || null);
        paramCount++;
        fields.push(`location_commune = $${paramCount}`);
        values.push(updates.location.commune || null);
        paramCount++;
        fields.push(`location_quartier = $${paramCount}`);
        values.push(updates.location.quartier || null);
        paramCount++;
        if (updates.location.coordinates) {
          fields.push(`location_lat = $${paramCount}`);
          values.push(updates.location.coordinates.lat || null);
          paramCount++;
          fields.push(`location_lng = $${paramCount}`);
          values.push(updates.location.coordinates.lng || null);
          paramCount++;
        }
      } else if (key === 'preferences' && updates.preferences) {
        fields.push(`preferences_age_min = $${paramCount}`);
        values.push(updates.preferences.ageRange?.min || null);
        paramCount++;
        fields.push(`preferences_age_max = $${paramCount}`);
        values.push(updates.preferences.ageRange?.max || null);
        paramCount++;
        fields.push(`preferences_max_distance = $${paramCount}`);
        values.push(updates.preferences.maxDistance || null);
        paramCount++;
        fields.push(`preferences_interested_in = $${paramCount}`);
        values.push(updates.preferences.interestedIn || []);
        paramCount++;
      } else if (key === 'privacy' && updates.privacy) {
        fields.push(`privacy_hide_last_active = $${paramCount}`);
        values.push(updates.privacy.hideLastActive === true);
        paramCount++;
        fields.push(`privacy_hide_online = $${paramCount}`);
        values.push(updates.privacy.hideOnline === true);
        paramCount++;
        fields.push(`privacy_incognito = $${paramCount}`);
        values.push(updates.privacy.incognito === true);
        paramCount++;
        fields.push(`privacy_share_phone = $${paramCount}`);
        values.push(updates.privacy.sharePhone || 'afterMatch');
        paramCount++;
      } else if (fieldMap[key]) {
        const dbKey = fieldMap[key];
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return await this.findById(pool, id);
    }

    values.push(id);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? this.mapToUser(result.rows[0]) : null;
  },

  async getDiscoveries(pool, userId, filters = {}) {
    const user = await this.findById(pool, userId);
    if (!user) return [];

    const {
      ageMin = user.preferences.ageRange.min,
      ageMax = user.preferences.ageRange.max,
      maxDistance = user.preferences.maxDistance,
      interestedIn = user.preferences.interestedIn,
      region,
      commune,
      city,
      quartier,
      centerLat,
      centerLng,
      radiusKm,
    } = filters;

    // Calculer la date de naissance min/max pour l'âge
    const today = new Date();
    const maxBirthDate = new Date(
      today.getFullYear() - ageMin,
      today.getMonth(),
      today.getDate()
    );
    const minBirthDate = new Date(
      today.getFullYear() - ageMax - 1,
      today.getMonth(),
      today.getDate()
    );

    // Construire la requête avec les filtres géographiques
    const params = [userId, interestedIn, minBirthDate, maxBirthDate];
    let paramCount = 5;
    
    let query = `
      SELECT *`;
    
    // Ajouter le calcul de distance si des coordonnées sont fournies
    if (centerLat && centerLng) {
      params.push(centerLat, centerLng);
      query += `,
        CASE 
          WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL 
          THEN (
            6371 * acos(
              cos(radians($${paramCount})) * 
              cos(radians(location_lat)) * 
              cos(radians(location_lng) - radians($${paramCount + 1})) + 
              sin(radians($${paramCount})) * 
              sin(radians(location_lat))
            )
          )
          ELSE NULL
        END AS distance_km`;
      paramCount += 2;
    }
    
    query += `
      FROM users
      WHERE id != $1
        AND (privacy_incognito IS NOT TRUE)
        AND gender = ANY($2::text[])
        AND date_of_birth BETWEEN $3 AND $4
    `;

    // Filtres géographiques
    // Ville : rechercher sur location_city OU location_region
    if (city || region) {
      const cityRegionConditions = [];
      query += ' AND (';
      if (city) {
        cityRegionConditions.push(`location_city = $${paramCount}`);
        params.push(city);
        paramCount++;
      }
      if (region) {
        cityRegionConditions.push(`location_region = $${paramCount}`);
        params.push(region);
        paramCount++;
      }
      query += cityRegionConditions.join(' OR ') + ')';
    }

    // Commune : rechercher sur location_commune OU location_quartier
    if (commune || quartier) {
      const communeQuartierConditions = [];
      query += ' AND (';
      if (commune) {
        communeQuartierConditions.push(`location_commune = $${paramCount}`);
        params.push(commune);
        paramCount++;
      }
      if (quartier) {
        communeQuartierConditions.push(`location_quartier = $${paramCount}`);
        params.push(quartier);
        paramCount++;
      }
      query += communeQuartierConditions.join(' OR ') + ')';
    }

    // Filtre par distance si des coordonnées sont fournies
    if (centerLat && centerLng && radiusKm) {
      query += ` AND location_lat IS NOT NULL AND location_lng IS NOT NULL`;
    }

    // Ordre : en ligne d'abord, puis par distance si disponible, sinon par dernière activité
    // Limite augmentée à 100 pour la recherche avancée
    const limit = filters.limit || 50;
    params.push(limit);
    if (centerLat && centerLng) {
      query += ` ORDER BY is_online DESC, distance_km ASC NULLS LAST, last_active DESC LIMIT $${paramCount}`;
    } else {
      query += ` ORDER BY is_online DESC, last_active DESC LIMIT $${paramCount}`;
    }

    const result = await pool.query(query, params);

    // Filtrer par distance si nécessaire
    let filteredRows = result.rows;
    if (centerLat && centerLng && radiusKm) {
      filteredRows = result.rows.filter((row) => {
        if (!row.distance_km) return false;
        return parseFloat(row.distance_km) <= radiusKm;
      });
    }

    return filteredRows.map((row) => this.mapToUser(row));
  },

  mapToUser(row) {
    if (!row) return null;

    // Appliquer des valeurs par défaut pour ville / commune / quartier si manquantes
    let city = row.location_city;
    let country = row.location_country;
    let region = row.location_region;
    let commune = row.location_commune;
    let quartier = row.location_quartier;

    if (!city || !commune || !quartier) {
      const defaults = getDefaultLocation(row.id || row.email);
      city = city || defaults.city;
      country = country || defaults.country;
      region = region || defaults.region;
      commune = commune || defaults.commune;
      quartier = quartier || defaults.quartier;
    }

    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth.toISOString().split('T')[0],
      gender: row.gender,
      bio: row.bio,
      photos: row.photos || [],
      location: {
        city,
        country,
        region,
        commune,
        quartier,
        coordinates: row.location_lat
          ? {
              lat: parseFloat(row.location_lat),
              lng: parseFloat(row.location_lng),
            }
          : undefined,
      },
      isOnline: row.is_online || false,
      preferences: {
        ageRange: {
          min: row.preferences_age_min || 18,
          max: row.preferences_age_max || 99,
        },
        maxDistance: row.preferences_max_distance || 50,
        interestedIn: row.preferences_interested_in || [],
      },
      verified: row.verification_status === 'verified' || row.verified === true,
      verificationStatus: row.verification_status || 'unverified',
      verificationPhotoUrl: row.verification_photo_url || null,
      verifiedAt: row.verified_at ? row.verified_at.toISOString() : null,
      privacy: {
        hideLastActive: row.privacy_hide_last_active === true,
        hideOnline: row.privacy_hide_online === true,
        incognito: row.privacy_incognito === true,
        sharePhone: row.privacy_share_phone || 'afterMatch',
      },
      createdAt: row.created_at.toISOString(),
      lastActive: row.last_active.toISOString(),
    };
  },
};

