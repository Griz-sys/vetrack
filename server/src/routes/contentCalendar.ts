import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/14AwAOybMLc5x5OIHmJq-sMENOGey9izPhSjsZnjEo0A/export?format=csv&gid=956532897';

const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04',
  May: '05', Jun: '06', Jul: '07', Aug: '08',
  Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseSheetDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2]];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, '0')}`;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (ch !== '\r') field += ch;
    }
  }
  if (row.length > 0 || field) { row.push(field); rows.push(row); }
  return rows;
}

router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(SHEET_URL);
    if (!resp.ok) throw new Error(`Sheet fetch failed: ${resp.status}`);
    const text = await resp.text();
    const rows = parseCSV(text);

    // Row 0 is the header; cols: 0=DateOfEntry, 1=Category, 2=Type, 3=Channel,
    // 4=Visual/Copy, 5=Caption, 6=Description, 7=DateOfPosting, 8=Status, 9=Link, 10=Remarks
    const items = rows.slice(1)
      .map((cols) => ({
        type:        cols[2]?.trim() ?? '',
        channel:     cols[3]?.trim() ?? '',
        visualCopy:  cols[4]?.trim() ?? '',
        caption:     cols[5]?.trim() ?? '',
        description: cols[6]?.trim() ?? '',
        rawDate:     cols[7]?.trim() ?? '',
        date:        parseSheetDate(cols[7]?.trim() ?? ''),
        status:      cols[8]?.trim() ?? '',
        link:        cols[9]?.trim() ?? '',
        remarks:     cols[10]?.trim() ?? '',
      }))
      .filter((item) => item.date !== null);

    return res.json(items);
  } catch (err) {
    console.error('[content-calendar]', err);
    return res.status(500).json({ error: 'Failed to load content calendar' });
  }
});

export default router;
