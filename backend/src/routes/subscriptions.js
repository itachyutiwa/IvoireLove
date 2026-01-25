import express from 'express';
import { pgPool } from '../config/database.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';

const router = express.Router();

// Plans d'abonnement disponibles (prix en FCFA)
const SUBSCRIPTION_PLANS = [
  {
    type: 'day',
    name: 'Pass Jour',
    duration: 1,
    price: 1000,
    messageLimit: -1,
    features: ['Messages illimités', '24h d\'accès'],
  },
  {
    type: 'week',
    name: 'Pass Semaine',
    duration: 7,
    price: 3000,
    messageLimit: -1,
    features: ['Messages illimités', '7 jours d\'accès'],
  },
  {
    type: 'month',
    name: 'Pass Mois',
    duration: 30,
    price: 10000,
    messageLimit: -1,
    features: ['Messages illimités', '30 jours d\'accès', 'Priorité dans les résultats'],
  },
  {
    type: '3months',
    name: 'Pass 3 Mois',
    duration: 90,
    price: 25000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '90 jours d\'accès',
      'Priorité dans les résultats',
      'Badge Premium',
    ],
  },
  {
    type: '6months',
    name: 'Pass 6 Mois',
    duration: 180,
    price: 45000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '180 jours d\'accès',
      'Priorité dans les résultats',
      'Badge Premium',
      'Super Likes illimités',
    ],
  },
  {
    type: 'year',
    name: 'Pass Annuel',
    duration: 365,
    price: 80000,
    messageLimit: -1,
    features: [
      'Messages illimités',
      '365 jours d\'accès',
      'Priorité maximale',
      'Badge Premium',
      'Super Likes illimités',
      'Voir qui vous a liké',
    ],
  },
];

// Numéros de paiement pour les opérateurs mobiles
const PAYMENT_NUMBERS = {
  MTN: '22500429098',
  ORANGE: '2250747389778',
  MOOV: '2250170948328',
  WAVE: '2250747389778',
};

export { PAYMENT_NUMBERS };

const getEntitlements = (subscriptionType) => {
  const isPremium = ['month', '3months', '6months', 'year'].includes(subscriptionType);
  return {
    canBoost: isPremium,
    canTravelMode: isPremium,
    canSeeLikes: subscriptionType === 'year',
  };
};

// Obtenir les plans disponibles
router.get('/plans', authenticateToken, async (req, res) => {
  res.json(SUBSCRIPTION_PLANS);
});

// Obtenir l'abonnement actuel
router.get('/current', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'email de l'utilisateur pour vérifier s'il s'agit de l'utilisateur de test
    const userResult = await pgPool.query('SELECT email FROM users WHERE id = $1', [req.user.userId]);
    const userEmail = userResult.rows[0]?.email;
    
    let subscription = await SubscriptionModel.findByUserId(pgPool, req.user.userId);
    if (!subscription) {
      // En développement : créer un Pass Mois (sauf pour l'utilisateur de test qui a Pass Annuel)
      const subscriptionType = userEmail === 'test@example.com' ? 'year' : 'month';
      subscription = await SubscriptionModel.create(pgPool, req.user.userId, subscriptionType);
    }
    res.json(subscription);
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'abonnement' });
  }
});

// Activer un boost (MVP)
router.post('/boost', authenticateToken, async (req, res) => {
  try {
    const subscription = await SubscriptionModel.findByUserId(pgPool, req.user.userId);
    if (!subscription || subscription.isActive !== true) {
      return res.status(403).json({ message: 'Abonnement requis' });
    }

    const entitlements = getEntitlements(subscription.type);
    if (!entitlements.canBoost) {
      return res.status(403).json({ message: 'Boost réservé aux abonnements Premium' });
    }

    // Boost 30 minutes (MVP)
    const result = await pgPool.query(
      `UPDATE users
       SET boosted_until = CURRENT_TIMESTAMP + INTERVAL '30 minutes'
       WHERE id = $1
       RETURNING boosted_until`,
      [req.user.userId]
    );

    res.json({
      boostedUntil: result.rows[0]?.boosted_until ? result.rows[0].boosted_until.toISOString() : null,
      durationMinutes: 30,
    });
  } catch (error) {
    console.error('Boost error:', error);
    res.status(500).json({ message: 'Erreur lors de l’activation du boost' });
  }
});

