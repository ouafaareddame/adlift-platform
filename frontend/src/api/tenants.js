import apiClient from "@/api/client";

export function fetchTenants({ page = 0, size = 20 } = {}) {
  return apiClient.get("/api/tenants", { params: { page, size } }).then((res) => res.data);
}

export function createTenant(payload) {
  return apiClient.post("/api/tenants", payload).then((res) => res.data);
}

export function activateTenant(id) {
  return apiClient.patch(`/api/tenants/${id}/activate`).then((res) => res.data);
}

export function deactivateTenant(id) {
  return apiClient.patch(`/api/tenants/${id}/deactivate`).then((res) => res.data);
}

export function deleteTenant(id) {
  return apiClient.delete(`/api/tenants/${id}`);
}
