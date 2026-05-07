import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const TASK_INCLUDE = {
  user: { select: { id: true, name: true, team: true } },
  createdBy: { select: { id: true, name: true } },
} as const;

async function getManagedIds(prisma: PrismaClient, adminId: string): Promise<string[]> {
  const assignments = await prisma.adminUserAssignment.findMany({
    where: { adminId },
    select: { userId: true },
  });
  return [adminId, ...assignments.map((a) => a.userId)];
}

// GET /tasks — filtered by role
router.get('/', authenticate, async (req: Request, res: Response) => {
  const role = req.user!.role;
  const selfId = req.user!.userId;
  const { weekStart, userId: queryUserId } = req.query as Record<string, string | undefined>;

  try {
    const where: Record<string, unknown> = {};

    if (role === 'USER') {
      where.userId = selfId;
    } else if (role === 'ADMIN') {
      const ids = await getManagedIds(prisma, selfId);
      where.userId = queryUserId && ids.includes(queryUserId) ? queryUserId : { in: ids };
    } else {
      // DEV sees all
      if (queryUserId) where.userId = queryUserId;
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.dueDate = { gte: start, lt: end };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tasks — create a task
router.post('/', authenticate, async (req: Request, res: Response) => {
  const { title, dueDate, userId: assignedUserId, notes } = req.body;
  const role = req.user!.role;
  const selfId = req.user!.userId;

  if (!title || !dueDate || !assignedUserId) {
    res.status(400).json({ error: 'title, dueDate, and userId are required' }); return;
  }

  try {
    if (role === 'USER' && assignedUserId !== selfId) {
      res.status(403).json({ error: 'Users can only create tasks for themselves' }); return;
    }
    if (role === 'ADMIN') {
      const ids = await getManagedIds(prisma, selfId);
      if (!ids.includes(assignedUserId)) {
        res.status(403).json({ error: 'You can only assign tasks to your managed users' }); return;
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        dueDate: new Date(dueDate),
        userId: assignedUserId,
        createdById: selfId,
        notes: notes || null,
      },
      include: TASK_INCLUDE,
    });
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /tasks/:id — update (title, dueDate, notes, done)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const role = req.user!.role;
  const selfId = req.user!.userId;

  try {
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }

    if (role === 'USER' && existing.userId !== selfId && existing.createdById !== selfId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
    if (role === 'ADMIN') {
      const ids = await getManagedIds(prisma, selfId);
      if (!ids.includes(existing.userId)) { res.status(403).json({ error: 'Access denied' }); return; }
    }

    const { title, dueDate, notes, done } = req.body;
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(done !== undefined && { done }),
      },
      include: TASK_INCLUDE,
    });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /tasks/:id
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const taskId = String(req.params.id);
  const role = req.user!.role;
  const selfId = req.user!.userId;

  try {
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) { res.status(404).json({ error: 'Task not found' }); return; }

    if (role === 'USER' && existing.userId !== selfId && existing.createdById !== selfId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
    if (role === 'ADMIN') {
      const ids = await getManagedIds(prisma, selfId);
      if (!ids.includes(existing.userId)) { res.status(403).json({ error: 'Access denied' }); return; }
    }

    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
