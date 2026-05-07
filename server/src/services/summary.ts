import Anthropic from '@anthropic-ai/sdk';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 5); // Mon–Fri
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function buildWeeklySummaryData() {
  const { start, end } = getWeekRange();

  const activities = await prisma.activity.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      user: { select: { id: true, name: true, team: true } },
      project: { select: { id: true, name: true } },
      subtask: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  // Group by user
  const byUser: Record<string, {
    name: string;
    team: string;
    totalHours: number;
    projectHours: Record<string, number>;
    meetings: number;
    adminHours: number;
    blockers: string[];
    entries: Array<{
      date: string;
      type: string;
      project?: string;
      subtask?: string;
      hours: number;
      notes?: string | null;
      blocker?: string | null;
      meetingType?: string | null;
    }>;
  }> = {};

  for (const act of activities) {
    const uid = act.userId;
    if (!byUser[uid]) {
      byUser[uid] = {
        name: act.user.name,
        team: act.user.team,
        totalHours: 0,
        projectHours: {},
        meetings: 0,
        adminHours: 0,
        blockers: [],
        entries: [],
      };
    }
    const u = byUser[uid];
    u.totalHours += act.hours;
    if (act.type === 'PROJECT' && act.project) {
      u.projectHours[act.project.name] = (u.projectHours[act.project.name] || 0) + act.hours;
    } else if (act.type === 'MEETING') {
      u.meetings += act.hours;
    } else {
      u.adminHours += act.hours;
    }
    if (act.blocker) u.blockers.push(act.blocker);
    u.entries.push({
      date: act.date.toISOString().split('T')[0],
      type: act.type,
      project: act.project?.name,
      subtask: act.subtask?.name,
      hours: act.hours,
      notes: act.notes,
      blocker: act.blocker,
      meetingType: act.meetingType,
    });
  }

  return { weekStart: start.toISOString().split('T')[0], weekEnd: end.toISOString().split('T')[0], byUser };
}

export async function generateSummaryEmail(summaryData: Awaited<ReturnType<typeof buildWeeklySummaryData>>): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a helpful assistant summarizing a team's weekly work for their manager.

Here is the week's activity data in JSON:
${JSON.stringify(summaryData, null, 2)}

Write a concise weekly summary email. Structure it as:

1. Team overview (3-4 sentences: total project hours, meetings, any at-risk projects)
2. Per-person summary — for each person:
   - Name and status emoji (✅ good, ⚠️ concern)
   - 2-3 bullet points on what they shipped
   - Hours by project
   - Any blockers flagged
3. 3 key insights or recommendations for the manager

Keep the tone professional but warm. Plain text, no markdown.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  return content.text;
}

export async function sendWeeklySummaryEmail(previewOnly = false) {
  const summaryData = await buildWeeklySummaryData();
  const emailBody = await generateSummaryEmail(summaryData);

  if (previewOnly) {
    return { summaryData, emailBody };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `WorkTrack <${process.env.SMTP_USER}>`,
    to: process.env.BOSS_EMAIL,
    subject: `WorkTrack Weekly Summary — Week of ${summaryData.weekStart}`,
    text: emailBody,
  });

  return { summaryData, emailBody };
}
