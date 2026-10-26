import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Gabim gjatë regjistrimit');
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>Regjistrohu</h2>
      {error && <p className="error">{error}</p>}
      <input placeholder="Emri" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Fjalëkalimi (min. 6)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button>Regjistrohu</button>
      <p>Ke llogari? <Link to="/login">Hyr</Link></p>
    </form>
  );
}
