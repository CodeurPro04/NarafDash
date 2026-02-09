import api from "./api";

const extractList = (response) => {
  const payload = response?.data;
  const data = payload?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const visitorService = {
  extractList,
  getProfile: () => api.get("/v1/auth/profile"),
  updateProfile: (payload) => api.put("/v1/auth/profile", payload),
  changePassword: (payload) => api.post("/v1/auth/change-password", payload),
  getMessages: () => api.get("/v1/visiteur/messages"),
  replyMessage: (uuid, payload) => api.post(`/v1/visiteur/messages/${uuid}/reply`, payload),
  getSearchRequests: () => api.get("/v1/visiteur/search-requests"),
  createSearchRequest: (payload) => api.post("/v1/visiteur/search-requests", payload),
  getConstructionRequests: () => api.get("/v1/visiteur/construction/my-requests"),
  createConstructionRequest: (payload) => api.post("/v1/visiteur/construction/request", payload),
  getPropertyTypes: () => api.get("/v1/property-types"),
};
