import express from 'express';
import { pgPool } from '../config/database.js';
import { BlockModel } from '../models/Block.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Bloquer un utilisateur
router.post('/', authenticateToken, async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { blockedUserId } = req.body || {};
    if (!blockedUserId) return res.status(400).json({ message: 'blockedUserId requis' });

    const block = await BlockModel.create(pgPool, blockerId, blockedUserId);
    res.status(201).json(block);
  } catch (error) {
    console.error('Create block error:', error);
    res.status(500).json({ message: error.message || 'Erreur lors du blocage' });
  }
});

// Débloquer un utilisateur
router.delete('/:blockedUserId', authenticateToken, async (req, res) => {
  try {
    const blockerId = req.user.userId;
    const { blockedUserId } = req.params;
    const removed = await BlockModel.remove(pgPool, blockerId, blockedUserId);
    res.json({ message: 'Débloqué', removed });
  } catch (error) {
    console.error('Remove block error:', error);
    res.status(500).json({ message: 'Erreur lors du déblocage' });
  }
});

export default router;

