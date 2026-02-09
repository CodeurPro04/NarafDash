import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { managerService } from '../../services/api';
import {
  Building,
  Search,
  UserCheck,
  MapPin,
  Banknote,
  Star,
  Eye,
  User,
  Calendar,
  Image,
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';

const PropertyManagement = () => {
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [assignments, setAssignments] = useState({});
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchTerm(query);
  }, [location.search]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [propertiesRes, agentsRes] = await Promise.all([
        managerService.getAllProperties(),
        managerService.getAvailableAgents(),
      ]);

      const propertiesPayload = extractPayload(propertiesRes);
      const propertyList = propertiesPayload.data || propertiesPayload;
      const agentsList = extractPayload(agentsRes);

      setProperties(Array.isArray(propertyList) ? propertyList : []);
      setAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (error) {
      console.error('Erreur lors du chargement des proprietes:', error);
      setError(error.response?.data?.message || 'Impossible de charger les proprietes.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProperty = (property) => {
    setSelectedProperty(property);
    setShowDetailsModal(true);
  };

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

  const handleAssign = async (uuid) => {
    const agentId = assignments[uuid];
    if (!agentId) {
      alert('Veuillez selectionner un agent');
      return;
    }

    try {
      await managerService.assignProperty(uuid, { agent_id: agentId });
      const assignedAgent = agents.find((agent) => String(agent.id) === String(agentId));
      setProperties((prev) => prev.map((property) => {
        if (property.uuid !== uuid) return property;
        return {
          ...property,
          agent_id: agentId,
          agent: assignedAgent || property.agent,
        };
      }));
    } catch (error) {
      console.error("Erreur lors de l'assignation:", error);
      alert("Erreur lors de l'assignation");
    }
  };

  const handleStatusUpdate = async (uuid, status) => {
    let rejectionReason = null;
    if (status === 'rejected') {
      const input = window.prompt('Motif du rejet (optionnel)') || '';
      rejectionReason = input.trim() || 'Non conforme';
    }

    try {
      const payload = { status };
      if (status === 'rejected') {
        payload.rejection_reason = rejectionReason;
      }
      await managerService.updatePropertyStatus(uuid, payload);
      setProperties((prev) => prev.map((property) => (
        property.uuid === uuid
          ? { ...property, status, rejection_reason: status === 'rejected' ? rejectionReason : null }
          : property
      )));
    } catch (error) {
      console.error('Erreur lors de la mise a jour du statut:', error);
      const apiMessage = error.response?.data?.message;
      const apiErrors = error.response?.data?.errors;
      const details = apiErrors ? Object.values(apiErrors).flat().join(' ') : '';
      alert(apiMessage || details || 'Erreur lors de la mise a jour du statut');
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
              <p className="chip">Gestionnaire</p>
              <h1 className="text-3xl font-semibold mt-3">Gestion des proprietes</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Visualisez toutes les annonces et assignez-les aux agents.
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
                <option value="pending">En attente</option>
                <option value="approved">Approuvees</option>
                <option value="draft">Brouillons</option>
              </select>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : error ? (
              <div className="surface-panel p-6 text-sm text-[rgb(var(--clay))]">{error}</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProperties.map((property) => {
                  const imageSrc = getPropertyImage(property);
                  const assignedValue = assignments[property.uuid] ?? property.agent_id ?? '';
                  return (
                    <div key={property.uuid || property.id} className="surface-panel p-5">
                      <div className="flex gap-4">
                        <div className="w-28 h-24 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center overflow-hidden">
                          {imageSrc ? (
                            <SecureImage
                              src={resolveMediaUrl(imageSrc)}
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
                            {property.featured && (
                              <span className="inline-flex items-center gap-1 text-xs text-[rgb(var(--clay))]">
                                <Star className="h-4 w-4" />
                                Featured
                              </span>
                            )}
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

                      <div className="mt-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <select
                            value={assignedValue}
                            onChange={(e) => setAssignments((prev) => ({ ...prev, [property.uuid]: e.target.value }))}
                            className="flex-1 px-3 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
                          >
                            <option value="">Selectionner un agent</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.first_name} {agent.last_name}
                              </option>
                            ))}
                          </select>
                          <button onClick={() => handleAssign(property.uuid)} className="btn-primary" disabled={!property.uuid}>
                            <UserCheck className="h-4 w-4" />
                            {property.agent ? 'Mettre a jour' : 'Assigner'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['pending', 'draft'].includes(property.status) && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(property.uuid, 'approved')}
                                className="btn-primary flex-1"
                              >
                                Approuver
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(property.uuid, 'rejected')}
                                className="btn-ghost flex-1"
                              >
                                Rejeter
                              </button>
                            </>
                          )}
                          <button onClick={() => handleViewProperty(property)} className="btn-ghost flex-1">
                            <Eye className="h-4 w-4" />
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  {selectedProperty.featured && (
                    <span className="inline-flex items-center rounded-full border border-[rgba(199,109,74,0.35)] bg-[rgba(199,109,74,0.12)] px-3 py-1 text-xs font-semibold text-[rgb(var(--clay))]">
                      Featured
                    </span>
                  )}
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
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-[rgba(15,42,46,0.45)]">Chambres</p>
                        <p className="font-medium">{selectedProperty.bedrooms ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgba(15,42,46,0.45)]">Salles d'eau</p>
                        <p className="font-medium">{selectedProperty.bathrooms ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgba(15,42,46,0.45)]">Surface</p>
                        <p className="font-medium">{selectedProperty.surface_area ?? 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[rgba(15,42,46,0.45)]">Etages</p>
                        <p className="font-medium">{selectedProperty.floor_number ?? 'N/A'}</p>
                      </div>
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
    </div>
  );
};

export default PropertyManagement;
