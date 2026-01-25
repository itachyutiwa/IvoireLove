import { pgPool } from '../config/database.js';
import { SubscriptionModel } from '../models/Subscription.js';

/**
 * Script de développement : Mettre à jour tous les utilisateurs existants
 * pour qu'ils aient un abonnement Pass Mois (sauf l'utilisateur de test qui a Pass Annuel)
 */
export const updateAllUsersSubscriptions = async () => {
  try {
    // Récupérer tous les utilisateurs
    const usersResult = await pgPool.query('SELECT id, email FROM users');
    const users = usersResult.rows;

    console.log(`📝 Mise à jour des abonnements pour ${users.length} utilisateur(s)...`);

    for (const user of users) {
      const existingSubscription = await SubscriptionModel.findByUserId(pgPool, user.id);
      
      // L'utilisateur de test (test@example.com) doit avoir Pass Annuel
      if (user.email === 'test@example.com') {
        if (!existingSubscription || existingSubscription.type !== 'year') {
          await SubscriptionModel.create(pgPool, user.id, 'year');
          console.log(`  ✅ ${user.email}: Pass Annuel créé/mis à jour`);
        }
      } else {
        // Tous les autres utilisateurs ont Pass Mois
        if (!existingSubscription || existingSubscription.type !== 'month') {
          await SubscriptionModel.create(pgPool, user.id, 'month');
          console.log(`  ✅ ${user.email}: Pass Mois créé/mis à jour`);
        }
      }
    }

    console.log('✅ Mise à jour des abonnements terminée');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des abonnements:', error.message);
  }
};

