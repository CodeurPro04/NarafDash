import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { Building, Search, Eye, MapPin, Banknote, User, Calendar, Image, Edit } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { useAuth } from '../../contexts/AuthContext';

const AgentPropertyManagement = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    transaction_type: '',
    price: '',
    currency: '',
    address: '',
    city: '',
    description: '',
    agent_comment: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchTerm(query);
  }, [location.search]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getAllProperties();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProperties(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur lors du chargement des proprietes:', err);
      setError(err.response?.data?.message || 'Impossible de charger les proprietes.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const address = (property.address || '').toLowerCase();
      const city = (property.city || '').toLowerCase();
      const normalizedStatus = property.status === 'rejected' ? 'draft' : property.status;
      const matchesSearch = title.includes(searchLower) || address.includes(searchLower) || city.includes(searchLower);
      const matchesStatus = filterStatus === 'all' || normalizedStatus === filterStatus;
      const matchesType = filterType === 'all' || property.transaction_type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [properties, searchTerm, filterStatus, filterType]);

  const statusBadge = (status) => {
    const normalized = status === 'rejected' ? 'draft' : status;
    switch (normalized) {
      case 'approved':
        return { label: 'Approuvee', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700' };
      case 'pending':
        return { label: 'En attente', className: 'border-amber-500/30 bg-amber-500/15 text-amber-700' };
      case 'draft':
        return { label: 'Brouillon', className: 'border-slate-500/30 bg-slate-500/15 text-slate-700' };
      default:
        return { label: status || 'Inconnu', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-700' };
    }
  };

  const getMediaCandidate = (media) => (
    media?.url
    || media?.file_path
    || media?.public_url
    || media?.secure_url
    || ''
  );

  const getPropertyImage = (property) => (
    getMediaCandidate(property?.primary_image || property?.primaryImage)
    || getMediaCandidate(property?.media?.[0])
  );

  const handleViewProperty = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

  const canEditProperty = (property) => (
    property?.agent_id && user?.id && String(property.agent_id) === String(user.id)
  );

  const openEditModal = (property) => {
    if (!canEditProperty(property)) {
      alert('Vous pouvez modifier uniquement les proprietes qui vous sont assignees.');
      return;
    }
    setEditingProperty(property);
    setEditForm({
      title: property.title || '',
      transaction_type: property.transaction_type || '',
      price: property.price || '',
      currency: property.currency || 'XOF',
      address: property.address || '',
      city: property.city || '',
      description: property.description || '',
      agent_comment: property.agent_comment || '',
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingProperty?.uuid) return;
    try {
      setSavingEdit(true);
      await agentService.updateProperty(editingProperty.uuid, editForm);
      setProperties((prev) => prev.map((property) => (
        property.uuid === editingProperty.uuid
          ? { ...property, ...editForm }
          : property
      )));
      setEditingProperty(null);
    } catch (err) {
      console.error('Erreur lors de la mise a jour:', err);
      alert('Erreur lors de la mise a jour');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Proprietes</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Visualisez toutes les annonces et mettez-les a jour.
              </p>
            </div>

            <div className="surface-panel p-5 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(15,42,46,0.5)]" />
                <input
                  type="text"
                  placeholder="Rechercher par titre ou localisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous types</option>
                <option value="vente">Vente</option>
                <option value="location">Location</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous statuts</option>
                <option value="approved">Approuvees</option>
                <option value="pending">En attente</option>
                <option value="draft">Brouillons</option>
              </select>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : error ? (
              <div className="surface-panel p-6 text-sm text-[rgb(var(--clay))]">{error}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProperties.map((property) => (
                  <div key={property.uuid || property.id} className="surface-panel p-5">
                    <div className="flex gap-4">
                      <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                        {getPropertyImage(property) ? (
                          <SecureImage
                            src={resolveMediaUrl(getPropertyImage(property))}
                            alt={property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building className="h-8 w-8 text-[rgba(15,42,46,0.4)]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">{property.title || 'Titre non defini'}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(property.status).className}`}>
                                {statusBadge(property.status).label}
                              </span>
                              {canEditProperty(property) ? (
                                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  Assignee a vous
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-500/30 bg-slate-500/15 px-3 py-1 text-xs font-semibold text-slate-700">
                                  Lecture seule
                                </span>
                              )}
                              {property.transaction_type && (
                                <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">
                                  {property.transaction_type}
                                </span>
                              )}
                              {property.property_type?.name && (
                                <span className="inline-flex items-center rounded-full border border-[rgba(15,42,46,0.15)] bg-white/60 px-3 py-1 text-xs font-medium text-[rgba(15,42,46,0.7)]">
                                  {property.property_type.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[rgba(15,42,46,0.6)]">
                          <div>
                            <span className="text-[rgba(15,42,46,0.4)]">Proprietaire: </span>
                            {property.user?.first_name} {property.user?.last_name}
                          </div>
                          <div>
                            <span className="text-[rgba(15,42,46,0.4)]">Agent: </span>
                            {property.agent ? `${property.agent.first_name} ${property.agent.last_name}` : 'Non assigne'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {property.address || 'Adresse inconnue'}, {property.city || 'Ville'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'FCFA'}` : 'Prix non defini'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <button onClick={() => handleViewProperty(property)} className="btn-ghost flex-1">
                        <Eye className="h-4 w-4" />
                        Details
                      </button>
                      <button
                        onClick={() => openEditModal(property)}
                        className={`btn-ghost flex-1 ${canEditProperty(property) ? '' : 'cursor-not-allowed border-[rgba(15,42,46,0.08)] bg-[rgba(15,42,46,0.06)] text-[rgba(15,42,46,0.35)] hover:border-[rgba(15,42,46,0.08)] hover:bg-[rgba(15,42,46,0.06)] hover:text-[rgba(15,42,46,0.35)]'}`}
                        disabled={!canEditProperty(property)}
                        aria-disabled={!canEditProperty(property)}
                        title={!canEditProperty(property) ? 'Cette propriete est en lecture seule.' : 'Modifier la propriete'}
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filteredProperties.length === 0 && (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucune propriete trouvee.
              </div>
            )}
          </div>
        </main>
      </div>

      {showDetailsModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{selectedProperty.title || 'Propriete'} </h2>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge(selectedProperty.status).className}`}>
                    {statusBadge(selectedProperty.status).label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[rgba(15,42,46,0.6)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedProperty.address || 'Adresse inconnue'}, {selectedProperty.city || 'Ville'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    {selectedProperty.price ? `${Number(selectedProperty.price).toLocaleString()} ${selectedProperty.currency || 'FCFA'}` : 'Prix non defini'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="btn-ghost">Fermer</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                  {getPropertyImage(selectedProperty) ? (
                    <SecureImage
                      src={resolveMediaUrl(getPropertyImage(selectedProperty))}
                      alt={selectedProperty.title}
                      className="w-full h-72 object-cover"
                    />
                  ) : (
                    <div className="h-72 flex items-center justify-center">
                      <Building className="h-10 w-10 text-[rgba(15,42,46,0.4)]" />
                    </div>
                  )}
                </div>

                {Array.isArray(selectedProperty.media) && selectedProperty.media.length > 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedProperty.media.slice(0, 8).map((mediaItem) => (
                      <div key={mediaItem.id || mediaItem.uuid || mediaItem.file_path} className="h-24 rounded-xl overflow-hidden bg-[rgba(15,42,46,0.06)]">
                        <SecureImage
                          src={resolveMediaUrl(getMediaCandidate(mediaItem))}
                          alt={selectedProperty.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Image className="h-4 w-4" />
                    Description
                  </div>
                  <p className="text-sm text-[rgba(15,42,46,0.7)]">
                    {selectedProperty.description || 'Aucune description disponible.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4" />
                    Contacts
                  </div>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Proprietaire</p>
                      <p className="font-medium">{selectedProperty.user?.first_name} {selectedProperty.user?.last_name}</p>
                      <p className="text-xs">{selectedProperty.user?.email || 'Email non disponible'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Agent assigne</p>
                      <p className="font-medium">{selectedProperty.agent ? `${selectedProperty.agent.first_name} ${selectedProperty.agent.last_name}` : 'Non assigne'}</p>
                      <p className="text-xs">{selectedProperty.agent?.email || ''}</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Building className="h-4 w-4" />
                    Informations
                  </div>
                  <div className="space-y-3 text-sm text-[rgba(15,42,46,0.7)]">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Type</p>
                      <p className="font-medium">{selectedProperty.property_type?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Transaction</p>
                      <p className="font-medium">{selectedProperty.transaction_type || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Reference</p>
                      <p className="font-medium">{selectedProperty.uuid || selectedProperty.id}</p>
                    </div>
                  </div>
                </div>

                <div className="surface-panel p-5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Calendar className="h-4 w-4" />
                    Dates
                  </div>
                  <div className="text-sm text-[rgba(15,42,46,0.7)] space-y-2">
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Creation</p>
                      <p className="font-medium">{selectedProperty.created_at ? new Date(selectedProperty.created_at).toLocaleString('fr-FR') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[rgba(15,42,46,0.45)]">Derniere mise a jour</p>
                      <p className="font-medium">{selectedProperty.updated_at ? new Date(selectedProperty.updated_at).toLocaleString('fr-FR') : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingProperty && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold">Modifier la propriete</h3>
                <p className="text-sm text-[rgba(15,42,46,0.6)]">Mise a jour rapide</p>
              </div>
              <button onClick={() => setEditingProperty(null)} className="btn-ghost">Fermer</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Titre</label>
                <input
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Transaction</label>
                <select
                  name="transaction_type"
                  value={editForm.transaction_type}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                >
                  <option value="vente">Vente</option>
                  <option value="location">Location</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Prix</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    name="price"
                    value={editForm.price}
                    onChange={handleEditChange}
                    className="col-span-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                  />
                  <input
                    name="currency"
                    value={editForm.currency}
                    onChange={handleEditChange}
                    className="rounded-xl border border-[rgb(var(--line))] bg-white/70 px-3 py-3 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Adresse</label>
                <input
                  name="address"
                  value={editForm.address}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ville</label>
                <input
                  name="city"
                  value={editForm.city}
                  onChange={handleEditChange}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows={4}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Commentaire</label>
                <textarea
                  name="agent_comment"
                  value={editForm.agent_comment}
                  onChange={handleEditChange}
                  rows={3}
                  className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingProperty(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleSaveEdit} className="btn-primary" disabled={savingEdit}>
                {savingEdit ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPropertyManagement;
