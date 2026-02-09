import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { ownerService } from '../../services/api';
import { resolveMediaUrl } from '../../utils/media';
import SecureImage from '../common/SecureImage';
import { Building, Edit, Trash2, Plus, Search, MapPin, Euro, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyProperties = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const normalizeStatus = (status) => (status === 'rejected' ? 'draft' : status);

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
      const response = await ownerService.getMyProperties();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setProperties(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erreur lors du chargement des proprietes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return properties.filter((property) => {
      const title = (property.title || '').toLowerCase();
      const location = `${property.address || ''} ${property.city || ''}`.trim().toLowerCase();
      const normalizedStatus = normalizeStatus(property.status);
      const matchesSearch = title.includes(searchLower) || location.includes(searchLower);
      const matchesStatus = filterStatus === 'all' || normalizedStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, filterStatus]);

  const handleDeleteProperty = async (propertyUuid) => {
    if (!window.confirm('Etes-vous sur de vouloir supprimer cette propriete ?')) return;
    try {
      await ownerService.deleteProperty(propertyUuid);
      setProperties((prev) => prev.filter((property) => property.uuid !== propertyUuid));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de la propriete');
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'approved':
        return 'Approuvee';
      case 'pending':
        return 'En attente';
      case 'draft':
        return 'Brouillon';
      case 'rejected':
        return 'Brouillon';
      default:
        return status || 'Inconnu';
    }
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
                <p className="chip">Espace proprietaire</p>
                <h1 className="text-3xl font-semibold mt-3">Mes proprietes</h1>
                <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">Gerez toutes vos annonces immobilieres.</p>
              </div>
              <button onClick={() => navigate('/owner/add-property')} className="btn-primary">
                <Plus className="h-4 w-4" />
                Nouvelle annonce
              </button>
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--line))] bg-white/70 text-sm"
              >
                <option value="all">Tous statuts</option>
                <option value="approved">Approuvee</option>
                <option value="pending">En attente</option>
                <option value="draft">Brouillon</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {loading ? (
                <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
              ) : (
                filteredProperties.map((property) => (
                  <div key={property.uuid} className="surface-panel p-5">
                    <div className="relative h-40 rounded-xl bg-[rgba(15,42,46,0.08)] flex items-center justify-center mb-4 overflow-hidden">
                      {property.primary_image?.public_url || property.primary_image?.secure_url || property.primary_image?.url || property.primary_image?.file_path || property.media?.[0]?.public_url || property.media?.[0]?.secure_url || property.media?.[0]?.url || property.media?.[0]?.file_path ? (
                        <SecureImage
                          src={resolveMediaUrl(
                            property.primary_image?.public_url
                            || property.primary_image?.secure_url
                            || property.primary_image?.url
                            || property.primary_image?.file_path
                            || property.media?.[0]?.public_url
                            || property.media?.[0]?.secure_url
                            || property.media?.[0]?.url
                            || property.media?.[0]?.file_path
                          )}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building className="h-12 w-12 text-[rgba(15,42,46,0.4)]" />
                      )}
                      {property.media?.length > 0 && (
                        <div className="absolute top-3 right-3 surface-soft px-2 py-1 flex items-center gap-1 text-xs">
                          <Image className="h-3 w-3" />
                          {property.media.length}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="text-lg font-semibold">{property.title || 'Titre non defini'}</h3>
                        <span className="chip">{statusLabel(normalizeStatus(property.status))}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[rgba(15,42,46,0.6)]">
                        <MapPin className="h-4 w-4" />
                        {property.city || property.address || 'Localisation inconnue'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[rgba(15,42,46,0.6)]">
                        <Euro className="h-4 w-4" />
                        {property.price ? `${Number(property.price).toLocaleString()} ${property.currency || 'XOF'}` : 'Prix non defini'}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => navigate(`/owner/properties/${property.uuid}/edit`)} className="btn-ghost flex-1">
                        <Edit className="h-4 w-4" />
                        Modifier
                      </button>
                      <button onClick={() => handleDeleteProperty(property.uuid)} className="btn-ghost flex-1">
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {!loading && filteredProperties.length === 0 && (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Vous n'avez pas encore de propriete. Cliquez sur "Nouvelle annonce" pour commencer.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MyProperties;

