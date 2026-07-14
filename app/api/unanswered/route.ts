import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync, unlinkSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const UNANSWERED_DIR = path.join(process.cwd(), 'data', 'unanswered');
const OLD_FILE = path.join(UNANSWERED_DIR, 'questions.json');

interface UnansweredEntry {
  question: string;
  timestamp: string;
  topScore: number;
}

function ensureDir() {
  if (!existsSync(UNANSWERED_DIR)) {
    mkdirSync(UNANSWERED_DIR, { recursive: true });
  }
}

function todayFile(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(UNANSWERED_DIR, `${date}.json`);
}

function loadDayEntries(filePath: string): UnansweredEntry[] {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function saveDayEntries(filePath: string, entries: UnansweredEntry[]) {
  ensureDir();
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf-8');
  renameSync(tmpPath, filePath);
}

function listDayFiles(from?: string, to?: string): string[] {
  ensureDir();
  try {
    return readdirSync(UNANSWERED_DIR)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .filter((f) => {
        const date = f.replace('.json', '');
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      });
  } catch {
    return [];
  }
}

function loadAllEntries(from?: string, to?: string): UnansweredEntry[] {
  const all: UnansweredEntry[] = [];
  for (const f of listDayFiles(from, to)) {
    all.push(...loadDayEntries(path.join(UNANSWERED_DIR, f)));
  }
  return all;
}

// Migrate old questions.json into daily files (runs once)
let migrated = false;
function migrateOldFile() {
  if (migrated) return;
  migrated = true;
  if (!existsSync(OLD_FILE)) return;
  try {
    const old: UnansweredEntry[] = JSON.parse(readFileSync(OLD_FILE, 'utf-8'));
    const byDay: Record<string, UnansweredEntry[]> = {};
    for (const entry of old) {
      const day = entry.timestamp.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(entry);
    }
    ensureDir();
    for (const day of Object.keys(byDay)) {
      const fp = path.join(UNANSWERED_DIR, `${day}.json`);
      const existing = loadDayEntries(fp);
      saveDayEntries(fp, [...existing, ...byDay[day]]);
    }
    unlinkSync(OLD_FILE);
  } catch {}
}

const noCache = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

export async function GET(req: NextRequest) {
  migrateOldFile();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const day = searchParams.get('day');
  const format = searchParams.get('format');

  // ?format=dates — список доступных дат
  if (format === 'dates') {
    const dates = listDayFiles(from, to).map((f) => f.replace('.json', ''));
    return NextResponse.json(dates, { headers: noCache });
  }

  const entries = day
    ? loadDayEntries(path.join(UNANSWERED_DIR, `${day}.json`))
    : loadAllEntries(from, to);

  return NextResponse.json(entries, { headers: noCache });
}

export async function POST(req: NextRequest) {
  try {
    const { question, topScore } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    migrateOldFile();
    const filePath = todayFile();
    const entries = loadDayEntries(filePath);

    const dayAgo = Date.now() - 86_400_000;
    const isDuplicate = entries.some(
      (e) =>
        e.question.toLowerCase() === question.trim().toLowerCase() &&
        new Date(e.timestamp).getTime() > dayAgo,
    );

    if (!isDuplicate) {
      entries.push({
        question: question.trim().slice(0, 500),
        timestamp: new Date().toISOString(),
        topScore: typeof topScore === 'number' ? Math.round(topScore * 1000) / 1000 : 0,
      });

      saveDayEntries(filePath, entries);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
