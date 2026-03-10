import axios from "axios";

const normalizeApiBase = (rawUrl) => {
  if (!rawUrl) return "";
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
};

// Configuration de base d'Axios
const rawBaseUrl =
  import.meta.env.VITE_API_URL || "https://api.africabuildinvest.com";
const apiBaseUrl = normalizeApiBase(rawBaseUrl);
const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// ====================
// SERVICES PUBLICS (sans authentification)
// ====================

// Services d'authentification publique
export const authService = {
  register: (data) => api.post("/v1/auth/register", data),
  login: (credentials) => api.post("/v1/auth/login", credentials),
  forgotPassword: (data) => api.post("/v1/auth/forgot-password", data),
  resetPassword: (data) => api.post("/v1/auth/reset-password", data),
  changePassword: (data) => api.post("/v1/auth/change-password", data),
};

// Services propriétés publiques
export const publicPropertyService = {
  getAll: (params) => api.get("/v1/properties", { params }),
  getById: (uuid) => api.get(`/v1/properties/${uuid}`),
  getByType: (slug) => api.get(`/v1/properties/type/${slug}`),
  getByCity: (city) => api.get(`/v1/properties/city/${city}`),
  getFeatured: () => api.get("/v1/properties/featured"),
};

// Types de propriétés publiques
export const propertyTypeService = {
  getAll: () => api.get("/v1/property-types"),
  getFeatures: () => api.get("/v1/property-features"),
};

// Projets d'investissement publics
export const publicInvestmentService = {
  getAll: (params) => api.get("/v1/investments", { params }),
  getById: (uuid) => api.get(`/v1/investments/${uuid}`),
};

// Projets de construction publics
export const publicConstructionService = {
  getAll: () => api.get("/v1/construction-projects"),
};

// ====================
// SERVICES PROTÉGÉS (avec authentification)
// ====================