// Voir qui vous a liké (Premium)
router.get('/likes-received', authenticateToken, async (req, res) => {
  try {
    const subscription = await SubscriptionModel.findByUserId(pgPool, req.user.userId);
    if (!subscription || subscription.isActive !== true) {
      return res.status(403).json({ message: 'Abonnement requis' });
    }

    const entitlements = getEntitlements(subscription.type);
    if (!entitlements.canSeeLikes) {
      return res.status(403).json({ message: 'Fonction réservée au Pass VIP' });
    }

    const result = await pgPool.query(
      `
      SELECT s.user_id, s.action, s.created_at, u.*
      FROM swipes s
      JOIN users u ON u.id = s.user_id
      WHERE s.target_user_id = $1 AND s.action IN ('like','superlike')
      ORDER BY s.created_at DESC
      LIMIT 100
      `,
      [req.user.userId]
    );

    // On renvoie une version "light" (pas de password_hash de toute façon)
    res.json(
      result.rows.map((row) => ({
        user: {
          id: row.id,
          email: row.email,
          phone: null,
          firstName: row.first_name,
          lastName: row.last_name,
          dateOfBirth: row.date_of_birth.toISOString().split('T')[0],
          gender: row.gender,
          bio: row.bio,
          photos: row.photos || [],
          location: {
            city: row.location_city,
            country: row.location_country,
            region: row.location_region,
            commune: row.location_commune,
            quartier: row.location_quartier,
            coordinates: row.location_lat
              ? { lat: parseFloat(row.location_lat), lng: parseFloat(row.location_lng) }
              : undefined,
          },
          isOnline: row.is_online === true,
          preferences: {
            ageRange: { min: row.preferences_age_min || 18, max: row.preferences_age_max || 99 },
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
          boostedUntil: row.boosted_until ? row.boosted_until.toISOString() : null,
          travelMode: {
            enabled: row.travel_mode_enabled === true,
            location: row.travel_mode_enabled === true
              ? {
                  country: row.travel_mode_country || null,
                  region: row.travel_mode_region || null,
                  city: row.travel_mode_city || null,
                  commune: row.travel_mode_commune || null,
                  quartier: row.travel_mode_quartier || null,
                  coordinates: row.travel_mode_lat
                    ? { lat: parseFloat(row.travel_mode_lat), lng: parseFloat(row.travel_mode_lng) }
                    : undefined,
                }
              : undefined,
          },
          createdAt: row.created_at.toISOString(),
          lastActive: row.last_active.toISOString(),
        },
        action: row.action,
        createdAt: row.created_at.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Likes received error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des likes' });
  }
});

// Mode voyage (Premium) - mettre à jour une localisation alternative
router.post('/travel-mode', authenticateToken, async (req, res) => {
  try {
    const subscription = await SubscriptionModel.findByUserId(pgPool, req.user.userId);
    if (!subscription || subscription.isActive !== true) {
      return res.status(403).json({ message: 'Abonnement requis' });
    }

    const entitlements = getEntitlements(subscription.type);
    if (!entitlements.canTravelMode) {
      return res.status(403).json({ message: 'Mode voyage réservé aux abonnements Premium' });
    }

    const { enabled, location } = req.body || {};
    const updatedUser = await UserModel.update(pgPool, req.user.userId, {
      travelMode: { enabled: enabled === true, location: location || {} },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Travel mode error:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du mode voyage' });
  }
});

// Acheter un abonnement
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;

    if (!SUBSCRIPTION_PLANS.find((plan) => plan.type === planType)) {
      return res.status(400).json({ message: 'Plan invalide' });
    }

    // En développement, on crée directement l'abonnement
    // En production, vous devrez intégrer Stripe/Paystack ici
    const subscription = await SubscriptionModel.create(pgPool, req.user.userId, planType);

    res.json(subscription);
  } catch (error) {
    console.error('Purchase subscription error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'achat de l\'abonnement' });
  }
});

// Vérifier les limites de messages
router.get('/check-limit', authenticateToken, async (req, res) => {
  try {
    // En développement : toujours retourner illimité
    if (process.env.NODE_ENV === 'development') {
      return res.json({ canSend: true, remaining: -1 });
    }
    
    const limit = await SubscriptionModel.checkLimit(pgPool, req.user.userId);
    res.json(limit);
  } catch (error) {
    console.error('Check limit error:', error);
    // En développement, retourner illimité même en cas d'erreur
    if (process.env.NODE_ENV === 'development') {
      return res.json({ canSend: true, remaining: -1 });
    }
    res.status(500).json({ message: 'Erreur lors de la vérification des limites' });
  }
});

// Annuler l'abonnement
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    await pgPool.query(
      'UPDATE subscriptions SET is_active = FALSE, auto_renew = FALSE WHERE user_id = $1 AND is_active = TRUE',
      [req.user.userId]
    );
    res.json({ message: 'Abonnement annulé' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'annulation de l\'abonnement' });
  }
});

export default router;

