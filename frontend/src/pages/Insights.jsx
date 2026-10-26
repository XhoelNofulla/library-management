import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Insights() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [data, setData] = useState(null);
  const [recs, setRecs] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setSummary('');
    const params = userId ? { userId } : {};
    const [i, r] = await Promise.all([
      api.get('/insights', { params }),
      api.get('/insights/recommendations'),
    ]);
    setData(i.data);
    setRecs(r.data);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (user.role === 'ADMIN') api.get('/admin/users').then((r) => setUsers(r.data));
  }, [user.role]);

  async function summarize() {
    setLoading(true);
    try {
      const params = { summary: '1', ...(userId ? { userId } : {}) };
      const { data: d } = await api.get('/insights', { params });
      setSummary(d.summary || 'Përmbledhja nuk u gjenerua (kontrollo që Ollama është i ndezur).');
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <p>Po ngarkohet...</p>;

  return (
    <div>
      <div className="card">
        <h3>📊 Library Insights: {data.user.name}</h3>
        {user.role === 'ADMIN' && (
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Unë</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <ul>
          {data.insights.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <button onClick={summarize} disabled={loading}>
          {loading ? 'Po gjeneron...' : 'Përmbledh me AI'}
        </button>
        {summary && <p className="meta">🤖 {summary}</p>}
      </div>

      <h3>📖 Rekomandime për ty</h3>
      <table>
        <thead>
          <tr><th>Titulli</th><th>Autori</th><th>Zhanri</th><th>Pse</th></tr>
        </thead>
        <tbody>
          {recs.map((r) => (
            <tr key={r.title + r.author}>
              <td>{r.title}</td><td>{r.author}</td><td>{r.genre}</td><td>{r.reasons}</td>
            </tr>
          ))}
          {recs.length === 0 && <tr><td colSpan="4">Shto më shumë libra për të marrë rekomandime.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