// Profil utilisateur
export const profileService = {
  getProfile: () => api.get("/v1/auth/profile"),
  updateProfile: (data) =>
    api.put(
      "/v1/auth/profile",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  changePassword: (data) => api.post("/v1/auth/change-password", data),
  logout: () => api.post("/v1/auth/logout"),
};

// Notifications
export const notificationService = {
  getAll: (params) => api.get("/v1/notifications", { params }),
  getUnreadCount: () => api.get("/v1/notifications/unread-count"),
  markAsRead: (id) => api.post(`/v1/notifications/${id}/mark-as-read`),
  markAllAsRead: () => api.post("/v1/notifications/mark-all-as-read"),
  delete: (id) => api.delete(`/v1/notifications/${id}`),
};

// ====================
// SERVICES ADMINISTRATEUR
// ====================

export const adminService = {
  // Dashboard
  getDashboard: () => api.get("/v1/admin/dashboard"),
  getStatistics: () => api.get("/v1/admin/statistics"),

  // Gestion des utilisateurs
  getUsers: (params) => api.get("/v1/admin/users", { params }),
  createUser: (data) => api.post("/v1/admin/users", data),
  getUser: (id) => api.get(`/v1/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/v1/admin/users/${id}`, data),
  updateUserRole: (id, role) =>
    api.post(`/v1/admin/users/${id}/assign-role`, { role }),
  deleteUser: (id) => api.delete(`/v1/admin/users/${id}`),
  toggleUserStatus: (id) => api.post(`/v1/admin/users/${id}/toggle-status`),
  getAvailableAgents: () => api.get("/v1/admin/agents"),

  // Gestion des rôles
  getRoles: () => api.get("/v1/admin/checkroles"),
  createRole: (data) => api.post("/v1/admin/checkroles", data),
  updateRole: (id, data) => api.put(`/v1/admin/checkroles/${id}`, data),

  // Gestion complète des propriétés
  getAllProperties: (params) => api.get("/v1/admin/properties/all", { params }),
  getProperties: (params) => api.get("/v1/admin/properties", { params }),
  getProperty: (uuid) => api.get(`/v1/admin/properties/${uuid}`),
  createProperty: (data) =>
    api.post(
      "/v1/admin/properties",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateProperty: (uuid, data) =>
    api.put(
      `/v1/admin/properties/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteProperty: (uuid) => api.delete(`/v1/admin/properties/${uuid}`),
  forceDeleteProperty: (uuid) => api.delete(`/v1/admin/properties/${uuid}`),
  toggleFeaturedProperty: (uuid) =>
    api.post(`/v1/admin/properties/${uuid}/toggle-featured`),
  updatePropertyStatus: (uuid, data) =>
    api.post(`/v1/admin/properties/${uuid}/status`, data),

  // Projets d'investissement
  getInvestments: () => api.get("/v1/admin/investments"),
  createInvestment: (data) =>
    api.post(
      "/v1/admin/investments",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateInvestment: (uuid, data) =>
    api.put(
      `/v1/admin/investments/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteInvestment: (uuid) => api.delete(`/v1/admin/investments/${uuid}`),
  approveInvestment: (uuid) =>
    api.post(`/v1/admin/investments/${uuid}/approve`),
  rejectInvestment: (uuid, data) =>
    api.post(`/v1/admin/investments/${uuid}/reject`, data),
  getAllProposals: () => api.get("/v1/admin/investments/proposals"),
  approveProposal: (uuid) =>
    api.post(`/v1/admin/investments/proposals/${uuid}/approve`),
  rejectProposal: (uuid) =>
    api.post(`/v1/admin/investments/proposals/${uuid}/reject`),

  // Modeles de maison
  getHouseModels: () => api.get("/v1/admin/house-models"),
  updateHouseModelsSection: (data) =>
    api.post("/v1/admin/house-models/section", data),
  createHouseModel: (data) =>
    api.post(
      "/v1/admin/house-models",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateHouseModel: (uuid, data) =>
    api.put(
      `/v1/admin/house-models/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteHouseModel: (uuid) => api.delete(`/v1/admin/house-models/${uuid}`),

  // Partenariats
  getPendingPartnerships: () => api.get("/v1/admin/partnerships/pending"),
  approvePartnership: (uuid) =>
    api.post(`/v1/admin/partnerships/${uuid}/approve`),
  rejectPartnership: (uuid, data) =>
    api.post(`/v1/admin/partnerships/${uuid}/reject`, data),
  getAllPartnerships: () => api.get("/v1/admin/partnerships/all"),
  updatePartnershipContent: (uuid, data) =>
    api.post(
      `/v1/admin/partnerships/${uuid}/content`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deletePartnership: (uuid) => api.delete(`/v1/admin/partnerships/${uuid}`),

  // Types de propriétés
  createPropertyType: (data) => api.post("/v1/admin/property-types", data),
  updatePropertyType: (id, data) =>
    api.put(`/v1/admin/property-types/${id}`, data),
  deletePropertyType: (id) => api.delete(`/v1/admin/property-types/${id}`),

  // Caracteristiques
  createPropertyFeature: (data) =>
    api.post("/v1/admin/property-features", data),
  updatePropertyFeature: (id, data) =>
    api.put(`/v1/admin/property-features/${id}`, data),
  deletePropertyFeature: (id) =>
    api.delete(`/v1/admin/property-features/${id}`),

  // Gestion des messages
  getMessages: (params) => api.get("/v1/admin/messages", { params }),
  getMessage: (uuid) => api.get(`/v1/admin/messages/${uuid}`),
  createMessage: (data) => api.post("/v1/admin/messages", data),
  updateMessage: (uuid, data) => api.put(`/v1/admin/messages/${uuid}`, data),
  deleteMessage: (uuid) => api.delete(`/v1/admin/messages/${uuid}`),
  markMessageAsRead: (uuid) => api.post(`/v1/admin/messages/${uuid}/mark-read`),
  replyToMessage: (uuid, data) =>
    api.post(`/v1/admin/messages/${uuid}/reply`, data),

  // Paramètres système
  getSettings: () => api.get("/v1/admin/settings"),
  updateSettings: (data) => api.post("/v1/admin/settings", data),

  // Logs d'activité
  getActivityLogs: () => api.get("/v1/admin/activity-logs"),

  // Rapports
  getPropertiesReport: () => api.get("/v1/admin/reports/properties"),
  getUsersReport: () => api.get("/v1/admin/reports/users"),
  getTransactionsReport: () => api.get("/v1/admin/reports/transactions"),

  // Demandes de recherche
  getPendingSearchRequests: () => api.get("/v1/admin/search-requests/pending"),
  getSearchRequestHistory: () => api.get("/v1/admin/search-requests/history"),
  assignSearchRequest: (uuid, data) =>
    api.post(`/v1/admin/search-requests/${uuid}/assign`, data),
  approveSearchRequest: (uuid) =>
    api.post(`/v1/admin/search-requests/${uuid}/approve`),
  rejectSearchRequest: (uuid) =>
    api.post(`/v1/admin/search-requests/${uuid}/reject`),

  // Projets de construction
  getPendingConstructionProjects: () =>
    api.get("/v1/admin/construction/pending"),
  getConstructionHistory: () => api.get("/v1/admin/construction/history"),
  assignConstructionProject: (uuid, data) =>
    api.post(`/v1/admin/construction/${uuid}/assign`, data),
  approveConstructionProject: (uuid) =>
    api.post(`/v1/admin/construction/${uuid}/approve`),
  rejectConstructionProject: (uuid, data) =>
    api.post(`/v1/admin/construction/${uuid}/reject`, data),
  updateConstructionSpotlight: (data) =>
    api.post("/v1/admin/construction/spotlight", data),
  createConstructionProject: (data) =>
    api.post(
      "/v1/admin/construction",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateConstructionProject: (uuid, data) =>
    api.put(
      `/v1/admin/construction/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteConstructionProject: (uuid) =>
    api.delete(`/v1/admin/construction/${uuid}`),

  // Demandes de propriete
  getPendingPropertyRequests: () =>
    api.get("/v1/admin/property-requests/pending"),
  getPropertyRequestHistory: () =>
    api.get("/v1/admin/property-requests/history"),
  approvePropertyRequest: (uuid) =>
    api.post(`/v1/admin/property-requests/${uuid}/approve`),
  rejectPropertyRequest: (uuid, data) =>
    api.post(`/v1/admin/property-requests/${uuid}/reject`, data),
  assignPropertyRequest: (uuid, data) =>
    api.post(`/v1/admin/property-requests/${uuid}/assign`, data),

  // Demandes clients
  getPendingClientRequests: () => api.get("/v1/admin/client-requests/pending"),
  getClientRequestHistory: () => api.get("/v1/admin/client-requests/history"),
  approveClientRequest: (uuid) =>
    api.post(`/v1/admin/client-requests/${uuid}/approve`),
  rejectClientRequest: (uuid, data) =>
    api.post(`/v1/admin/client-requests/${uuid}/reject`, data),
  assignClientRequest: (uuid, data) =>
    api.post(`/v1/admin/client-requests/${uuid}/assign`, data),
};

// ====================
// SERVICES GESTIONNAIRE (MANAGER)
// ====================

export const managerService = {
  // Gestion des proprietes
  getAllProperties: (params) =>
    api.get("/v1/gestionnaire/properties/all", { params }),
  getPendingProperties: () => api.get("/v1/gestionnaire/properties/pending"),
  createProperty: (data) =>
    api.post(
      "/v1/gestionnaire/properties",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateProperty: (uuid, data) =>
    api.put(
      `/v1/gestionnaire/properties/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  assignProperty: (uuid, data) =>
    api.post(`/v1/gestionnaire/properties/${uuid}/assign`, data),
  updatePropertyStatus: (uuid, data) =>
    api.post(`/v1/gestionnaire/properties/${uuid}/status`, data),

  // Gestion des demandes de recherche
  getPendingSearchRequests: () =>
    api.get("/v1/gestionnaire/search-requests/pending"),
  getSearchRequestHistory: () =>
    api.get("/v1/gestionnaire/search-requests/history"),
  assignSearchRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/assign`, data),
  approveSearchRequest: (uuid) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/approve`),
  rejectSearchRequest: (uuid) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/reject`),

  // Gestion des projets de construction
  getPendingConstructionProjects: () =>
    api.get("/v1/gestionnaire/construction/pending"),
  getConstructionHistory: () =>
    api.get("/v1/gestionnaire/construction/history"),
  assignConstructionProject: (uuid, data) =>
    api.post(`/v1/gestionnaire/construction/${uuid}/assign`, data),
  approveConstructionProject: (uuid) =>
    api.post(`/v1/gestionnaire/construction/${uuid}/approve`),
  rejectConstructionProject: (uuid, data) =>
    api.post(`/v1/gestionnaire/construction/${uuid}/reject`, data),
  createConstructionProject: (data) =>
    api.post(
      "/v1/gestionnaire/construction",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateConstructionProject: (uuid, data) =>
    api.put(
      `/v1/gestionnaire/construction/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteConstructionProject: (uuid) =>
    api.delete(`/v1/gestionnaire/construction/${uuid}`),

  // Rapports
  getReports: () => api.get("/v1/gestionnaire/reports"),

  // Agents disponibles
  getAvailableAgents: () => api.get("/v1/gestionnaire/agents"),

  // Demandes de propriete
  getPendingPropertyRequests: () =>
    api.get("/v1/gestionnaire/property-requests/pending"),
  getPropertyRequestHistory: () =>
    api.get("/v1/gestionnaire/property-requests/history"),
  approvePropertyRequest: (uuid) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/approve`),
  rejectPropertyRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/reject`, data),
  assignPropertyRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/assign`, data),

  // Projets d'investissement
  getInvestments: () => api.get("/v1/gestionnaire/investments"),
  createInvestment: (data) =>
    api.post(
      "/v1/gestionnaire/investments",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateInvestment: (uuid, data) =>
    api.put(
      `/v1/gestionnaire/investments/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  deleteInvestment: (uuid) =>
    api.delete(`/v1/gestionnaire/investments/${uuid}`),
  approveInvestment: (uuid) =>
    api.post(`/v1/gestionnaire/investments/${uuid}/approve`),
  rejectInvestment: (uuid, data) =>
    api.post(`/v1/gestionnaire/investments/${uuid}/reject`, data),

  // Demandes clients
  getPendingClientRequests: () =>
    api.get("/v1/gestionnaire/client-requests/pending"),
  getClientRequestHistory: () =>
    api.get("/v1/gestionnaire/client-requests/history"),
  approveClientRequest: (uuid) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/approve`),
  rejectClientRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/reject`, data),
  assignClientRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/assign`, data),
};

// ====================
// SERVICES AGENT IMMOBILIER
// ====================

export const agentService = {
  // Propriétés assignées
  getAssignedProperties: () => api.get("/v1/agent/properties/assigned"),
  validateProperty: (uuid, data) =>
    api.post(`/v1/agent/properties/${uuid}/validate`, data),
  rejectProperty: (uuid, data) =>
    api.post(`/v1/agent/properties/${uuid}/reject`, data),
  createPropertyFromRequest: (uuid, data) =>
    api.post(`/v1/agent/properties/from-request/${uuid}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAllProperties: (params) => api.get("/v1/agent/properties/all", { params }),
  updateProperty: (uuid, data) => api.put(`/v1/agent/properties/${uuid}`, data),

  // Messages clients
  getMessages: () => api.get("/v1/agent/messages"),
  sendMessage: (data) => api.post("/v1/agent/messages", data),
  respondToMessage: (uuid, data) =>
    api.post(`/v1/agent/messages/${uuid}/respond`, data),
  markMessageAsRead: (uuid) => api.post(`/v1/agent/messages/${uuid}/mark-read`),

  // Demandes de recherche
  getAssignedSearchRequests: () =>
    api.get("/v1/agent/search-requests/assigned"),
  fulfillSearchRequest: (uuid, data) =>
    api.post(`/v1/agent/search-requests/${uuid}/fulfill`, data),

  // Projets de construction
  getAssignedConstructionProjects: () =>
    api.get("/v1/agent/construction/assigned"),
  createQuote: (uuid, data) =>
    api.post(`/v1/agent/construction/${uuid}/quote`, data),
  getMyQuotes: () => api.get("/v1/agent/construction/quotes"),
  getConstructionPublications: () =>
    api.get("/v1/agent/construction/publications"),
  createConstructionPublication: (data) =>
    api.post(
      "/v1/agent/construction/publications",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateConstructionPublication: (uuid, data) =>
    api.put(
      `/v1/agent/construction/publications/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),

  // Demandes de propriete
  getAssignedPropertyRequests: () =>
    api.get("/v1/agent/property-requests/assigned"),
  approvePropertyRequest: (uuid) =>
    api.post(`/v1/agent/property-requests/${uuid}/approve`),
  rejectPropertyRequest: (uuid, data) =>
    api.post(`/v1/agent/property-requests/${uuid}/reject`, data),

  // Demandes clients assignees
  getAssignedClientRequests: () =>
    api.get("/v1/agent/client-requests/assigned"),
  getClientRequestHistory: () => api.get("/v1/agent/client-requests/history"),
  approveClientRequest: (uuid) =>
    api.post(`/v1/agent/client-requests/${uuid}/approve`),
  rejectClientRequest: (uuid, data) =>
    api.post(`/v1/agent/client-requests/${uuid}/reject`, data),
  addClientRequestReport: (uuid, data) =>
    api.post(`/v1/agent/client-requests/${uuid}/reports`, data),
  concludeClientRequestDeal: (uuid, data) =>
    api.post(`/v1/agent/client-requests/${uuid}/conclude`, data),

  // Projets d'investissement (agent)
  getInvestmentPublications: () =>
    api.get("/v1/agent/investments/publications"),
  createInvestmentPublication: (data) =>
    api.post(
      "/v1/agent/investments/publications",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateInvestmentPublication: (uuid, data) =>
    api.put(
      `/v1/agent/investments/publications/${uuid}`,
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
};

// ====================
// SERVICES PROPRIÉTAIRE (OWNER)
// ====================

export const ownerService = {
  // Mes propriétés
  getMyProperties: () => api.get("/v1/proprietaire/properties/my-properties"),
  getProperty: (uuid) => api.get(`/v1/proprietaire/properties/${uuid}`),
  createProperty: (data) =>
    api.post("/v1/proprietaire/properties", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateProperty: (uuid, data) =>
    api.put(`/v1/proprietaire/properties/${uuid}`, data),
  deleteProperty: (uuid) => api.delete(`/v1/proprietaire/properties/${uuid}`),
  addPropertyImages: (uuid, data) =>
    api.post(`/v1/proprietaire/properties/${uuid}/add-images`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deletePropertyMedia: (id) =>
    api.delete(`/v1/proprietaire/properties/media/${id}`),

  getMessages: (params) => api.get("/v1/proprietaire/messages", { params }),
  getMessage: (uuid) => api.get(`/v1/proprietaire/messages/${uuid}`),
  replyToMessage: (uuid, data) =>
    api.post(`/v1/proprietaire/messages/${uuid}/reply`, data),
  markMessageAsRead: (uuid) =>
    api.post(`/v1/proprietaire/messages/${uuid}/mark-read`),
  deleteMessage: (uuid) => api.delete(`/v1/proprietaire/messages/${uuid}`),
};

// ====================
// SERVICES VISITEUR (VISITOR)
// ====================

export const visitorService = {
  // Messages
  getMessages: () => api.get("/v1/visiteur/messages"),
  sendMessage: (data) => api.post("/v1/visiteur/messages", data),
  getMessage: (uuid) => api.get(`/v1/visiteur/messages/${uuid}`),
  replyToMessage: (uuid, data) =>
    api.post(`/v1/visiteur/messages/${uuid}/reply`, data),

  // Demandes de recherche
  getMySearchRequests: () => api.get("/v1/visiteur/search-requests"),
  createSearchRequest: (data) => api.post("/v1/visiteur/search-requests", data),
  getSearchRequest: (uuid) => api.get(`/v1/visiteur/search-requests/${uuid}`),

  // Projets de construction
  submitConstructionRequest: (data) =>
    api.post("/v1/visiteur/construction/request"),
  getMyConstructionRequests: () =>
    api.get("/v1/visiteur/construction/my-requests"),
};

// ====================
// SERVICES INVESTISSEUR (INVESTOR)
// ====================

export const investorService = {
  // Propositions d'investissement
  proposeInvestment: (uuid, data) =>
    api.post(`/v1/investisseur/investments/${uuid}/propose`, data),
  getMyProposals: () => api.get("/v1/investisseur/investments/my-proposals"),
  getProposalDetails: (uuid) =>
    api.get(`/v1/investisseur/investments/proposals/${uuid}`),
};

// ====================
// SERVICES ENTREPRISE PARTENAIRE (COMPANY)
// ====================

export const companyService = {
  applyForPartnership: (data) =>
    api.post(
      "/v1/partnership/apply",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  getMyApplication: () => api.get("/v1/partnership/my-application"),
  updateApplication: (data) =>
    api.put(
      "/v1/partnership/update",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
};

export default api;
