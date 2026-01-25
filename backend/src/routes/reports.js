import express from 'express';
import { pgPool } from '../config/database.js';
import { ReportModel } from '../models/Report.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Créer un signalement (MVP)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { reportedUserId, conversationId, messageId, reason, details } = req.body || {};

    if (!reportedUserId) {
      return res.status(400).json({ message: 'reportedUserId requis' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'reason requis' });
    }

    const report = await ReportModel.create(pgPool, {
      reporterId,
      reportedUserId,
      conversationId,
      messageId,
      reason,
      details,
    });

    console.warn('[REPORT]', { reporterId, reportedUserId, reason });

    res.status(201).json(report);
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ message: 'Erreur lors du signalement' });
  }
});

export default router;

