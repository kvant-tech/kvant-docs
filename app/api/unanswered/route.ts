import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const FILE_PATH = path.join(process.cwd(), 'data', 'unanswered-questions.json');

interface UnansweredEntry {
  question: string;
  timestamp: string;
  topScore: number;
}

function loadEntries(): UnansweredEntry[] {
  try {
    return JSON.parse(readFileSync(FILE_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveEntries(entries: UnansweredEntry[]) {
  writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

export async function GET() {
  return NextResponse.json(loadEntries());
}

export async function POST(req: NextRequest) {
  try {
    const { question, topScore } = await req.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const entries = loadEntries();

    // Deduplicate: skip if same question was logged in last 24h
    const dayAgo = Date.now() - 86_400_000;
    const isDuplicate = entries.some(
      (e) =>
        e.question.toLowerCase() === question.toLowerCase() &&
        new Date(e.timestamp).getTime() > dayAgo,
    );

    if (!isDuplicate) {
      entries.push({
        question: question.slice(0, 500),
        timestamp: new Date().toISOString(),
        topScore: typeof topScore === 'number' ? Math.round(topScore * 1000) / 1000 : 0,
      });

      // Keep last 500 entries
      if (entries.length > 500) entries.splice(0, entries.length - 500);

      saveEntries(entries);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
