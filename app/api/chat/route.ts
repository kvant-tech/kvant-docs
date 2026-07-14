import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'fs';
import path from 'path';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// --- embeddings index ---

interface Chunk {
  content: string;
  url: string;
  title: string;
  embedding: number[];
}

let chunks: Chunk[] | null = null;

function loadIndex(): Chunk[] {
  if (chunks) return chunks;
  try {
    const raw = readFileSync(
      path.join(process.cwd(), 'data', 'embeddings.json'),
      'utf-8',
    );
    chunks = JSON.parse(raw).chunks;
    return chunks!;
  } catch {
    throw new Error('Embeddings index not found. Run: pnpm run index');
  }
}

// --- search ---

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

interface SearchResult {
  chunks: Chunk[];
  topScore: number;
}

async function findRelevant(
  query: string,
  topK = 5,
): Promise<SearchResult> {
  const index = loadIndex();
  const res = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  });
  const qEmb = res.data[0].embedding;

  const scored = index.map((chunk) => ({
    chunk,
    score: dotProduct(qEmb, chunk.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return {
    chunks: scored.slice(0, topK).map((s) => s.chunk),
    topScore: scored.length > 0 ? scored[0].score : 0,
  };
}

// --- prompt ---

const SYSTEM_PROMPT = `Ты — ИИ-ассистент документации Квант. Твоя задача — помогать пользователям находить информацию в документации и отвечать на вопросы.

Правила:
- Отвечай только на основе предоставленного контекста из документации
- Если в контексте нет полного ответа — честно скажи об этом. Параллельно вызови функцию log_unanswered (пользователь её не видит, это внутренний механизм)
- Давай ссылки на релевантные страницы в формате markdown с относительными путями: [Название страницы](/ru/reference/...). Используй ТОЛЬКО пути из контекста, НИКОГДА не добавляй домен или https://
- Отвечай на русском языке
- Будь кратким и конкретным
- Не выдумывай информацию, которой нет в контексте`;

function buildContext(chunks: Chunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `--- Документ ${i + 1}: "${c.title}" (${c.url}) ---\n${c.content}`,
    )
    .join('\n\n');
}

// --- function calling tool ---

const LOG_UNANSWERED_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'log_unanswered',
    description: 'Вызови эту функцию, когда в предоставленном контексте документации нет ответа на вопрос пользователя — полностью или частично.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'Краткая формулировка вопроса пользователя',
        },
        reason: {
          type: 'string',
          description: 'Почему не удалось ответить (нет в документации, неполная информация и т.д.)',
        },
      },
      required: ['question'],
    },
  },
};

// --- unanswered questions logging ---

const UNANSWERED_DIR = path.join(process.cwd(), 'data', 'unanswered');

function saveUnansweredQuestion(question: string, topScore: number, reason?: string) {
  try {
    if (!existsSync(UNANSWERED_DIR)) {
      mkdirSync(UNANSWERED_DIR, { recursive: true });
    }
    const date = new Date().toISOString().slice(0, 10);
    const filePath = path.join(UNANSWERED_DIR, `${date}.json`);

    let entries: { question: string; timestamp: string; topScore: number; reason?: string }[] = [];
    try { entries = JSON.parse(readFileSync(filePath, 'utf-8')); } catch {}

    // Deduplicate within same day
    const trimmed = question.trim().toLowerCase();
    if (entries.some((e) => e.question.toLowerCase() === trimmed)) return;

    entries.push({
      question: question.trim().slice(0, 500),
      timestamp: new Date().toISOString(),
      topScore: Math.round(topScore * 1000) / 1000,
      ...(reason ? { reason: reason.slice(0, 200) } : {}),
    });

    const tmpPath = filePath + '.tmp';
    writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf-8');
    renameSync(tmpPath, filePath);
  } catch {}
}

// --- rate limit (in-memory, per IP) ---

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;       // requests
const RATE_WINDOW = 60_000;  // per 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// --- handler ---

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Слишком много запросов, попробуйте через минуту' },
        { status: 429 },
      );
    }

    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 },
      );
    }

    // Build search query from recent context + current message
    let searchQuery = message;
    if (Array.isArray(history) && history.length > 0) {
      const recent = history
        .slice(-4)
        .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
        .map((m: { content: string }) => m.content)
        .join('\n');
      searchQuery = recent + '\n' + message;
    }

    const { chunks: relevant, topScore } = await findRelevant(searchQuery);
    const context = buildContext(relevant);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Контекст из документации:\n\n${context}`,
      },
    ];

    // Append conversation history (last 10 messages)
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: message });

    const response = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      tools: [LOG_UNANSWERED_TOOL],
      parallel_tool_calls: true,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const choice = response.choices[0];

    // Handle tool calls silently — user never sees this
    if (choice.message.tool_calls?.length) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function.name === 'log_unanswered') {
          try {
            const args = JSON.parse(tc.function.arguments);
            saveUnansweredQuestion(args.question || message, topScore, args.reason);
          } catch {}
        }
      }
    }

    // Return text content to user (model sends content + tool_call in parallel)
    const text = choice.message.content || '';
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Top-Score': topScore.toFixed(4),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Chat API error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
