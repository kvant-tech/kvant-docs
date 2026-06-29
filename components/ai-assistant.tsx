'use client';

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('https://')) return trimmed;
  return '#';
}

function renderMarkdown(text: string) {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="ai-code">$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, url) =>
        `<a href="${sanitizeUrl(url)}" class="ai-link" target="_blank" rel="noopener noreferrer">${label}</a>`,
    )
    .replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Ошибка ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        const snapshot = assistantContent;
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: snapshot },
        ]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Не удалось получить ответ: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => {
    autoResize();
  }, [input, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={`
          fixed z-50 flex flex-col
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-700
          shadow-2xl
          transition-all duration-300 ease-out
          ${open
            ? 'bottom-0 right-0 w-full h-[85dvh] md:bottom-6 md:right-6 md:w-[420px] md:h-[600px] md:rounded-2xl rounded-t-2xl opacity-100 scale-100'
            : 'bottom-6 right-6 w-[420px] h-[600px] rounded-2xl opacity-0 scale-95 pointer-events-none'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Квант Ассистент
              </h3>
              <p className="text-xs text-neutral-500">Поиск по документации</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
              <Sparkles size={32} className="text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Задайте вопрос
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Я найду ответ в документации и дам ссылки на нужные страницы
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md'
                  }
                `}
              >
                {msg.role === 'assistant' ? (
                  <div
                    className="ai-markdown"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.content || '...'),
                    }}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700"
        >
          <div className="flex items-end gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите вопрос..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 resize-none outline-none max-h-24"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-30 hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          fixed bottom-6 right-6 z-50
          w-14 h-14 rounded-full
          bg-indigo-600 hover:bg-indigo-700
          text-white shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300
          ${open ? 'opacity-0 scale-0 pointer-events-none' : 'opacity-100 scale-100'}
        `}
        aria-label="Открыть ассистента"
      >
        <MessageCircle size={24} />
      </button>

      <style jsx global>{`
        .ai-markdown p { margin: 0; }
        .ai-markdown p + p { margin-top: 0.5em; }
        .ai-markdown ul { list-style: disc; padding-left: 1.2em; margin: 0.4em 0; }
        .ai-markdown li { margin: 0.15em 0; }
        .ai-markdown strong { font-weight: 600; }
        .ai-code {
          background: rgba(0,0,0,0.06);
          padding: 0.1em 0.35em;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: ui-monospace, monospace;
        }
        :where(.dark) .ai-code {
          background: rgba(255,255,255,0.1);
        }
        .ai-link {
          color: #4f46e5;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        :where(.dark) .ai-link {
          color: #818cf8;
        }
        .ai-link:hover {
          text-decoration-thickness: 2px;
        }
      `}</style>
    </>
  );
}
