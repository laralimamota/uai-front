import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const usersApi = {
  list: (params) => api.get("/usuarios", { params }),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (payload) => api.post("/usuarios", payload),
  update: (id, payload) => api.put(`/usuarios/${id}`, payload),
  remove: (id) => api.delete(`/usuarios/${id}`),
};

export const accountsApi = {
  list: (params = {}, config = {}) =>
    api.get("/contas", {
      ...config,
      params: {
        ...(config.params ?? {}),
        ...params,
      },
    }),
  getById: (id) => api.get(`/contas/${id}`),
  listByUser: (userId, params) => api.get(`/contas/usuario/${userId}`, { params }),
  create: (payload) => api.post("/contas", payload),
  update: (id, payload) => api.put(`/contas/${id}`, payload),
  remove: (id) => api.delete(`/contas/${id}`),
};

export const transactionsApi = {
  list: (params) => api.get("/transacoes", { params }),
  getById: (id) => api.get(`/transacoes/${id}`),
  listByAccount: (accountId, params) => api.get(`/transacoes/conta/${accountId}`, { params }),
  create: (payload) => api.post("/transacoes", payload),
  update: (id, payload) => api.put(`/transacoes/${id}`, payload),
  remove: (id) => api.delete(`/transacoes/${id}`),
};

export const recurrencesApi = {
  list: (params = {}, config = {}) =>
    api.get("/recorrencias", {
      ...config,
      params: {
        ...(config.params ?? {}),
        ...params,
      },
    }),
  getById: (id) => api.get(`/recorrencias/${id}`),
  create: (payload) => api.post("/recorrencias", payload),
  update: (id, payload) => api.put(`/recorrencias/${id}`, payload),
  remove: (id) => api.delete(`/recorrencias/${id}`),
  generateEntries: (id, payload, config) => api.post(`/recorrencias/${id}/gerar`, payload, config),
};

export const installmentsApi = {
  list: (params = {}, config = {}) =>
    api.get("/parcelamentos", {
      ...config,
      params: {
        ...(config.params ?? {}),
        ...params,
      },
    }),
  getById: (id, config) => api.get(`/parcelamentos/${id}`, config),
  create: (payload, config) => api.post("/parcelamentos", payload, config),
  update: (id, payload, config) => api.put(`/parcelamentos/${id}`, payload, config),
  remove: (id, config) => api.delete(`/parcelamentos/${id}`, config),
  registerPayment: (id, payload, config) => api.post(`/parcelamentos/${id}/registrar-pagamento`, payload, config),
  listTransactions: (id, params = {}, config = {}) =>
    api.get(`/parcelamentos/${id}/transacoes`, {
      ...config,
      params: {
        ...(config.params ?? {}),
        ...params,
      },
    }),
};

export default api;
