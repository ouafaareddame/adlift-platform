import apiClient from "@/api/client";

export function fetchMembers() {
  return apiClient.get("/api/members").then((res) => res.data);
}

export function inviteMember(payload) {
  return apiClient.post("/api/members/invite", payload).then((res) => res.data);
}

export function updateMemberRole(id, role) {
  return apiClient.put(`/api/members/${id}/role`, { role }).then((res) => res.data);
}

export function deactivateMember(id) {
  return apiClient.patch(`/api/members/${id}/deactivate`);
}

export function activateMember(id) {
  return apiClient.patch(`/api/members/${id}/activate`);
}

export function resetMemberPassword(id) {
  return apiClient.post(`/api/members/${id}/reset-password`).then((res) => res.data);
}

export function isMemberActive(member) {
  if (typeof member?.isActive === "boolean") return member.isActive;
  if (typeof member?.active === "boolean") return member.active;
  return true;
}
