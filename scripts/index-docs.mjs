#!/usr/bin/env node
import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative, dirname } from 'path';
import OpenAI from 'openai';

const CONTENT_DIR = 'content/ru';
const OUTPUT_FILE = 'data/embeddings.json';
const MODEL = 'text-embedding-3-small';
const MAX_CHUNK_CHARS = 1200;

const openai = new OpenAI();

// --- helpers ---

async function walkMdx(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walkMdx(full)));
    else if (e.name.endsWith('.mdx') || e.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function filePathToUrl(filePath) {
  let url = '/' + relative('content', filePath);
  url = url.replace(/\/index\.mdx?$/, '');
  url = url.replace(/\.mdx?$/, '');
  return url;
}

function stripMdx(raw) {
  return raw
    .replace(/^---[\s\S]*?---/m, '')            // frontmatter
    .replace(/^import\s+.*$/gm, '')              // imports
    .replace(/<[A-Z][^>]*\/>/g, '')              // self-closing JSX
    .replace(/<[A-Z][^>]*>[\s\S]*?<\/[A-Z][^>]*>/g, '') // JSX blocks
    .replace(/<[a-z][^>]*>/g, '')                // html open tags
    .replace(/<\/[a-z][^>]*>/g, '')              // html close tags
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')    // images → alt text
    .replace(/\{[^}]*\}/g, '')                   // JSX expressions
    .trim();
}

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function chunkText(text, maxLen) {
  // Split by headings first
  const sections = text.split(/(?=^##\s)/m).filter(s => s.trim());
  const chunks = [];

  for (const section of sections) {
    if (section.length <= maxLen) {
      chunks.push(section.trim());
      continue;
    }
    // Split long sections by double newlines
    const paragraphs = section.split(/\n\n+/);
    let current = '';
    for (const p of paragraphs) {
      if (current.length + p.length + 2 > maxLen && current) {
        chunks.push(current.trim());
        current = '';
      }
      current += (current ? '\n\n' : '') + p;
    }
    if (current.trim()) chunks.push(current.trim());
  }

  return chunks.filter(c => c.length > 30); // skip tiny chunks
}

// --- main ---

async function main() {
  console.log('Reading MDX files...');
  const files = await walkMdx(CONTENT_DIR);
  console.log(`Found ${files.length} files`);

  const allChunks = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    const clean = stripMdx(raw);
    if (!clean) continue;

    const title = extractTitle(clean) || filePathToUrl(file).split('/').pop();
    const url = filePathToUrl(file);
    const chunks = chunkText(clean, MAX_CHUNK_CHARS);

    for (const content of chunks) {
      allChunks.push({ content, url, title });
    }
  }

  console.log(`Created ${allChunks.length} chunks, generating embeddings...`);

  // Batch embed (OpenAI supports up to 2048 inputs per request)
  const batchSize = 100;
  const embeddings = [];

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    const res = await openai.embeddings.create({
      model: MODEL,
      input: batch.map(c => c.content),
    });
    embeddings.push(...res.data.map(d => d.embedding));
    console.log(`  Embedded ${Math.min(i + batchSize, allChunks.length)}/${allChunks.length}`);
  }

  const index = allChunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, JSON.stringify({ chunks: index }));

  const sizeMB = (Buffer.byteLength(JSON.stringify({ chunks: index })) / 1024 / 1024).toFixed(1);
  console.log(`Done! Saved ${index.length} chunks to ${OUTPUT_FILE} (${sizeMB} MB)`);
}

main().catch(err => {
  console.error('Indexing failed:', err.message);
  process.exit(1);
});
