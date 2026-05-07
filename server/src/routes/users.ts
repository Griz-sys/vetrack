import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requireDev } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const USER_SELECT = {
  id: true, name: true, email: true, role: true, team: true, defaultHrs: true, createdAt: true,
  adminAssignments: { select: { admin: { select: { id: true, name: true } } } },
} as const;

function fmt(u: any) {
  const { adminAssignments, ...rest } = u;
  return { ...rest, admins: (adminAssignments ?? []).map((a: any) => a.admin) };
}

// List users — DEV sees all, ADMIN sees their managed users, USER: forbidden
router.get('/', authenticate, async (req: Request, res: Response) => {
  const role = req.user!.role;
  const selfId = req.user!.userId;
  const team = req.query.team as string | undefined;

  if (role === 'USER') {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  try {
    let where: Record<string, unknown> = {};
    if (role === 'ADMIN') {
      const assignments = await prisma.adminUserAssignment.findMany({
        where: { adminId: selfId },
        select: { userId: true },
      });
      const managedIds = assignments.map((a) => a.userId);
      where = { id: { in: [selfId, ...managedIds] } };
    } else {
      if (team) where.team = team;
    }

    const users = await prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
    res.json(users.map(fmt));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user — USER can only view self unless ADMIN/DEV
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const role = req.user!.role;
  const selfId = req.user!.userId;

  if (role === 'USER' && selfId !== userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }
  if (role === 'ADMIN' && selfId !== userId) {
    const assignment = await prisma.adminUserAssignment.findUnique({
      where: { adminId_userId: { adminId: selfId, userId } },
    });
    if (!assignment) { res.status(403).json({ error: 'Access denied' }); return; }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(fmt(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update default hours
router.put('/:id/defaultHours', authenticate, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const { defaultHrs } = req.body;
  const role = req.user!.role;
  const selfId = req.user!.userId;

  if (typeof defaultHrs !== 'number' || defaultHrs < 0 || defaultHrs > 24) {
    res.status(400).json({ error: 'Invalid hours value' }); return;
  }
  if (role === 'USER' && selfId !== userId) {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { defaultHrs },
      select: { id: true, name: true, defaultHrs: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /users — create a new user (DEV: any role; ADMIN: USER only under themselves)
router.post('/', authenticate, async (req: Request, res: Response) => {
  const role = req.user!.role;
  const selfId = req.user!.userId;

  if (role === 'USER') {
    res.status(403).json({ error: 'Access denied' }); return;
  }

  const { name, email, password, role: newRole, team, defaultHrs } = req.body;

  if (!name || !email || !password || !team) {
    res.status(400).json({ error: 'name, email, password, and team are required' }); return;
  }

  const allowedRoles = role === 'DEV' ? ['USER', 'ADMIN'] : ['USER'];
  if (!allowedRoles.includes(newRole)) {
    res.status(400).json({ error: `Role must be one of: ${allowedRoles.join(', ')}` }); return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ error: 'Email already in use' }); return; }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name, email,
        password: hashed,
        role: newRole,
        team,
        defaultHrs: typeof defaultHrs === 'number' ? defaultHrs : 8,
      },
      select: USER_SELECT,
    });

    // ADMIN creating a USER: auto-assign self as their admin
    if (role === 'ADMIN' && newRole === 'USER') {
      await prisma.adminUserAssignment.create({ data: { adminId: selfId, userId: user.id } });
      const updated = await prisma.user.findUnique({ where: { id: user.id }, select: USER_SELECT });
      res.status(201).json(fmt(updated)); return;
    }

    res.status(201).json(fmt(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEV only: change a user's team/department
router.put('/:id/team', authenticate, requireDev, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const { team } = req.body;
  const valid = ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING'];
  if (!valid.includes(team)) {
    res.status(400).json({ error: 'Invalid team value' }); return;
  }
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { team },
      select: USER_SELECT,
    });
    res.json(fmt(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEV only: replace all admin assignments for a user
router.put('/:id/admins', authenticate, requireDev, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const { adminIds } = req.body;

  if (!Array.isArray(adminIds)) {
    res.status(400).json({ error: 'adminIds must be an array' }); return;
  }

  try {
    if (adminIds.length > 0) {
      const validAdmins = await prisma.user.findMany({
        where: { id: { in: adminIds }, role: 'ADMIN' },
        select: { id: true },
      });
      if (validAdmins.length !== adminIds.length) {
        res.status(400).json({ error: 'All adminIds must reference ADMIN users' }); return;
      }
    }

    await prisma.adminUserAssignment.deleteMany({ where: { userId } });
    if (adminIds.length > 0) {
      await prisma.adminUserAssignment.createMany({
        data: adminIds.map((adminId: string) => ({ adminId, userId })),
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    res.json(fmt(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEV only: change role between USER and ADMIN
router.put('/:id/role', authenticate, requireDev, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const selfId = req.user!.userId;
  const { role } = req.body;

  if (userId === selfId) {
    res.status(400).json({ error: 'Cannot change your own role' }); return;
  }
  if (!['USER', 'ADMIN'].includes(role)) {
    res.status(400).json({ error: 'Role must be USER or ADMIN' }); return;
  }

  try {
    if (role === 'ADMIN') {
      // Promoted to admin — clear who was managing them as a user
      await prisma.adminUserAssignment.deleteMany({ where: { userId } });
    } else {
      // Demoted to user — clear the users they were managing
      await prisma.adminUserAssignment.deleteMany({ where: { adminId: userId } });
    }
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: USER_SELECT,
    });
    res.json(fmt(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DEV only: delete a user and all their data
router.delete('/:id', authenticate, requireDev, async (req: Request, res: Response) => {
  const userId = String(req.params.id);
  const selfId = req.user!.userId;

  if (userId === selfId) {
    res.status(400).json({ error: 'Cannot delete your own account' }); return;
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) { res.status(404).json({ error: 'User not found' }); return; }
    if (target.role === 'DEV') {
      res.status(400).json({ error: 'Cannot delete a DEV account' }); return;
    }

    await prisma.task.deleteMany({ where: { OR: [{ userId }, { createdById: userId }] } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.adminUserAssignment.deleteMany({ where: { OR: [{ userId }, { adminId: userId }] } });
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
