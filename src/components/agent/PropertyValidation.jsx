import React, { useEffect, useState } from 'react';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import { agentService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { Check, X, FileText, Plus } from 'lucide-react';

const PropertyValidation = () => {
  const navigate = useNavigate();
  const [propertyRequests, setPropertyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestToReject, setRequestToReject] = useState(null);
  const [requestRejectionReason, setRequestRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const extractPayload = (response) => response?.data?.data ?? response?.data ?? [];
  const requestStatusLabel = (status) => {
    const labels = {
      pending: 'En attente',
      assigned: 'Assignee',
      agent_approved: 'Acceptee par l agent',
      agent_rejected: 'Refusee par l agent',
      approved: 'Approuvee',
      rejected: 'Refusee',
    };

    return labels[status || 'pending'] || status || 'En attente';
  };

  useEffect(() => {
    loadPropertyRequests();
  }, []);

  const loadPropertyRequests = async () => {
    try {
      setLoadingRequests(true);
      const response = await agentService.getAssignedPropertyRequests();
      const payload = extractPayload(response);
      const list = payload.data || payload;
      setPropertyRequests(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    } finally {
      setLoadingRequests(false);
    }
  };


  const handleRequestDecision = async (uuid, isApproved) => {
    try {
      setActionLoading(true);
      if (isApproved) {
        await agentService.approvePropertyRequest(uuid);
        setPropertyRequests((prev) => prev.map((request) => (
          request.uuid === uuid ? { ...request, status: 'agent_approved' } : request
        )));
      } else {
        const target = propertyRequests.find((request) => request.uuid === uuid);
        setRequestToReject(target || { uuid });
        setRequestRejectionReason('');
      }
    } catch (error) {
      console.error('Erreur lors de la decision:', error);
      alert('Erreur lors de la decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmRejectRequest = async () => {
    if (!requestToReject?.uuid) return;
    if (!requestRejectionReason.trim()) {
      alert('Le motif est obligatoire.');
      return;
    }
    try {
      setActionLoading(true);
      await agentService.rejectPropertyRequest(requestToReject.uuid, { rejection_reason: requestRejectionReason.trim() });
      setPropertyRequests((prev) => prev.map((request) => (
        request.uuid === requestToReject.uuid
          ? { ...request, status: 'agent_rejected', rejection_reason: requestRejectionReason.trim() }
          : request
      )));
      setRequestToReject(null);
      setRequestRejectionReason('');
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      alert('Erreur lors du refus.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFromRequest = (request) => {
    navigate(`/agent/property-requests/${request.uuid}/create`, { state: { request } });
  };

  return (
    <div className="app-shell flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div>
              <p className="chip">Agent immobilier</p>
              <h1 className="text-3xl font-semibold mt-3">Demandes de propriete</h1>
              <p className="text-sm text-[rgba(15,42,46,0.6)] mt-2">
                Traitez les demandes assignees avant creation.
              </p>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Demandes de propriete
                  </h2>
                  <p className="text-sm text-[rgba(15,42,46,0.6)]">
                    Approuvez les demandes assignees avant creation.
                  </p>
                </div>
              </div>

              {loadingRequests ? (
                <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.5)]">Chargement...</div>
              ) : propertyRequests.length === 0 ? (
                <div className="surface-panel p-6 text-sm text-[rgba(15,42,46,0.6)]">
                  Aucune demande assignee.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {propertyRequests.map((request) => (
                    <div key={request.uuid} className="surface-panel p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            {request.user ? `${request.user.first_name} ${request.user.last_name}` : 'Proprietaire'}
                          </p>
                          <p className="text-xs text-[rgba(15,42,46,0.5)]">
                            Statut: {requestStatusLabel(request.status)}
                          </p>
                        </div>
                        <span className="chip">Demande</span>
                      </div>
                      <p className="text-sm text-[rgba(15,42,46,0.7)] whitespace-pre-line">
                        {request.description}
                      </p>
                      {request.rejection_reason && (
                        <p className="text-xs text-[rgba(15,42,46,0.55)]">Motif: {request.rejection_reason}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {!['agent_approved', 'agent_rejected'].includes(request.status) && (
                          <>
                            <button
                              onClick={() => handleRequestDecision(request.uuid, true)}
                              className="btn-primary"
                              disabled={actionLoading}
                            >
                              <Check className="h-4 w-4" />
                              Accepter
                            </button>
                            <button
                              onClick={() => handleRequestDecision(request.uuid, false)}
                              className="btn-ghost"
                              disabled={actionLoading}
                            >
                              <X className="h-4 w-4" />
                              Refuser
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleCreateFromRequest(request)}
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
            </section>
          </div>
        </main>

      </div>

      {requestToReject && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="surface-card w-full max-w-xl p-6">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">Refuser la demande</h3>
              <p className="text-sm text-[rgba(15,42,46,0.6)]">
                Motif obligatoire pour le proprietaire.
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Motif du refus</label>
              <textarea
                value={requestRejectionReason}
                onChange={(e) => setRequestRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-[rgb(var(--line))] bg-white/70 px-4 py-3 text-sm"
                rows="4"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRequestToReject(null)} className="btn-ghost">Annuler</button>
              <button onClick={confirmRejectRequest} className="btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyValidation;
