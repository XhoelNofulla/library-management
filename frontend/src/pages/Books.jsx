import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

const STATUS_LABELS = {
  TO_READ: "Për t'u lexuar",
  READING: 'Duke lexuar',
  COMPLETED: 'Përfunduar',
};

const empty = { title: '', author: '', genre: '', status: 'TO_READ', price: '', pages: '' };

export default function Books() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const params = {};
    if (filterGenre) params.genre = filterGenre;
    if (filterStatus) params.status = filterStatus;
    const { data } = await api.get('/books', { params });
    setBooks(data);
  }, [filterGenre, filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editId) await api.put(`/books/${editId}`, form);
      else await api.post('/books', form);
      setForm(empty);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Gabim');
    }
  }

  function startEdit(b) {
    setEditId(b.id);
    setForm({
      title: b.title,
      author: b.author,
      genre: b.genre,
      status: b.status,
      price: b.price ?? '',
      pages: b.pages ?? '',
    });
  }

  async function remove(id) {
    if (!window.confirm('Të fshihet libri?')) return;
    await api.delete(`/books/${id}`);
    load();
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <form className="card" onSubmit={submit}>
        <h3>{editId ? 'Ndrysho librin' : 'Shto libër'}</h3>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          <input placeholder="Titulli" value={form.title} onChange={set('title')} required />
          <input placeholder="Autori" value={form.author} onChange={set('author')} required />
          <input placeholder="Zhanri" value={form.genre} onChange={set('genre')} required />
          <select value={form.status} onChange={set('status')}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input placeholder="Çmimi" type="number" step="0.01" value={form.price} onChange={set('price')} />
          <input placeholder="Faqe" type="number" value={form.pages} onChange={set('pages')} />
        </div>
        <button>{editId ? 'Ruaj' : 'Shto'}</button>
        {editId && (
          <button
            type="button"
            className="secondary"
            onClick={() => { setEditId(null); setForm(empty); }}
          >
            Anulo
          </button>
        )}
      </form>

      <div className="filters">
        <input
          placeholder="Filtro sipas zhanrit"
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Të gjitha statuset</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Titulli</th>
            <th>Autori</th>
            <th>Zhanri</th>
            <th>Statusi</th>
            <th>Çmimi</th>
            <th>Faqe</th>
            {user.role === 'ADMIN' && <th>Pronari</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {books.map((b) => (
            <tr key={b.id}>
              <td>{b.title}</td>
              <td>{b.author}</td>
              <td>{b.genre}</td>
              <td><span className={`badge ${b.status}`}>{STATUS_LABELS[b.status]}</span></td>
              <td>{b.price ?? '-'}</td>
              <td>{b.pages ?? '-'}</td>
              {user.role === 'ADMIN' && <td>{b.user?.name}</td>}
              <td>
                <button className="secondary" onClick={() => startEdit(b)}>Ndrysho</button>
                <button className="danger" onClick={() => remove(b.id)}>Fshi</button>
              </td>
            </tr>
          ))}
          {books.length === 0 && (
            <tr><td colSpan="8">Asnjë libër.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
