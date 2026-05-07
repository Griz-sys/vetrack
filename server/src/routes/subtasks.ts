import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, assignedTo, progress } = req.body;
  try {
    const subtask = await prisma.subtask.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(progress !== undefined && { progress }),
      },
    });
    res.json(subtask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
