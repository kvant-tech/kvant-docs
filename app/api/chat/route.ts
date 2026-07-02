import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
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
- Если в контексте нет ответа — честно скажи об этом
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

    const stream = await getOpenAI().chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1024,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch {
          controller.enqueue(
            encoder.encode('\n\n[Ошибка генерации ответа]'),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
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
