'use client';

import { useEffect, useState } from 'react';

interface Entry {
  question: string;
  timestamp: string;
  topScore: number;
}

export default function UnansweredQuestionsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load available dates
  useEffect(() => {
    fetch('/api/unanswered?format=dates', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: string[]) => setDates(data.reverse()))
      .catch(() => {});
  }, []);

  // Load entries for selected day (or all)
  useEffect(() => {
    setLoading(true);
    const url = selectedDay
      ? `/api/unanswered?day=${selectedDay}`
      : '/api/unanswered';
    fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: Entry[]) => setEntries(data.reverse()))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedDay]);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Вопросы без ответа в документации</h1>
      <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
        Вопросы, на которые ИИ-ассистент не смог найти ответ. Используйте для планирования новых статей.
      </p>

      <div style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <option value="">Все дни ({entries.length})</option>
          {dates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {selectedDay && (
          <span style={{ fontSize: 13, color: '#999' }}>
            Записей: {entries.length}
          </span>
        )}
      </div>

      {loading && <p>Загрузка...</p>}

      {!loading && entries.length === 0 && (
        <p style={{ color: '#999' }}>Пока нет записей</p>
      )}

      {!loading && entries.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e5e5', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Вопрос</th>
              <th style={{ padding: '8px 12px', width: 80 }}>Score</th>
              <th style={{ padding: '8px 12px', width: 160 }}>Дата</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 12px' }}>{e.question}</td>
                <td style={{ padding: '8px 12px', color: e.topScore < 0.3 ? '#e53e3e' : '#666' }}>
                  {e.topScore.toFixed(3)}
                </td>
                <td style={{ padding: '8px 12px', color: '#999', fontSize: 13 }}>
                  {new Date(e.timestamp).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
