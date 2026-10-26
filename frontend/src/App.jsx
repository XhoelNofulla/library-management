import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Books from './pages/Books';
import Admin from './pages/Admin';
import Assistant from './pages/Assistant';
import Insights from './pages/Insights';
import './App.css';

function Protected({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" />;
  return children;
}

function Nav() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <nav>
      <strong>📚 Library</strong>
      <Link to="/">Librat</Link>
      <Link to="/assistant">AI Assistant</Link>
      <Link to="/insights">Insights</Link>
      {user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
      <span className="spacer" />
      <span>{user.name} ({user.role})</span>
      <button className="secondary" onClick={logout}>Dil</button>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Protected><Books /></Protected>} />
            <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
            <Route path="/insights" element={<Protected><Insights /></Protected>} />
            <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
