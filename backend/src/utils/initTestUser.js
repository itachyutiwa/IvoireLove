import bcrypt from 'bcryptjs';
import { pgPool } from '../config/database.js';
import { UserModel } from '../models/User.js';
import { SubscriptionModel } from '../models/Subscription.js';

export const initTestUser = async () => {
  try {
    const testEmail = 'test@example.com';
    
    // Vérifier si l'utilisateur de test existe déjà
    const existingUser = await UserModel.findByEmail(pgPool, testEmail);
    
    if (existingUser) {
      console.log('✅ Utilisateur de test déjà existant');
      
      // En développement : s'assurer que l'utilisateur de test a un Pass Annuel
      const existingSubscription = await SubscriptionModel.findByUserId(pgPool, existingUser.id);
      if (!existingSubscription || existingSubscription.type !== 'year') {
        // Créer ou mettre à jour vers Pass Annuel
        await SubscriptionModel.create(pgPool, existingUser.id, 'year');
        console.log('✅ Abonnement Pass Annuel créé/mis à jour pour l\'utilisateur de test');
      }
      return;
    }

    // Créer l'utilisateur de test
    const passwordHash = await bcrypt.hash('password123', 10);
    
    const user = await UserModel.create(pgPool, {
      email: testEmail,
      passwordHash,
      firstName: 'Test',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      phone: null,
    });

    // En développement : créer un abonnement Pass Annuel pour l'utilisateur de test
    await SubscriptionModel.create(pgPool, user.id, 'year');

    console.log('✅ Utilisateur de test créé avec succès');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur de test:', error.message);
  }
};

