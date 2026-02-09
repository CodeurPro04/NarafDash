import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService } from '../../services/api';
import { Plus, Edit, Trash2, UserCheck, UserX, Search, Mail, Phone } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const roleMapping = {
    admin: 'Administrateur',
    gestionnaire: 'Gestionnaire',
    agent: 'Agent Immobilier',
    proprietaire: 'Propriétaire',
    visiteur: 'Visiteur',
    investisseur: 'Investisseur',
    entreprise: 'Entreprise'
  };

  const reverseRoleMapping = {
    Administrateur: 'admin',
    Gestionnaire: 'gestionnaire',
    'Agent Immobilier': 'agent',
    Propriétaire: 'proprietaire',
    Visiteur: 'visiteur',
    Investisseur: 'investisseur',
    Entreprise: 'entreprise'
  };

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
      const email = (user.email || '').toLowerCase();
      const matchesSearch = fullName.includes(searchLower) || email.includes(searchLower);
      const roleSlug = reverseRoleMapping[user.role?.name || user.role] || user.role?.slug || user.role;
      const matchesRole = filterRole === 'all' || roleSlug === filterRole;
      const matchesStatus = filterStatus === 'all' || user.is_active === (filterStatus === 'active');
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filterRole, filterStatus]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    try {
      await adminService.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await adminService.toggleUserStatus(userId);
      await loadUsers();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      if (!userData.first_name || !userData.last_name || !userData.email || !userData.role) {
        alert('Tous les champs sont requis');
        return;
      }
      if (userData.role === 'agent' && !userData.agent_type) {
        alert('Veuillez selectionner le type d\'agent');
        return;
      }

      if (editingUser) {
        const response = await adminService.updateUser(editingUser.id, userData);
        setUsers((prev) => prev.map((user) => user.id === editingUser.id ? response.data : user));
      } else {
        const response = await adminService.createUser(userData);
        setUsers((prev) => [response.data, ...prev]);
      }
      setShowModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const getRoleLabel = (role) => {
    const mapped = reverseRoleMapping[role] || role;
    return roleMapping[mapped] || mapped;
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="chip">Administration</p>
                <h1 className="text-3xl font-semibold mt-3">Gestion des utilisateurs</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Créer, éditer et activer les comptes.</p>
              </div>
              <button onClick={handleAddUser} className="btn-primary">
                <Plus className="h-4 w-4" />
                Nouvel utilisateur
              </button>
            </div>

            <div className="surface-panel p-5 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="agent">Agent</option>
                <option value="proprietaire">Propriétaire</option>
                <option value="visiteur">Visiteur</option>
                <option value="investisseur">Investisseur</option>
                <option value="entreprise">Entreprise</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="surface-panel p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                          <span className="text-lg font-semibold">
                            {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-semibold">{user.first_name} {user.last_name}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="chip">{getRoleLabel(user.role?.name || user.role)}</span>
                            {user.agent_type && (user.role?.slug === 'agent' || user.role === 'agent') && (
                              <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.12)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">
                                {user.agent_type}
                              </span>
                            )}
                            {!user.is_active && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(199,109,74,0.12)] px-3 py-1 text-xs font-semibold text-[rgb(var(--clay))]">
                                <span className="h-2 w-2 rounded-full bg-[rgb(var(--clay))]" />
                                En attente d'activation
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,42,46,0.12)] px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.6)]">
                        <span className={`h-2 w-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-[rgba(15,42,46,0.6)] mb-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {user.phone || 'Non spécifié'}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className="btn-ghost flex-1"
                        title={user.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        {user.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button onClick={() => handleEditUser(user)} className="btn-ghost flex-1">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="btn-ghost flex-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="surface-card w-full max-w-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const userData = {
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    role: formData.get('role'),
                    agent_type: formData.get('agent_type') || null,
                    is_active: formData.get('is_active') === 'true'
                  };
                  if (!editingUser) {
                    userData.password = formData.get('password');
                  }
                  handleSaveUser(userData);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="first_name" defaultValue={editingUser?.first_name} required placeholder="Prénom" className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                    <input name="last_name" defaultValue={editingUser?.last_name} required placeholder="Nom" className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <input name="email" type="email" defaultValue={editingUser?.email} required placeholder="Email" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                    <input name="phone" defaultValue={editingUser?.phone} placeholder="Téléphone" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                    {!editingUser && (
                      <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm" />
                    )}
                    <select name="role" defaultValue={editingUser?.role?.slug || editingUser?.role} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm">
                      <option value="admin">Administrateur</option>
                      <option value="gestionnaire">Gestionnaire</option>
                      <option value="agent">Agent immobilier</option>
                      <option value="proprietaire">Propriétaire</option>
                      <option value="visiteur">Visiteur</option>
                      <option value="investisseur">Investisseur</option>
                      <option value="entreprise">Entreprise</option>
                    </select>
                    <select name="agent_type" defaultValue={editingUser?.agent_type || ''} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm">
                      <option value="">Type agent (optionnel)</option>
                      <option value="constructeur">Constructeur</option>
                      <option value="immobilier">Immobilier</option>
                      <option value="investissement">Investissement</option>
                    </select>
                    <select name="is_active" defaultValue={editingUser?.is_active ? 'true' : 'false'} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2 text-sm">
                      <option value="true">Actif</option>
                      <option value="false">Inactif</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Annuler</button>
                    <button type="submit" className="btn-primary">{editingUser ? 'Modifier' : 'Ajouter'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default UserManagement;
