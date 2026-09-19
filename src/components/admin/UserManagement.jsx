import React, { useEffect, useMemo, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { adminService, countryService } from '../../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
  Search,
  Mail,
  Phone,
  Users,
  ShieldCheck,
  Clock,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const PER_PAGE = 12;

const roleMapping = {
  admin: 'Administrateur',
  gestionnaire: 'Gestionnaire',
  agent: 'Agent Immobilier',
  proprietaire: 'Propriétaire',
  visiteur: 'Visiteur',
  investisseur: 'Investisseur',
  entreprise: 'Entreprise',
};

const reverseRoleMapping = {
  Administrateur: 'admin',
  Gestionnaire: 'gestionnaire',
  'Agent Immobilier': 'agent',
  Propriétaire: 'proprietaire',
  Visiteur: 'visiteur',
  Investisseur: 'investisseur',
  Entreprise: 'entreprise',
};

const getRoleLabel = (role) => {
  const mapped = reverseRoleMapping[role] || role;
  return roleMapping[mapped] || mapped || 'Role';
};

const getRoleSlug = (user) => user?.role?.slug || reverseRoleMapping[user?.role?.name] || user?.role;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [countries, setCountries] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, agents: 0 });

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  // Recherche debouncee (350ms) : on evite une requete par frappe.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Revenir a la page 1 des qu'un filtre change.
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterStatus]);

  useEffect(() => {
    countryService.getAll()
      .then((response) => setCountries(extractPayload(response)))
      .catch((error) => console.error('Erreur lors du chargement des pays:', error));
  }, []);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterRole, filterStatus]);

  const loadUsers = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await adminService.getUsers({
        page,
        per_page: PER_PAGE,
        search: search || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
      });
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setUsers(Array.isArray(list) ? list : []);
      setLastPage(payload.last_page || 1);
      setTotalUsers(payload.total ?? (Array.isArray(list) ? list.length : 0));
      const responseStats = response?.data?.stats;
      if (responseStats) {
        setStats({
          total: responseStats.total || 0,
          active: responseStats.active || 0,
          pending: responseStats.pending || 0,
          agents: responseStats.agents || 0,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const kpis = useMemo(() => ([
    { key: 'total', label: 'Utilisateurs', value: stats.total, icon: Users },
    { key: 'active', label: 'Comptes actifs', value: stats.active, icon: ShieldCheck },
    { key: 'pending', label: "En attente d'activation", value: stats.pending, icon: Clock, highlight: stats.pending > 0 },
    { key: 'agents', label: 'Agents', value: stats.agents, icon: UserCog },
  ]), [stats]);

  const handleAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Supprimer le compte de ${user.first_name} ${user.last_name} ?`)) return;
    try {
      await adminService.deleteUser(user.id);
      await loadUsers({ silent: true });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert("Erreur lors de la suppression de l'utilisateur.");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id);
      await loadUsers({ silent: true });
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      alert('Erreur lors du changement de statut.');
    }
  };

  const handleSaveUser = async (userData) => {
    if (!userData.first_name || !userData.last_name || !userData.email || !userData.role) {
      alert('Tous les champs sont requis.');
      return;
    }
    if (userData.role === 'agent' && !userData.agent_type) {
      alert("Veuillez selectionner le type d'agent.");
      return;
    }
    if (!['gestionnaire', 'admin', 'administrateur'].includes(userData.role) && !userData.country_code) {
      alert('Veuillez selectionner le pays de rattachement.');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        await adminService.updateUser(editingUser.id, userData);
      } else {
        await adminService.createUser(userData);
      }
      setShowModal(false);
      setEditingUser(null);
      await loadUsers({ silent: true });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      const apiErrors = error.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      alert(error.response?.data?.message || details || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const activeFilterCount = (filterRole !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* En-tete */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="chip">Administration</p>
                <h1 className="text-2xl sm:text-3xl font-semibold mt-3 text-[rgb(var(--ink))]">Gestion des utilisateurs</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Creer, editer et activer les comptes de la plateforme.</p>
              </div>
              <button onClick={handleAddUser} className="btn-primary shrink-0">
                <Plus className="h-4 w-4" />
                Nouvel utilisateur
              </button>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {kpis.map((kpi) => (
                <div key={kpi.key} className="surface-card p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-[rgba(15,42,46,0.6)] truncate">{kpi.label}</p>
                      <p className="text-2xl sm:text-3xl font-semibold mt-1.5 text-[rgb(var(--ink))]">
                        {loading && stats.total === 0 ? '...' : Number(kpi.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-2xl flex items-center justify-center ${
                        kpi.highlight ? 'bg-[rgb(var(--clay))] text-white' : 'bg-[rgba(15,42,46,0.08)] text-[rgb(var(--ink))]'
                      }`}
                    >
                      <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="surface-panel p-4 sm:p-5 flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(199,109,74,0.3)]"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
              >
                <option value="all">Tous les roles</option>
                <option value="admin">Administrateur</option>
                <option value="gestionnaire">Gestionnaire</option>
                <option value="agent">Agent</option>
                <option value="proprietaire">Proprietaire</option>
                <option value="visiteur">Visiteur</option>
                <option value="investisseur">Investisseur</option>
                <option value="entreprise">Entreprise</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm shrink-0"
              >
                <option value="all">Tous statuts</option>
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSearchInput(''); setSearch(''); setFilterRole('all'); setFilterStatus('all'); }}
                  className="btn-ghost shrink-0 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  Reinitialiser
                </button>
              )}
            </div>

            {/* Liste - cartes empilees sur mobile (pas de scroll horizontal) */}
            <div className="surface-panel overflow-hidden md:hidden">
              <div className="divide-y divide-[rgba(15,42,46,0.06)]">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="h-16 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                    </div>
                  ))
                ) : users.length === 0 ? (
                  <div className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                    Aucun utilisateur ne correspond a ces criteres.
                  </div>
                ) : (
                  users.map((user) => {
                    const roleSlug = getRoleSlug(user);
                    return (
                      <div key={user.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                              <span className="text-sm font-semibold text-[rgb(var(--ink))]">
                                {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[rgb(var(--ink))] truncate">{user.first_name} {user.last_name}</p>
                              <span className="chip mt-1 whitespace-nowrap">{getRoleLabel(user.role?.name || roleSlug)}</span>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
                              user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-[rgba(199,109,74,0.12)] text-[rgb(var(--clay))]'
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`} />
                            {user.is_active ? 'Actif' : 'En attente'}
                          </span>
                        </div>

                        <div className="text-xs text-[rgba(15,42,46,0.6)] space-y-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            {user.phone || 'Non specifie'}
                          </div>
                          {user.country && (
                            <p>{user.country.flag} {user.country.name}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="btn-ghost flex-1 text-xs"
                          >
                            {user.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            {user.is_active ? 'Desactiver' : 'Activer'}
                          </button>
                          <button onClick={() => handleEditUser(user)} className="btn-ghost px-3">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteUser(user)} className="btn-ghost px-3 text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {!loading && totalUsers > 0 && (
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">Page {page} sur {lastPage}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                      disabled={page >= lastPage}
                      className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Liste - tableau a partir de md */}
            <div className="surface-panel overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="border-b border-[rgba(15,42,46,0.08)] text-left">
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Utilisateur</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Role</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Contact</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Pays</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)]">Statut</th>
                      <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wide text-[rgba(15,42,46,0.45)] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-b border-[rgba(15,42,46,0.06)]">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="h-10 rounded-xl bg-[rgba(15,42,46,0.05)] animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center text-sm text-[rgba(15,42,46,0.5)]">
                          Aucun utilisateur ne correspond a ces criteres.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const roleSlug = getRoleSlug(user);
                        return (
                          <tr key={user.id} className="border-b border-[rgba(15,42,46,0.06)] last:border-0 hover:bg-[rgba(15,42,46,0.02)] transition">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 shrink-0 rounded-2xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center">
                                  <span className="text-sm font-semibold text-[rgb(var(--ink))]">
                                    {`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-[rgb(var(--ink))] truncate">{user.first_name} {user.last_name}</p>
                                  {(user.agent_type || user.partner_type) && (
                                    <p className="text-xs text-[rgba(15,42,46,0.5)] truncate capitalize">
                                      {user.agent_type || user.partner_type}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="chip whitespace-nowrap">{getRoleLabel(user.role?.name || roleSlug)}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs text-[rgba(15,42,46,0.65)] truncate">
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{user.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[rgba(15,42,46,0.5)]">
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  {user.phone || 'Non specifie'}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-[rgba(15,42,46,0.7)] whitespace-nowrap">
                              {user.country ? `${user.country.flag || ''} ${user.country.name}`.trim() : '-'}
                            </td>
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                                  user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-[rgba(199,109,74,0.12)] text-[rgb(var(--clay))]'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-[rgb(var(--clay))]'}`} />
                                {user.is_active ? 'Actif' : "En attente d'activation"}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  title={user.is_active ? 'Desactiver' : 'Activer'}
                                  className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white hover:text-[rgb(var(--ink))] transition"
                                >
                                  {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  title="Modifier"
                                  className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-white hover:text-[rgb(var(--ink))] transition"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  title="Supprimer"
                                  className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!loading && totalUsers > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-[rgba(15,42,46,0.08)]">
                  <p className="text-xs text-[rgba(15,42,46,0.55)]">
                    {totalUsers} utilisateur{totalUsers > 1 ? 's' : ''} - page {page} sur {lastPage}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                      disabled={page >= lastPage}
                      className="h-8 w-8 rounded-lg border border-[rgb(var(--line))] flex items-center justify-center text-[rgba(15,42,46,0.6)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="surface-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-[rgb(var(--ink))]">
                    {editingUser ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
                  </h2>
                  <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-[rgba(15,42,46,0.5)] hover:bg-[rgba(15,42,46,0.06)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const userData = {
                    first_name: formData.get('first_name'),
                    last_name: formData.get('last_name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    role: formData.get('role'),
                    country_code: formData.get('country_code') || null,
                    agent_type: formData.get('agent_type') || null,
                    is_active: formData.get('is_active') === 'true',
                  };
                  if (!editingUser) {
                    userData.password = formData.get('password');
                  }
                  handleSaveUser(userData);
                }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="first_name" defaultValue={editingUser?.first_name} required placeholder="Prenom" className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm" />
                    <input name="last_name" defaultValue={editingUser?.last_name} required placeholder="Nom" className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <input name="email" type="email" defaultValue={editingUser?.email} required placeholder="Email" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm" />
                    <input name="phone" defaultValue={editingUser?.phone} placeholder="Telephone" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm" />
                    {!editingUser && (
                      <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm" />
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select name="role" defaultValue={editingUser?.role?.slug || editingUser?.role} required className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm">
                        <option value="admin">Administrateur</option>
                        <option value="gestionnaire">Gestionnaire</option>
                        <option value="agent">Agent immobilier</option>
                        <option value="proprietaire">Proprietaire</option>
                        <option value="visiteur">Visiteur</option>
                        <option value="investisseur">Investisseur</option>
                        <option value="entreprise">Entreprise</option>
                      </select>
                      <select name="is_active" defaultValue={editingUser?.is_active ? 'true' : 'false'} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm">
                        <option value="true">Actif</option>
                        <option value="false">Inactif</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select name="country_code" defaultValue={editingUser?.country?.code || ''} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm">
                        <option value="">Pays de rattachement</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.flag} {country.name}
                          </option>
                        ))}
                      </select>
                      <select name="agent_type" defaultValue={editingUser?.agent_type || ''} className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-2.5 text-sm">
                        <option value="">Type agent (optionnel)</option>
                        <option value="constructeur">Constructeur</option>
                        <option value="immobilier">Immobilier</option>
                        <option value="investissement">Investissement</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Annuler</button>
                    <button type="submit" disabled={saving} className="btn-primary">
                      {saving ? 'Enregistrement...' : editingUser ? 'Modifier' : 'Ajouter'}
                    </button>
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
