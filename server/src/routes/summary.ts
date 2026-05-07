import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { buildWeeklySummaryData, generateSummaryEmail, sendWeeklySummaryEmail } from '../services/summary';

const router = Router();

router.post('/send', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await sendWeeklySummaryEmail(false);
    res.json({ message: 'Summary email sent successfully', weekStart: result.summaryData.weekStart });
  } catch (err) {
    console.error('Failed to send summary email:', err);
    res.status(500).json({ error: 'Failed to send summary email' });
  }
});

router.get('/preview', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const summaryData = await buildWeeklySummaryData();
    const emailBody = await generateSummaryEmail(summaryData);
    res.json({ summaryData, emailBody });
  } catch (err) {
    console.error('Failed to generate summary:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;
