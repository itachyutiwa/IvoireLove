import express from 'express';
import { pgPool } from '../config/database.js';
import { SupportTicketModel } from '../models/SupportTicket.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Lister les tickets de l'utilisateur
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tickets = await SupportTicketModel.listByUser(pgPool, req.user.userId);
    res.json(tickets);
  } catch (error) {
    console.error('List support tickets error:', error);
    res.status(500).json({ message: 'Erreur lors du chargement des tickets' });
  }
});

// Créer un ticket
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { subject, body } = req.body || {};
    if (!subject || !body) {
      return res.status(400).json({ message: 'Sujet et message requis' });
    }
    const ticket = await SupportTicketModel.create(pgPool, req.user.userId, subject, body);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ message: 'Erreur lors de la création du ticket' });
  }
});

export default router;

