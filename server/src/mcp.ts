/**
 * WorkTrack MCP Server
 *
 * Exposes WorkTrack database as MCP tools so any LLM can query team activity,
 * project status, blockers, and employee summaries directly.
 *
 * Run:  npx ts-node src/mcp.ts
 * Or add to Claude Desktop / Cursor / any MCP-compatible client.
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';
import { format, startOfWeek, addDays } from 'date-fns';

const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────

function getWeekRange(weekStart?: string): { start: Date; end: Date } {
  const base = weekStart ? new Date(weekStart) : new Date();
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end = addDays(start, 5);
  return { start, end };
}

function fmtH(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ─── tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_team_calendar',
    description:
      'Get the weekly activity calendar for a team. Returns each member\'s logged work, meetings, hours per day, and any blockers for the specified week.',
    inputSchema: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          enum: ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING'],
          description: 'Which team/department to query',
        },
        week_start: {
          type: 'string',
          description: 'ISO date (YYYY-MM-DD) of the Monday to start from. Defaults to current week.',
        },
      },
      required: ['team'],
    },
  },
  {
    name: 'get_projects',
    description:
      'List all projects with their status, progress percentage, subtasks, deadline, and risk level. Can filter by team.',
    inputSchema: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          enum: ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING', 'ALL'],
          description: 'Filter by team, or ALL for every project',
        },
        status: {
          type: 'string',
          enum: ['ACTIVE', 'ARCHIVED', 'ALL'],
          description: 'Filter by project status. Defaults to ACTIVE.',
        },
      },
    },
  },
  {
    name: 'get_project_detail',
    description:
      'Get full detail for a single project: description, subtasks with progress, and the complete activity log.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project UUID' },
        project_name: { type: 'string', description: 'Partial or full project name (used if project_id not provided)' },
      },
    },
  },
  {
    name: 'get_employee_summary',
    description:
      'Get a summary for a specific employee: hours this week, projects worked on, any blockers, and a day-by-day breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        employee_name: { type: 'string', description: 'Full or partial name of the employee' },
        employee_email: { type: 'string', description: 'Email address of the employee' },
        week_start: { type: 'string', description: 'ISO date YYYY-MM-DD of the Monday. Defaults to current week.' },
      },
    },
  },
  {
    name: 'get_active_blockers',
    description:
      'Return every logged blocker across the whole company (or filtered by team). Useful for standup prep or risk assessment.',
    inputSchema: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          enum: ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING', 'ALL'],
          description: 'Filter blockers by team. Defaults to ALL.',
        },
        days_back: {
          type: 'number',
          description: 'How many days back to look for blockers. Defaults to 7.',
        },
      },
    },
  },
  {
    name: 'get_weekly_summary_data',
    description:
      'Return structured JSON of all activities for the week grouped by user — the same data used to generate the Friday email. Good for asking the LLM to synthesize insights.',
    inputSchema: {
      type: 'object',
      properties: {
        week_start: { type: 'string', description: 'ISO date YYYY-MM-DD of the Monday. Defaults to current week.' },
      },
    },
  },
  {
    name: 'search_activities',
    description:
      'Full-text search across activity notes, or filter by date range, user, project, or activity type.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text to search in activity notes and blockers' },
        user_name: { type: 'string', description: 'Filter by user name (partial match)' },
        project_name: { type: 'string', description: 'Filter by project name (partial match)' },
        date_from: { type: 'string', description: 'ISO date YYYY-MM-DD start of range' },
        date_to: { type: 'string', description: 'ISO date YYYY-MM-DD end of range' },
        activity_type: {
          type: 'string',
          enum: ['PROJECT', 'MEETING', 'ADMIN'],
          description: 'Filter by activity type',
        },
        limit: { type: 'number', description: 'Max results to return. Defaults to 20.' },
      },
    },
  },
  {
    name: 'get_team_members',
    description:
      'List all team members with their role, team, default hours, and this-week stats (hours logged, active projects, open blockers).',
    inputSchema: {
      type: 'object',
      properties: {
        team: {
          type: 'string',
          enum: ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING', 'ALL'],
          description: 'Filter by team. Defaults to ALL.',
        },
      },
    },
  },
  {
    name: 'get_hours_report',
    description:
      'Get a breakdown of total hours logged per person and per project for a given week. Useful for billing, capacity planning, or manager reviews.',
    inputSchema: {
      type: 'object',
      properties: {
        week_start: { type: 'string', description: 'ISO date YYYY-MM-DD of the Monday. Defaults to current week.' },
        team: {
          type: 'string',
          enum: ['DEV', 'CIVIL', 'ADMIN', 'DESIGN', 'MARKETING', 'ALL'],
          description: 'Filter by team. Defaults to ALL.',
        },
      },
    },
  },
];

// ─── tool handlers ───────────────────────────────────────────────────────────

async function handleGetTeamCalendar(args: Record<string, unknown>) {
  const team = String(args.team);
  const { start, end } = getWeekRange(args.week_start as string | undefined);

  const users = await prisma.user.findMany({
    where: { team: team as any },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });

  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: start, lt: end },
      user: { team: team as any },
    },
    include: {
      user: { select: { id: true, name: true } },
      project: { select: { name: true } },
      subtask: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const days = Array.from({ length: 5 }, (_, i) => addDays(start, i));
  const dayLabels = days.map((d) => format(d, 'EEE MMM d'));

  const result = users.map((u) => {
    const userActs = activities.filter((a) => a.userId === u.id);
    const dayBreakdown = days.map((day, i) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const entries = userActs.filter((a) => format(new Date(a.date), 'yyyy-MM-dd') === dayStr);
      return {
        day: dayLabels[i],
        total_hours: entries.reduce((s, e) => s + e.hours, 0),
        entries: entries.map((e) => ({
          type: e.type,
          project: e.project?.name,
          subtask: e.subtask?.name,
          meeting_type: e.meetingType,
          hours: e.hours,
          notes: e.notes,
          blocker: e.blocker,
        })),
      };
    });
    const totalHours = userActs.reduce((s, a) => s + a.hours, 0);
    const blockers = userActs.filter((a) => a.blocker).map((a) => a.blocker!);
    return {
      name: u.name,
      role: u.role,
      total_hours_this_week: totalHours,
      blockers,
      days: dayBreakdown,
    };
  });

  return {
    team,
    week: `${format(start, 'MMM d')} – ${format(addDays(start, 4), 'MMM d, yyyy')}`,
    members: result,
  };
}

async function handleGetProjects(args: Record<string, unknown>) {
  const team = (args.team as string) || 'ALL';
  const status = (args.status as string) || 'ACTIVE';

  const where: Record<string, unknown> = {};
  if (team !== 'ALL') where.team = team;
  if (status !== 'ALL') where.status = status;

  const projects = await prisma.project.findMany({
    where,
    include: { subtasks: true, _count: { select: { activities: true } } },
    orderBy: { deadline: 'asc' },
  });

  return projects.map((p) => {
    const avgProgress = p.subtasks.length
      ? Math.round(p.subtasks.reduce((s, t) => s + t.progress, 0) / p.subtasks.length)
      : 0;
    const daysLeft = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000);
    const risk = daysLeft < 0 ? 'OVERDUE' : daysLeft < 14 && avgProgress < 70 ? 'AT_RISK' : 'ON_TRACK';
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      status: p.status,
      progress_percent: avgProgress,
      risk,
      deadline: format(new Date(p.deadline), 'yyyy-MM-dd'),
      days_until_deadline: daysLeft,
      subtask_count: p.subtasks.length,
      activity_count: p._count.activities,
      subtasks: p.subtasks.map((s) => ({ name: s.name, progress: s.progress })),
    };
  });
}

async function handleGetProjectDetail(args: Record<string, unknown>) {
  let project;
  if (args.project_id) {
    project = await prisma.project.findUnique({
      where: { id: String(args.project_id) },
      include: {
        subtasks: true,
        activities: {
          include: { user: { select: { name: true } }, subtask: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });
  } else if (args.project_name) {
    project = await prisma.project.findFirst({
      where: { name: { contains: String(args.project_name), mode: 'insensitive' } },
      include: {
        subtasks: true,
        activities: {
          include: { user: { select: { name: true } }, subtask: { select: { name: true } } },
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });
  }
  if (!project) return { error: 'Project not found' };

  const avgProgress = project.subtasks.length
    ? Math.round(project.subtasks.reduce((s, t) => s + t.progress, 0) / project.subtasks.length)
    : 0;

  return {
    id: project.id,
    name: project.name,
    team: project.team,
    status: project.status,
    progress_percent: avgProgress,
    start_date: format(new Date(project.startDate), 'yyyy-MM-dd'),
    deadline: format(new Date(project.deadline), 'yyyy-MM-dd'),
    subtasks: project.subtasks.map((s) => ({
      name: s.name,
      progress: s.progress,
      assigned_to: s.assignedTo,
    })),
    recent_activities: project.activities.map((a) => ({
      date: format(new Date(a.date), 'yyyy-MM-dd'),
      person: a.user.name,
      subtask: a.subtask?.name,
      hours: a.hours,
      notes: a.notes,
      blocker: a.blocker,
    })),
  };
}

async function handleGetEmployeeSummary(args: Record<string, unknown>) {
  let user;
  if (args.employee_email) {
    user = await prisma.user.findUnique({ where: { email: String(args.employee_email) } });
  } else if (args.employee_name) {
    user = await prisma.user.findFirst({
      where: { name: { contains: String(args.employee_name), mode: 'insensitive' } },
    });
  }
  if (!user) return { error: 'Employee not found' };

  const { start, end } = getWeekRange(args.week_start as string | undefined);
  const days = Array.from({ length: 5 }, (_, i) => addDays(start, i));

  const activities = await prisma.activity.findMany({
    where: { userId: user.id, date: { gte: start, lt: end } },
    include: {
      project: { select: { name: true } },
      subtask: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const totalHours = activities.reduce((s, a) => s + a.hours, 0);
  const projectHours: Record<string, number> = {};
  for (const a of activities) {
    if (a.project) projectHours[a.project.name] = (projectHours[a.project.name] || 0) + a.hours;
  }
  const blockers = activities.filter((a) => a.blocker).map((a) => ({
    date: format(new Date(a.date), 'yyyy-MM-dd'),
    project: a.project?.name,
    blocker: a.blocker,
  }));

  const dayBreakdown = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const entries = activities.filter((a) => format(new Date(a.date), 'yyyy-MM-dd') === dayStr);
    return {
      day: format(day, 'EEE MMM d'),
      hours: entries.reduce((s, e) => s + e.hours, 0),
      entries: entries.map((e) => ({
        type: e.type,
        project: e.project?.name,
        subtask: e.subtask?.name,
        hours: e.hours,
        notes: e.notes,
      })),
    };
  });

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team,
    week: `${format(start, 'MMM d')} – ${format(addDays(start, 4), 'MMM d, yyyy')}`,
    total_hours: totalHours,
    hours_formatted: fmtH(totalHours),
    project_hours: projectHours,
    blockers,
    days: dayBreakdown,
  };
}

async function handleGetActiveBlockers(args: Record<string, unknown>) {
  const team = (args.team as string) || 'ALL';
  const daysBack = Number(args.days_back) || 7;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const activities = await prisma.activity.findMany({
    where: {
      blocker: { not: null },
      date: { gte: since },
      ...(team !== 'ALL' ? { user: { team: team as any } } : {}),
    },
    include: {
      user: { select: { name: true, team: true } },
      project: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return {
    total_blockers: activities.length,
    blocker_list: activities.map((a) => ({
      date: format(new Date(a.date), 'yyyy-MM-dd'),
      person: a.user.name,
      team: a.user.team,
      project: a.project?.name,
      blocker: a.blocker,
    })),
  };
}

async function handleGetWeeklySummaryData(args: Record<string, unknown>) {
  const { start, end } = getWeekRange(args.week_start as string | undefined);

  const activities = await prisma.activity.findMany({
    where: { date: { gte: start, lt: end } },
    include: {
      user: { select: { id: true, name: true, team: true } },
      project: { select: { name: true } },
      subtask: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const byUser: Record<string, {
    name: string; team: string; total_hours: number;
    project_hours: Record<string, number>;
    meeting_hours: number; admin_hours: number;
    blockers: string[]; entries: unknown[];
  }> = {};

  for (const a of activities) {
    const uid = a.userId;
    if (!byUser[uid]) {
      byUser[uid] = {
        name: a.user.name, team: a.user.team, total_hours: 0,
        project_hours: {}, meeting_hours: 0, admin_hours: 0,
        blockers: [], entries: [],
      };
    }
    const u = byUser[uid];
    u.total_hours += a.hours;
    if (a.type === 'PROJECT' && a.project) {
      u.project_hours[a.project.name] = (u.project_hours[a.project.name] || 0) + a.hours;
    } else if (a.type === 'MEETING') {
      u.meeting_hours += a.hours;
    } else {
      u.admin_hours += a.hours;
    }
    if (a.blocker) u.blockers.push(a.blocker);
    u.entries.push({
      date: format(new Date(a.date), 'yyyy-MM-dd'),
      type: a.type, project: a.project?.name, subtask: a.subtask?.name,
      hours: a.hours, notes: a.notes, blocker: a.blocker, meetingType: a.meetingType,
    });
  }

  return {
    week: `${format(start, 'yyyy-MM-dd')} to ${format(addDays(start, 4), 'yyyy-MM-dd')}`,
    by_person: byUser,
    totals: {
      people_logged: Object.keys(byUser).length,
      total_hours: Object.values(byUser).reduce((s, u) => s + u.total_hours, 0),
      total_blockers: activities.filter((a) => a.blocker).length,
    },
  };
}

async function handleSearchActivities(args: Record<string, unknown>) {
  const limit = Number(args.limit) || 20;
  const where: Record<string, unknown> = {};

  if (args.query) {
    where.OR = [
      { notes: { contains: String(args.query), mode: 'insensitive' } },
      { blocker: { contains: String(args.query), mode: 'insensitive' } },
    ];
  }
  if (args.user_name) {
    where.user = { name: { contains: String(args.user_name), mode: 'insensitive' } };
  }
  if (args.project_name) {
    where.project = { name: { contains: String(args.project_name), mode: 'insensitive' } };
  }
  if (args.activity_type) {
    where.type = args.activity_type;
  }
  if (args.date_from || args.date_to) {
    where.date = {
      ...(args.date_from ? { gte: new Date(String(args.date_from)) } : {}),
      ...(args.date_to ? { lte: new Date(String(args.date_to)) } : {}),
    };
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: { select: { name: true, team: true } },
      project: { select: { name: true } },
      subtask: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return {
    count: activities.length,
    results: activities.map((a) => ({
      date: format(new Date(a.date), 'yyyy-MM-dd'),
      person: a.user.name,
      team: a.user.team,
      type: a.type,
      project: a.project?.name,
      subtask: a.subtask?.name,
      hours: a.hours,
      notes: a.notes,
      blocker: a.blocker,
      meeting_type: a.meetingType,
    })),
  };
}

async function handleGetTeamMembers(args: Record<string, unknown>) {
  const team = (args.team as string) || 'ALL';
  const { start, end } = getWeekRange();

  const users = await prisma.user.findMany({
    where: team !== 'ALL' ? { team: team as any } : {},
    select: { id: true, name: true, email: true, role: true, team: true, defaultHrs: true },
    orderBy: [{ team: 'asc' }, { name: 'asc' }],
  });

  const activities = await prisma.activity.findMany({
    where: { date: { gte: start, lt: end } },
    include: { user: { select: { id: true } } },
  });

  return users.map((u) => {
    const userActs = activities.filter((a) => a.userId === u.id);
    const weekHours = userActs.reduce((s, a) => s + a.hours, 0);
    const blockers = userActs.filter((a) => a.blocker).length;
    const projectIds = new Set(userActs.filter((a) => a.projectId).map((a) => a.projectId));
    return {
      name: u.name,
      email: u.email,
      role: u.role,
      team: u.team,
      default_hours: u.defaultHrs,
      this_week: {
        hours_logged: weekHours,
        hours_formatted: fmtH(weekHours),
        active_projects: projectIds.size,
        open_blockers: blockers,
      },
    };
  });
}

async function handleGetHoursReport(args: Record<string, unknown>) {
  const team = (args.team as string) || 'ALL';
  const { start, end } = getWeekRange(args.week_start as string | undefined);

  const activities = await prisma.activity.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(team !== 'ALL' ? { user: { team: team as any } } : {}),
    },
    include: {
      user: { select: { name: true, team: true } },
      project: { select: { name: true, team: true } },
    },
    orderBy: { date: 'asc' },
  });

  const byPerson: Record<string, { team: string; total: number; by_type: Record<string, number> }> = {};
  const byProject: Record<string, { team: string; total: number }> = {};

  for (const a of activities) {
    const pName = a.user.name;
    if (!byPerson[pName]) byPerson[pName] = { team: a.user.team, total: 0, by_type: {} };
    byPerson[pName].total += a.hours;
    byPerson[pName].by_type[a.type] = (byPerson[pName].by_type[a.type] || 0) + a.hours;

    if (a.project) {
      const prName = a.project.name;
      if (!byProject[prName]) byProject[prName] = { team: a.project.team, total: 0 };
      byProject[prName].total += a.hours;
    }
  }

  const totalHours = activities.reduce((s, a) => s + a.hours, 0);

  return {
    week: `${format(start, 'MMM d')} – ${format(addDays(start, 4), 'MMM d, yyyy')}`,
    total_hours: totalHours,
    by_person: Object.entries(byPerson)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d]) => ({ name, team: d.team, hours: d.total, breakdown: d.by_type })),
    by_project: Object.entries(byProject)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, d]) => ({ project: name, team: d.team, hours: d.total })),
  };
}

// ─── server setup ────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'vework-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: unknown;
    switch (name) {
      case 'get_team_calendar':       result = await handleGetTeamCalendar(args);       break;
      case 'get_projects':            result = await handleGetProjects(args);            break;
      case 'get_project_detail':      result = await handleGetProjectDetail(args);      break;
      case 'get_employee_summary':    result = await handleGetEmployeeSummary(args);    break;
      case 'get_active_blockers':     result = await handleGetActiveBlockers(args);     break;
      case 'get_weekly_summary_data': result = await handleGetWeeklySummaryData(args);  break;
      case 'search_activities':       result = await handleSearchActivities(args);      break;
      case 'get_team_members':        result = await handleGetTeamMembers(args);        break;
      case 'get_hours_report':        result = await handleGetHoursReport(args);        break;
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MCP] Error in ${name}:`, msg);
    return {
      content: [{ type: 'text', text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[WorkTrack MCP] Server started on stdio');
}

main().catch((err) => {
  console.error('[WorkTrack MCP] Fatal:', err);
  process.exit(1);
});
