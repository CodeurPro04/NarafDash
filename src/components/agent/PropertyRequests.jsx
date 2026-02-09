import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { CheckCircle, FileText, XCircle, Plus } from 'lucide-react';

const PropertyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await agentService.getAssignedPropertyRequests();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setRequests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      setError('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uuid) => {
    try {
      await agentService.approvePropertyRequest(uuid);
      setRequests((prev) => prev.map((request) => (
        request.uuid === uuid ? { ...request, status: 'agent_approved' } : request
      )));
    } catch (err) {
      console.error('Erreur validation demande:', err);
      alert('Erreur lors de la validation.');
    }
  };

  const handleReject = async (uuid) => {
    const reason = window.prompt('Motif du rejet (optionnel)') || '';
    try {
      await agentService.rejectPropertyRequest(uuid, { rejection_reason: reason.trim() || null });
      setRequests((prev) => prev.map((request) => (
        request.uuid === uuid ? { ...request, status: 'agent_rejected', rejection_reason: reason.trim() } : request
      )));
    } catch (err) {
      console.error('Erreur rejet demande:', err);
      alert('Erreur lors du rejet.');
    }
  };

  const handleCreate = (request) => {
    navigate(`/agent/property-requests/${request.uuid}/create`, { state: { request } });
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div>
              <p className="chip">Agent</p>
              <h1 className="text-3xl font-semibold mt-3">Demandes de propriete</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Validez les demandes assignees et creez les annonces.
              </p>
            </div>

            {loading ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">Chargement...</div>
            ) : error ? (
              <div className="surface-panel p-6 text-sm text-[rgb(var(--clay))]">{error}</div>
            ) : requests.length === 0 ? (
              <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                Aucune demande assignee.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {requests.map((request) => (
                  <div key={request.uuid} className="surface-panel p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Proprietaire'}
                        </h3>
                        <p className="text-xs text-[rgba(15,42,46,0.5)]">
                          Statut: {request.status || 'pending'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs text-[rgba(15,42,46,0.5)]">
                        <FileText className="h-4 w-4" />
                        Demande
                      </span>
                    </div>
                    <p className="text-sm text-[rgba(15,42,46,0.7)] whitespace-pre-line">
                      {request.description}
                    </p>
                    {request.rejection_reason && (
                      <p className="text-xs text-[rgba(15,42,46,0.5)]">Motif: {request.rejection_reason}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!['agent_approved', 'agent_rejected'].includes(request.status) && (
                        <>
                          <button onClick={() => handleApprove(request.uuid)} className="btn-primary">
                            <CheckCircle className="h-4 w-4" />
                            Approuver
                          </button>
                          <button onClick={() => handleReject(request.uuid)} className="btn-ghost">
                            <XCircle className="h-4 w-4" />
                            Rejeter
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleCreate(request)}
                        className="btn-ghost"
                        disabled={request.status !== 'agent_approved'}
                      >
                        <Plus className="h-4 w-4" />
                        Creer propriete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PropertyRequests;
