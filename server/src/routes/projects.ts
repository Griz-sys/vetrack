import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const team = req.query.team as string | undefined;
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};

    if (req.user!.role !== 'DEV') {
      where.team = req.user!.team;
    } else if (team) {
      where.team = team;
    }
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      include: { subtasks: true, _count: { select: { activities: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, team, startDate, deadline, subtasks } = req.body;
  if (!name || !team || !startDate || !deadline) {
    res.status(400).json({ error: 'Missing required fields' }); return;
  }
  try {
    const project = await prisma.project.create({
      data: {
        name, team,
        startDate: new Date(startDate),
        deadline: new Date(deadline),
        subtasks: subtasks
          ? { create: subtasks.map((s: { name: string; assignedTo?: string }) => ({ name: s.name, assignedTo: s.assignedTo || null })) }
          : undefined,
      },
      include: { subtasks: true },
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: String(req.params.id) },
      include: {
        subtasks: true,
        activities: {
          include: { user: { select: { id: true, name: true, team: true } }, subtask: true },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, status, deadline } = req.body;
  try {
    const project = await prisma.project.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(deadline && { deadline: new Date(deadline) }),
      },
      include: { subtasks: true },
    });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const projId = String(req.params.id);
  try {
    await prisma.activity.deleteMany({ where: { projectId: projId } });
    await prisma.subtask.deleteMany({ where: { projectId: projId } });
    await prisma.project.delete({ where: { id: projId } });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/subtasks', authenticate, async (req: Request, res: Response) => {
  try {
    const subtasks = await prisma.subtask.findMany({
      where: { projectId: String(req.params.id) },
      orderBy: { name: 'asc' },
    });
    res.json(subtasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/subtasks', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { name, assignedTo } = req.body;
  if (!name) { res.status(400).json({ error: 'Name required' }); return; }
  try {
    const subtask = await prisma.subtask.create({
      data: { name, projectId: String(req.params.id), assignedTo: assignedTo || null },
    });
    res.status(201).json(subtask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
