import apiClient from "@/api/client";

export function fetchCampaigns({ page = 0, size = 12, status, type, keyword, startDate, endDate } = {}) {
  const params = { page, size, sort: "createdAt,desc" };
  if (status) params.status = status;
  if (type) params.type = type;
  if (keyword) params.keyword = keyword;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const hasFilters = Boolean(status || type || keyword || startDate || endDate);
  return apiClient
    .get(hasFilters ? "/api/campaigns/search" : "/api/campaigns", { params })
    .then((res) => res.data);
}

export function createCampaign(payload) {
  return apiClient.post("/api/campaigns", payload).then((res) => res.data);
}

export function updateCampaign(id, payload) {
  return apiClient.put(`/api/campaigns/${id}`, payload).then((res) => res.data);
}

export function changeCampaignStatus(id, newStatus) {
  return apiClient
    .patch(`/api/campaigns/${id}/status`, null, { params: { newStatus } })
    .then((res) => res.data);
}

export function deleteCampaign(id) {
  return apiClient.delete(`/api/campaigns/${id}`);
}

export function recordCampaignMetrics(id, payload) {
  return apiClient.post(`/api/campaigns/${id}/metrics`, payload).then((res) => res.data);
}

export function fetchCampaignKpis(id) {
  return apiClient.get(`/api/campaigns/${id}/kpis`).then((res) => res.data);
}

export function fetchCampaignMetricsHistory(id) {
  return apiClient.get(`/api/campaigns/${id}/metrics`).then((res) => res.data);
}

export function fetchCampaignEmail(id) {
  return apiClient.get(`/api/campaigns/${id}/email`).then((res) => res.data);
}

export function saveCampaignEmail(id, payload) {
  return apiClient.put(`/api/campaigns/${id}/email`, payload).then((res) => res.data);
}

export function sendCampaignEmail(id) {
  return apiClient.post(`/api/campaigns/${id}/email/send`).then((res) => res.data);
}

export function syncCampaignEmail(id) {
  return apiClient.post(`/api/campaigns/${id}/email/sync`).then((res) => res.data);
}

export function fetchOverview() {
  return apiClient.get("/api/campaigns/overview").then((res) => res.data);
}

function reportParams({ startDate, endDate, tenantId }) {
  return { startDate, endDate, ...(tenantId ? { tenantId } : {}) };
}

export function fetchReport(filters) {
  return apiClient.get("/api/campaigns/report", { params: reportParams(filters) }).then((res) => res.data);
}

export function exportReport(filters) {
  return apiClient
    .get("/api/campaigns/report/export", { params: reportParams(filters), responseType: "blob" })
    .then((res) => res.data);
}
