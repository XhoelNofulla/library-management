import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Gabim gjatë hyrjes');
    }
  }

  return (
    <form className="card auth" onSubmit={submit}>
      <h2>Hyr</h2>
      {error && <p className="error">{error}</p>}
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Fjalëkalimi" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button>Hyr</button>
      <p>Nuk ke llogari? <Link to="/register">Regjistrohu</Link></p>
    </form>
  );
}
