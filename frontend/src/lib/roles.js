// AGENCY_ADMIN is an Adlift team member who runs a client's workspace; CLIENT is the client's own read-only login.
const ROLE_LABELS = {
  SUPER_ADMIN: "Adlift direction",
  AGENCY_ADMIN: "Account manager",
  CLIENT: "Client",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

export const ROLE_HINTS = {
  AGENCY_ADMIN: "Adlift team member: runs campaigns, metrics, emails and logins.",
  CLIENT: "Client contact: follows results, read-only.",
};
