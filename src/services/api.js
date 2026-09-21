import axios from "axios";

const normalizeApiBase = (rawUrl) => {
  if (!rawUrl) return "";
  const trimmed = rawUrl.replace(/\/+$/, "");
  return trimmed.replace(/\/api\/v1$/i, "").replace(/\/api$/i, "");
};

// Configuration de base d'Axios
const rawBaseUrl =
  import.meta.env.VITE_API_URL || "https://api.africabuildinvest.com"; /* Valeur par défaut pour le développement local */
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

// PHP/Laravel ne parse jamais un corps multipart sur une requête HTTP PUT
// (seul POST est parsé) : $request reste vide côté serveur et la mise à
// jour échoue silencieusement (200 OK mais aucun champ/fichier appliqué).
// On bascule donc en POST + `_method=PUT` (method override natif de
// Laravel/Symfony) dès que le payload est un FormData ; sinon on garde un
// vrai PUT JSON classique.
const apiUpdate = (url, data, config) => {
  if (data instanceof FormData) {
    data.append("_method", "PUT");
    return api.post(url, data, {
      ...config,
      headers: {
        ...(config?.headers || {}),
        "Content-Type": "multipart/form-data",
      },
    });
  }
  return api.put(url, data, config);
};

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

// Pays (référentiel public)
export const countryService = {
  getAll: () => api.get("/v1/countries"),
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
  updateProfile: (data) => apiUpdate("/v1/auth/profile", data),
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
  getSystemStatus: () => api.get("/v1/admin/system/status"),

  // Gestion des utilisateurs
  getUsers: (params) => api.get("/v1/admin/users", { params }),
  createUser: (data) => api.post("/v1/admin/users", data),
  getUser: (id) => api.get(`/v1/admin/users/${id}`),
  updateUser: (id, data) => apiUpdate(`/v1/admin/users/${id}`, data),
  updateUserRole: (id, role) =>
    api.post(`/v1/admin/users/${id}/assign-role`, { role }),
  deleteUser: (id) => api.delete(`/v1/admin/users/${id}`),
  toggleUserStatus: (id) => api.post(`/v1/admin/users/${id}/toggle-status`),
  getAvailableAgents: () => api.get("/v1/admin/agents"),

  // Gestion des rôles
  getRoles: () => api.get("/v1/admin/checkroles"),
  createRole: (data) => api.post("/v1/admin/checkroles", data),
  updateRole: (id, data) => apiUpdate(`/v1/admin/checkroles/${id}`, data),

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
    apiUpdate(`/v1/admin/properties/${uuid}`, data),
  deleteProperty: (uuid) => api.delete(`/v1/admin/properties/${uuid}`),
  forceDeleteProperty: (uuid) => api.delete(`/v1/admin/properties/${uuid}`),
  toggleFeaturedProperty: (uuid) =>
    api.post(`/v1/admin/properties/${uuid}/toggle-featured`),
  updatePropertyStatus: (uuid, data) =>
    api.post(`/v1/admin/properties/${uuid}/status`, data),
  deletePropertyMedia: (id) =>
    api.delete(`/v1/admin/properties/media/${id}`),

  // Projets d'investissement
  getInvestments: (params) => api.get("/v1/admin/investments", { params }),
  createInvestment: (data) =>
    api.post(
      "/v1/admin/investments",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateInvestment: (uuid, data) =>
    apiUpdate(`/v1/admin/investments/${uuid}`, data),
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
  getHouseModels: (params) => api.get("/v1/admin/house-models", { params }),
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
    apiUpdate(`/v1/admin/house-models/${uuid}`, data),
  deleteHouseModel: (uuid) => api.delete(`/v1/admin/house-models/${uuid}`),

  // Section "Videos de presentation" (page d'accueil)
  getPresentationVideo: () => api.get("/v1/admin/presentation-video"),
  updatePresentationVideo: (data) =>
    api.post("/v1/admin/presentation-video", data),

  // Publicite des menus de la navbar (texte ou image par menu)
  getNavAds: () => api.get("/v1/admin/nav-ads"),
  updateNavAd: (data) =>
    api.post(
      "/v1/admin/nav-ads",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),

  // Partenariats
  getPendingPartnerships: () => api.get("/v1/admin/partnerships/pending"),
  approvePartnership: (uuid) =>
    api.post(`/v1/admin/partnerships/${uuid}/approve`),
  rejectPartnership: (uuid, data) =>
    api.post(`/v1/admin/partnerships/${uuid}/reject`, data),
  getAllPartnerships: (params) => api.get("/v1/admin/partnerships/all", { params }),
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
    apiUpdate(`/v1/admin/property-types/${id}`, data),
  deletePropertyType: (id) => api.delete(`/v1/admin/property-types/${id}`),

  // Caracteristiques
  createPropertyFeature: (data) =>
    api.post("/v1/admin/property-features", data),
  updatePropertyFeature: (id, data) =>
    apiUpdate(`/v1/admin/property-features/${id}`, data),
  deletePropertyFeature: (id) =>
    api.delete(`/v1/admin/property-features/${id}`),

  // Gestion des messages
  getMessages: (params) => api.get("/v1/admin/messages", { params }),
  getMessage: (uuid) => api.get(`/v1/admin/messages/${uuid}`),
  getMessageableUsers: (params) => api.get("/v1/messages/users", { params }),
  createMessage: (data) => api.post("/v1/admin/messages", data),
  updateMessage: (uuid, data) => apiUpdate(`/v1/admin/messages/${uuid}`, data),
  deleteMessage: (uuid) => api.delete(`/v1/admin/messages/${uuid}`),
  markMessageAsRead: (uuid) => api.post(`/v1/admin/messages/${uuid}/mark-read`),
  replyToMessage: (uuid, data) =>
    api.post(`/v1/admin/messages/${uuid}/reply`, data),
  archiveMessage: (uuid) => api.post(`/v1/admin/messages/${uuid}/archive`),
  unarchiveMessage: (uuid) => api.post(`/v1/admin/messages/${uuid}/unarchive`),

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
  getPendingSearchRequests: (params) =>
    api.get("/v1/admin/search-requests/pending", { params }),
  getSearchRequestHistory: (params) =>
    api.get("/v1/admin/search-requests/history", { params }),
  assignSearchRequest: (uuid, data) =>
    api.post(`/v1/admin/search-requests/${uuid}/assign`, data),
  approveSearchRequest: (uuid) =>
    api.post(`/v1/admin/search-requests/${uuid}/approve`),
  rejectSearchRequest: (uuid, data) =>
    api.post(`/v1/admin/search-requests/${uuid}/reject`, data),

  // Projets de construction
  getAllConstructionProjects: (params) =>
    api.get("/v1/admin/construction/all", { params }),
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
    apiUpdate(`/v1/admin/construction/${uuid}`, data),
  deleteConstructionProject: (uuid) =>
    api.delete(`/v1/admin/construction/${uuid}`),

  // Demandes de propriete
  getPendingPropertyRequests: (params) =>
    api.get("/v1/admin/property-requests/pending", { params }),
  getPropertyRequestHistory: (params) =>
    api.get("/v1/admin/property-requests/history", { params }),
  approvePropertyRequest: (uuid) =>
    api.post(`/v1/admin/property-requests/${uuid}/approve`),
  rejectPropertyRequest: (uuid, data) =>
    api.post(`/v1/admin/property-requests/${uuid}/reject`, data),
  assignPropertyRequest: (uuid, data) =>
    api.post(`/v1/admin/property-requests/${uuid}/assign`, data),

  // Demandes clients
  getPendingClientRequests: (params) =>
    api.get("/v1/admin/client-requests/pending", { params }),
  getClientRequestHistory: (params) =>
    api.get("/v1/admin/client-requests/history", { params }),
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
    apiUpdate(`/v1/gestionnaire/properties/${uuid}`, data),
  assignProperty: (uuid, data) =>
    api.post(`/v1/gestionnaire/properties/${uuid}/assign`, data),
  updatePropertyStatus: (uuid, data) =>
    api.post(`/v1/gestionnaire/properties/${uuid}/status`, data),
  deletePropertyMedia: (id) =>
    api.delete(`/v1/gestionnaire/properties/media/${id}`),

  // Gestion des demandes de recherche
  getPendingSearchRequests: (params) =>
    api.get("/v1/gestionnaire/search-requests/pending", { params }),
  getSearchRequestHistory: (params) =>
    api.get("/v1/gestionnaire/search-requests/history", { params }),
  assignSearchRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/assign`, data),
  approveSearchRequest: (uuid) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/approve`),
  rejectSearchRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/search-requests/${uuid}/reject`, data),

  // Gestion des projets de construction
  getAllConstructionProjects: (params) =>
    api.get("/v1/gestionnaire/construction/all", { params }),
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
    apiUpdate(`/v1/gestionnaire/construction/${uuid}`, data),
  deleteConstructionProject: (uuid) =>
    api.delete(`/v1/gestionnaire/construction/${uuid}`),

  // Rapports
  getReports: () => api.get("/v1/gestionnaire/reports"),

  // Agents disponibles
  getAvailableAgents: () => api.get("/v1/gestionnaire/agents"),

  // Demandes de propriete
  getPendingPropertyRequests: (params) =>
    api.get("/v1/gestionnaire/property-requests/pending", { params }),
  getPropertyRequestHistory: (params) =>
    api.get("/v1/gestionnaire/property-requests/history", { params }),
  approvePropertyRequest: (uuid) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/approve`),
  rejectPropertyRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/reject`, data),
  assignPropertyRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/property-requests/${uuid}/assign`, data),

  // Projets d'investissement
  getInvestments: (params) => api.get("/v1/gestionnaire/investments", { params }),
  createInvestment: (data) =>
    api.post(
      "/v1/gestionnaire/investments",
      data,
      data instanceof FormData
        ? { headers: { "Content-Type": "multipart/form-data" } }
        : undefined,
    ),
  updateInvestment: (uuid, data) =>
    apiUpdate(`/v1/gestionnaire/investments/${uuid}`, data),
  deleteInvestment: (uuid) =>
    api.delete(`/v1/gestionnaire/investments/${uuid}`),
  approveInvestment: (uuid) =>
    api.post(`/v1/gestionnaire/investments/${uuid}/approve`),
  rejectInvestment: (uuid, data) =>
    api.post(`/v1/gestionnaire/investments/${uuid}/reject`, data),

  // Demandes clients
  getPendingClientRequests: (params) =>
    api.get("/v1/gestionnaire/client-requests/pending", { params }),
  getClientRequestHistory: (params) =>
    api.get("/v1/gestionnaire/client-requests/history", { params }),
  approveClientRequest: (uuid) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/approve`),
  rejectClientRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/reject`, data),
  assignClientRequest: (uuid, data) =>
    api.post(`/v1/gestionnaire/client-requests/${uuid}/assign`, data),

  // Messages
  getMessages: () => api.get("/v1/gestionnaire/messages", { params: { per_page: 100 } }),
  sendMessage: (data) => api.post("/v1/gestionnaire/messages", data),
  getMessageThread: (uuid) => api.get(`/v1/gestionnaire/messages/${uuid}`),
  replyToMessage: (uuid, data) =>
    api.post(`/v1/gestionnaire/messages/${uuid}/reply`, data),
  getMessageableUsers: (params) => api.get("/v1/messages/users", { params }),
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
  updateProperty: (uuid, data) => apiUpdate(`/v1/agent/properties/${uuid}`, data),
  deletePropertyMedia: (id) => api.delete(`/v1/agent/properties/media/${id}`),

  // Messages clients
  getMessages: () => api.get("/v1/agent/messages", { params: { per_page: 100 } }),
  sendMessage: (data) => api.post("/v1/agent/messages", data),
  getMessageThread: (uuid) => api.get(`/v1/agent/messages/${uuid}`),
  respondToMessage: (uuid, data) =>
    api.post(`/v1/agent/messages/${uuid}/respond`, data),
  markMessageAsRead: (uuid) => api.post(`/v1/agent/messages/${uuid}/mark-read`),
  getMessageableUsers: (params) => api.get("/v1/messages/users", { params }),

  // Demandes de recherche
  getAssignedSearchRequests: () =>
    api.get("/v1/agent/search-requests/assigned"),
  getSearchRequestHistory: () =>
    api.get("/v1/agent/search-requests/history"),
  approveSearchRequest: (uuid) =>
    api.post(`/v1/agent/search-requests/${uuid}/approve`),
  rejectSearchRequest: (uuid, data) =>
    api.post(`/v1/agent/search-requests/${uuid}/reject`, data),
  addSearchRequestReport: (uuid, data) =>
    api.post(`/v1/agent/search-requests/${uuid}/reports`, data),
  concludeSearchRequestDeal: (uuid, data) =>
    api.post(`/v1/agent/search-requests/${uuid}/conclude`, data),
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
    apiUpdate(`/v1/agent/construction/publications/${uuid}`, data),

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
    apiUpdate(`/v1/agent/investments/publications/${uuid}`, data),

  // Propositions d'investissement a traiter (agent investissement)
  getInvestmentProposals: (params) =>
    api.get("/v1/agent/investments/proposals", { params }),
  approveInvestmentProposal: (uuid) =>
    api.post(`/v1/agent/investments/proposals/${uuid}/approve`),
  rejectInvestmentProposal: (uuid, data) =>
    api.post(`/v1/agent/investments/proposals/${uuid}/reject`, data),
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
    apiUpdate(`/v1/proprietaire/properties/${uuid}`, data),
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
    api.post("/v1/visiteur/construction/request", data),
  getMyConstructionRequests: () =>
    api.get("/v1/visiteur/construction/my-requests"),
};

// ====================
// SERVICES ENTREPRISE PARTENAIRE (COMPANY)
// ====================

// Produits partenaires — admin & gestionnaire
export const partnerProductService = {
  getPending: () => api.get("/v1/admin/partner-products/pending"),
  getAll: (params) => api.get("/v1/admin/partner-products/all", { params }),
  approve: (uuid) => api.post(`/v1/admin/partner-products/${uuid}/approve`),
  reject: (uuid, reason) => api.post(`/v1/admin/partner-products/${uuid}/reject`, { reason }),
};

// Partenaires approuves — liste allegee pour rattacher un partenaire
// (immobilier / constructeur / investisseur) a un bien/projet
export const partnershipLookupService = {
  getApproved: (type) =>
    api.get("/v1/partnerships/lookup", { params: type ? { type } : undefined }),
};

export default api;
