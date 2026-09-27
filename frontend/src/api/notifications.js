import apiClient from "@/api/client";

export function fetchNotifications({ page = 0, size = 20 } = {}) {
  return apiClient
    .get("/api/notifications", { params: { page, size, sort: "createdAt,desc" } })
    .then((res) => res.data);
}

export function fetchUnreadCount() {
  return apiClient.get("/api/notifications/unread-count").then((res) => Number(res.data ?? 0));
}

export function markNotificationRead(id) {
  return apiClient.patch(`/api/notifications/${id}/read`);
}

export function isNotificationRead(item) {
  if (typeof item?.isRead === "boolean") return item.isRead;
  if (typeof item?.read === "boolean") return item.read;
  return false;
}

export function translateNotification(message) {
  const match = String(message || "").match(
    /^La campagne "(.+)" est passée de (\w+) à (\w+)\.$/
  );
  if (match) {
    return `Campaign “${match[1]}” moved from ${match[2]} to ${match[3]}.`;
  }
  return message || "";
}
