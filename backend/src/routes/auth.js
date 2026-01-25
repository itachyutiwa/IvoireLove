import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pgPool } from '../config/database.js';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';
import { VerificationCodeModel } from '../models/VerificationCode.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, registerValidation, loginValidation } from '../middleware/validation.js';

const router = express.Router();

// Générer un code de vérification à 6 chiffres
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Fonction pour envoyer un SMS (simulation en développement)
const sendSMS = async (phone, code) => {
  const message = `Bonjour ! Votre code de confirmation IvoireLove est: ${code}. Validez votre inscription pour commencer à rencontrer des personnes près de chez vous.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS envoyé à ${phone}:`);
    console.log(`   ${message}`);
    return true;
  }
  // En production, intégrer avec un service SMS (Twilio, AWS SNS, etc.)
  // TODO: Intégrer avec un service SMS réel
  console.log(`📱 SMS envoyé à ${phone}:`);
  console.log(`   ${message}`);
  return true;
};

// Fonction pour envoyer un email (simulation en développement)
const sendEmail = async (email, code) => {
  const subject = 'Code de confirmation IvoireLove';
  const message = `Bonjour !

Votre code de confirmation IvoireLove est: ${code}

Utilisez ce code pour valider votre inscription et commencer à rencontrer des personnes près de chez vous.

Ce code est valide pendant 10 minutes.

Cordialement,
L'équipe IvoireLove`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 Email envoyé à ${email}:`);
    console.log(`   Sujet: ${subject}`);
    console.log(`   Message:\n${message}`);
    return true;
  }
  // En production, intégrer avec un service email (SendGrid, AWS SES, etc.)
  // TODO: Intégrer avec un service email réel
  console.log(`📧 Email envoyé à ${email}:`);
  console.log(`   Sujet: ${subject}`);
  console.log(`   Message:\n${message}`);
  return true;
};

// Inscription - Étape 1 : Créer le compte et envoyer le code de vérification
router.post('/register', validate(registerValidation), async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, gender, phone, location } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findByEmail(pgPool, email);
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur (mais pas encore vérifié)
    const user = await UserModel.create(pgPool, {
      email,
      passwordHash,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      location,
    });

    // Générer un code de vérification
    const verificationCode = generateVerificationCode();
    
    // Stocker le code de vérification
    await VerificationCodeModel.create(pgPool, {
      email,
      phone: phone || null,
      code: verificationCode,
      type: 'registration',
    });

    // Envoyer le code par SMS si un numéro est fourni, sinon par email
    if (phone) {
      await sendSMS(phone, verificationCode);
    } else {
      await sendEmail(email, verificationCode);
    }

    res.status(201).json({
      message: 'Code de confirmation envoyé',
      userId: user.id,
      verificationMethod: phone ? 'phone' : 'email',
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Gérer les erreurs spécifiques
    if (error.code === '23505') { // Violation de contrainte unique
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }
    
    res.status(500).json({ 
      message: 'Erreur lors de l\'inscription',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Vérification du code de confirmation - Étape 2 : Valider le compte
router.post('/verify-registration', async (req, res) => {
  try {
    const { userId, code, email, phone } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ message: 'Code de vérification et ID utilisateur requis' });
    }

    // Trouver le code de vérification
    const verificationRecord = await VerificationCodeModel.findByCode(pgPool, code, email, phone);
    
    if (!verificationRecord) {
      return res.status(400).json({ message: 'Code de vérification invalide ou expiré' });
    }

    // Vérifier que le code correspond à l'utilisateur
    if (verificationRecord.email && email && verificationRecord.email !== email) {
      return res.status(400).json({ message: 'Code de vérification invalide' });
    }
    if (verificationRecord.phone && phone && verificationRecord.phone !== phone) {
      return res.status(400).json({ message: 'Code de vérification invalide' });
    }

    // Marquer le code comme vérifié
    await VerificationCodeModel.markAsVerified(pgPool, verificationRecord.id);

    // Récupérer l'utilisateur
    const user = await UserModel.findById(pgPool, userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // En développement : créer un abonnement Pass Mois pour tous les nouveaux utilisateurs
    const subscription = await SubscriptionModel.create(pgPool, user.id, 'month');

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      message: 'Compte vérifié avec succès',
      user,
      token,
      subscription,
    });
  } catch (error) {
    console.error('Verify registration error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la vérification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Renvoyer le code de vérification
router.post('/resend-verification-code', async (req, res) => {
  try {
    const { userId, email, phone } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'ID utilisateur requis' });
    }

    const user = await UserModel.findById(pgPool, userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau code
    const verificationCode = generateVerificationCode();
    
    // Stocker le nouveau code
    await VerificationCodeModel.create(pgPool, {
      email: email || user.email,
      phone: phone || user.phone || null,
      code: verificationCode,
      type: 'registration',
    });

    // Envoyer le code
    if (phone || user.phone) {
      await sendSMS(phone || user.phone, verificationCode);
    } else {
      await sendEmail(email || user.email, verificationCode);
    }

    res.status(200).json({
      message: 'Code de confirmation renvoyé',
      verificationMethod: (phone || user.phone) ? 'phone' : 'email',
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'envoi du code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Connexion
router.post('/login', validate(loginValidation), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await UserModel.findByEmail(pgPool, email);
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Récupérer le hash du mot de passe depuis la base
    const userRow = await pgPool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    if (userRow.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, userRow.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Mettre à jour la dernière activité
    await pgPool.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Récupérer ou créer l'abonnement
    // En développement : créer un Pass Mois si l'utilisateur n'a pas d'abonnement
    // (sauf pour l'utilisateur de test qui doit avoir Pass Annuel)
    let subscription = await SubscriptionModel.findByUserId(pgPool, user.id);
    if (!subscription) {
      const subscriptionType = user.email === 'test@example.com' ? 'year' : 'month';
      subscription = await SubscriptionModel.create(pgPool, user.id, subscriptionType);
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      user,
      token,
      subscription,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir l'utilisateur actuel
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.findById(pgPool, req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir l'abonnement actuel
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    // Récupérer l'utilisateur pour vérifier s'il s'agit de l'utilisateur de test
    const user = await UserModel.findById(pgPool, req.user.userId);
    let subscription = await SubscriptionModel.findByUserId(pgPool, req.user.userId);
    if (!subscription) {
      // En développement : créer un Pass Mois (sauf pour l'utilisateur de test qui a Pass Annuel)
      const subscriptionType = user?.email === 'test@example.com' ? 'year' : 'month';
      subscription = await SubscriptionModel.create(pgPool, req.user.userId, subscriptionType);
    }
    res.json(subscription);
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de l\'abonnement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Fonction pour envoyer un SMS de réinitialisation
const sendResetSMS = async (phone, code) => {
  const message = `Bonjour ! Votre code de réinitialisation de mot de passe IvoireLove est: ${code}. Utilisez ce code pour réinitialiser votre mot de passe.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 SMS de réinitialisation envoyé à ${phone}:`);
    console.log(`   ${message}`);
    return true;
  }
  // En production, intégrer avec un service SMS (Twilio, AWS SNS, etc.)
  console.log(`📱 SMS de réinitialisation envoyé à ${phone}:`);
  console.log(`   ${message}`);
  return true;
};

// Fonction pour normaliser un numéro de téléphone
const normalizePhone = (phone) => {
  if (!phone) return '';
  // Enlever tous les espaces, tirets, parenthèses et le + au début
  return phone.replace(/\s+/g, '').replace(/[-\s()]/g, '').replace(/^\+/, '');
};

// Demander la réinitialisation du mot de passe
router.post('/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Numéro de téléphone requis' });
    }

    // Normaliser le numéro de téléphone reçu
    const normalizedPhone = normalizePhone(phone);

    // Trouver l'utilisateur par numéro de téléphone
    // On cherche avec différentes variations du numéro
    const userRow = await pgPool.query(
      `SELECT * FROM users 
       WHERE phone IS NOT NULL 
       AND (
         REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
         OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE $2
         OR phone = $3
         OR phone LIKE $4
       )`,
      [
        normalizedPhone,
        `%${normalizedPhone}%`,
        phone,
        `%${normalizedPhone}%`
      ]
    );

    if (userRow.rows.length === 0) {
      // Pour des raisons de sécurité, on ne révèle pas si le numéro existe ou non
      // Mais on envoie quand même un message de succès pour ne pas révéler l'existence du compte
      return res.status(200).json({ 
        message: 'Si ce numéro est associé à un compte, un code de réinitialisation a été envoyé' 
      });
    }

    const user = UserModel.mapToUser(userRow.rows[0]);
    const userPhone = user.phone || userRow.rows[0].phone;

    // Générer un code de réinitialisation
    const resetCode = generateVerificationCode();
    
    // Stocker le code de réinitialisation avec le numéro tel qu'il est dans la base
    await VerificationCodeModel.create(pgPool, {
      email: null,
      phone: userPhone,
      code: resetCode,
      type: 'password_reset',
    });

    // Envoyer le code par SMS (utiliser le numéro de la base ou celui reçu)
    await sendResetSMS(userPhone || phone, resetCode);

    res.status(200).json({
      message: 'Code de réinitialisation envoyé par SMS',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la demande de réinitialisation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Vérifier le code de réinitialisation
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ message: 'Numéro de téléphone et code requis' });
    }

    // Normaliser le numéro de téléphone
    const normalizedPhone = normalizePhone(phone);

    // Trouver le code de vérification - chercher avec le numéro normalisé
    let verificationRecord = await VerificationCodeModel.findByCode(pgPool, code, null, phone);
    
    // Si pas trouvé, essayer avec le numéro normalisé
    if (!verificationRecord) {
      // Chercher dans la base avec différentes variations
      const codeRow = await pgPool.query(
        `SELECT * FROM verification_codes 
         WHERE code = $1 
         AND verified = FALSE 
         AND expires_at > CURRENT_TIMESTAMP
         AND type = 'password_reset'
         AND phone IS NOT NULL
         AND (
           REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $2
           OR phone = $3
         )
         ORDER BY created_at DESC LIMIT 1`,
        [code, normalizedPhone, phone]
      );
      
      if (codeRow.rows.length > 0) {
        verificationRecord = codeRow.rows[0];
      }
    }
    
    if (!verificationRecord) {
      return res.status(400).json({ message: 'Code de réinitialisation invalide ou expiré' });
    }

    // Vérifier que le code est de type password_reset
    if (verificationRecord.type !== 'password_reset') {
      return res.status(400).json({ message: 'Code invalide' });
    }

    res.status(200).json({
      message: 'Code vérifié avec succès',
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ 
      message: 'Erreur lors de la vérification du code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Réinitialiser le mot de passe avec le code
router.post('/reset-password', async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    if (!phone || !code || !newPassword) {
      return res.status(400).json({ message: 'Numéro de téléphone, code et nouveau mot de passe requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Trouver le code de vérification
    const verificationRecord = await VerificationCodeModel.findByCode(pgPool, code, null, phone);
    
    if (!verificationRecord) {
      return res.status(400).json({ message: 'Code de réinitialisation invalide ou expiré' });
    }

    // Vérifier que le code est de type password_reset
    if (verificationRecord.type !== 'password_reset') {
      return res.status(400).json({ message: 'Code invalide' });
    }

    // Vérifier que le code correspond au téléphone
    if (verificationRecord.phone && verificationRecord.phone !== phone) {
      return res.status(400).json({ message: 'Code de réinitialisation invalide' });
    }

    // Normaliser le numéro de téléphone
    const normalizedPhone = normalizePhone(phone);

    // Trouver l'utilisateur par numéro de téléphone
    const userRow = await pgPool.query(
      `SELECT * FROM users 
       WHERE phone IS NOT NULL 
       AND (
         REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
         OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE $2
         OR phone = $3
         OR phone LIKE $4
       )`,
      [
        normalizedPhone,
        `%${normalizedPhone}%`,
        phone,
        `%${normalizedPhone}%`
      ]
    );

    if (userRow.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const user = UserModel.mapToUser(userRow.rows[0]);

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pgPool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
      passwordHash,
      user.id
    ]);

    // Marquer le code comme vérifié
    await VerificationCodeModel.markAsVerified(pgPool, verificationRecord.id);

    res.status(200).json({
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la réinitialisation du mot de passe',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
