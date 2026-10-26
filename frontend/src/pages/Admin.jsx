import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/users');
    setUsers(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function changeRole(id, role) {
    await api.put(`/admin/users/${id}/role`, { role });
    load();
  }

  async function remove(id) {
    if (!window.confirm('Të fshihet përdoruesi dhe librat e tij?')) return;
    await api.delete(`/admin/users/${id}`);
    load();
  }

  return (
    <div>
      <h3>Përdoruesit</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Emri</th>
            <th>Email</th>
            <th>Roli</th>
            <th>Libra</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  disabled={u.id === me.id}
                  onChange={(e) => changeRole(u.id, e.target.value)}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td>{u._count.books}</td>
              <td>
                {u.id !== me.id && (
                  <button className="danger" onClick={() => remove(u.id)}>Fshi</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Të gjithë librat i shihni te faqja "Librat" (si admin shfaqen librat e të gjithë përdoruesve).
      </p>
    </div>
  );
}