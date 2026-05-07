import cron from 'node-cron';
import { sendWeeklySummaryEmail } from './summary';

export function startCronJobs() {
  // Every Friday at 17:00
  cron.schedule('0 17 * * 5', async () => {
    console.log('[CRON] Running Friday weekly summary email...');
    try {
      await sendWeeklySummaryEmail(false);
      console.log('[CRON] Weekly summary email sent.');
    } catch (err) {
      console.error('[CRON] Failed to send weekly summary:', err);
    }
  });

  console.log('[CRON] Jobs scheduled (Friday 17:00 summary email)');
}
