import express from 'express';
import { pgPool } from '../config/database.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { authenticateToken } from '../middleware/auth.js';

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

