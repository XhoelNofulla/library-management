import { useState } from 'react';
import api from '../api';

const EXAMPLES = [
  'Who owns the most books?',
  'Which is the most popular book?',
  'Show the five most expensive books.',
  'Which genre has the most books?',
  'Show all completed books',
];

export default function Assistant() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(q) {
    const text = (q ?? question).trim();
    if (!text) return;
    setQuestion(text);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/ai/query', { question: text });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gabim gjatë pyetjes');
    } finally {
      setLoading(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    ask();
  }

  return (
    <div>
      <form className="card" onSubmit={submit}>
        <h3>🤖 AI Assistant</h3>
        <p>Pyet në gjuhë natyrore për librat në bibliotekë.</p>
        <div className="filters">
          <input
            style={{ flex: 1 }}
            placeholder="p.sh. Show the five most expensive books"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={300}
          />
          <button disabled={loading}>{loading ? 'Po mendon...' : 'Pyet'}</button>
        </div>
        <div className="chips">
          {EXAMPLES.map((ex) => (
            <button type="button" key={ex} className="secondary chip" onClick={() => ask(ex)}>
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div>
          <p className="meta">
            Burimi: {result.source === 'llm' ? 'Ollama (LLM)' : 'Rregulla me fjalë kyçe'} ·{' '}
            {result.rows.length} rezultate
          </p>
          <table>
            <thead>
              <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.columns.map((c) => (
                    <td key={c}>{row[c] === null ? '-' : String(row[c])}</td>
                  ))}
                </tr>
              ))}
              {result.rows.length === 0 && (
                <tr><td>Asnjë rezultat.</td></tr>
              )}
            </tbody>
          </table>
          <details className="meta">
            <summary>Shiko SQL-in e gjeneruar</summary>
            <pre>{result.sql}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
