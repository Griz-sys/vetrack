import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId: queryUserId, weekStart, projectId, team } = req.query as Record<string, string | undefined>;
    const role = req.user!.role;
    const selfId = req.user!.userId;
    const where: Record<string, unknown> = {};

    if (role === 'USER') {
      where.userId = selfId;
    } else if (role === 'ADMIN') {
      const myUsers = await prisma.user.findMany({
        where: { OR: [{ id: selfId }, { adminId: selfId }] },
        select: { id: true },
      });
      const ids = myUsers.map((u) => u.id);
      if (queryUserId && ids.includes(queryUserId)) {
        where.userId = queryUserId;
      } else {
        where.userId = { in: ids };
      }
    } else if (role === 'DEV') {
      if (queryUserId) where.userId = queryUserId;
    }

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.date = { gte: start, lt: end };
    }
    if (projectId) where.projectId = projectId;

    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, team: true, role: true } },
        project: { select: { id: true, name: true, team: true } },
        subtask: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // DEV can filter by team client-side
    const filtered =
      role === 'DEV' && team
        ? activities.filter((a) => a.user.team === team)
        : activities;

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { date, type, projectId, subtaskId, hours, notes, blocker, meetingType } = req.body;
  if (!date || !type || !hours) {
    res.status(400).json({ error: 'date, type, and hours are required' });
    return;
  }
  try {
    const activity = await prisma.activity.create({
      data: {
        userId: req.user!.userId,
        date: new Date(date),
        type,
        projectId: projectId || null,
        subtaskId: subtaskId || null,
        hours: parseFloat(hours),
        notes: notes || null,
        blocker: blocker || null,
        meetingType: meetingType || null,
      },
      include: {
        user: { select: { id: true, name: true, team: true } },
        project: { select: { id: true, name: true, team: true } },
        subtask: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const actId = String(req.params.id);
    const existing = await prisma.activity.findUnique({ where: { id: actId } });
    if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }
    if (req.user!.role === 'USER' && existing.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
    const { date, type, projectId, subtaskId, hours, notes, blocker, meetingType } = req.body;
    const activity = await prisma.activity.update({
      where: { id: actId },
      data: {
        ...(date && { date: new Date(date) }),
        ...(type && { type }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(subtaskId !== undefined && { subtaskId: subtaskId || null }),
        ...(hours !== undefined && { hours: parseFloat(hours) }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(blocker !== undefined && { blocker: blocker || null }),
        ...(meetingType !== undefined && { meetingType: meetingType || null }),
      },
      include: {
        user: { select: { id: true, name: true, team: true } },
        project: { select: { id: true, name: true, team: true } },
        subtask: { select: { id: true, name: true } },
      },
    });
    res.json(activity);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const actId = String(req.params.id);
    const existing = await prisma.activity.findUnique({ where: { id: actId } });
    if (!existing) { res.status(404).json({ error: 'Activity not found' }); return; }
    if (req.user!.role === 'USER' && existing.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' }); return;
    }
    await prisma.activity.delete({ where: { id: actId } });
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
