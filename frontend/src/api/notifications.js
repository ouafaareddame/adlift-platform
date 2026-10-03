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

/** Met la cloche à jour après une action ; l'événement passe par RabbitMQ, d'où le second rafraîchissement. */
export function refreshNotifications(queryClient) {
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
  };
  refresh();
  setTimeout(refresh, 1500);
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
  for (const [pattern, format] of ACTIVITY_TRANSLATIONS) {
    const found = String(message || "").match(pattern);
    if (found) return format(...found.slice(1));
  }
  return message || "";
}

const ROLE_LABELS = { AGENCY_ADMIN: "Agency admin", CLIENT: "Client" };
const roleLabel = (role) => ROLE_LABELS[role] || role;

const ACTIVITY_TRANSLATIONS = [
  [/^L'espace client « (.+) » a été créé \(admin : (.+)\)\.$/, (name, admin) => `Client workspace “${name}” was created (admin: ${admin}).`],
  [/^L'espace client « (.+) » a été désactivé\.$/, (name) => `Client workspace “${name}” was deactivated.`],
  [/^L'espace client « (.+) » a été réactivé\.$/, (name) => `Client workspace “${name}” was reactivated.`],
  [/^(.+) a été ajouté à l'espace avec le rôle (\w+)\.$/, (email, role) => `${email} joined the workspace as ${roleLabel(role)}.`],
  [/^Le rôle de (.+) est passé à (\w+)\.$/, (email, role) => `${email} is now ${roleLabel(role)}.`],
  [/^Le compte (.+) a été désactivé\.$/, (email) => `${email} was deactivated.`],
  [/^Le compte (.+) a été réactivé\.$/, (email) => `${email} was reactivated.`],
];

/** Page vers laquelle mène une notification dans la cloche. */
export function notificationTarget(item, role) {
  const type = item?.type || "";
  if (type.startsWith("TENANT_")) return "/tenants";
  if (type.startsWith("MEMBER_")) return "/members";
  return role === "SUPER_ADMIN" ? null : "/campaigns";
}
