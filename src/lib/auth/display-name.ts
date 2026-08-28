type DisplayNameSource = {
  profileDisplayName?: string | null;
  profileFullName?: string | null;
  metadataDisplayName?: unknown;
  metadataFullName?: unknown;
  email?: string | null;
  phone?: string | null;
};

function readableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveDisplayName(source: DisplayNameSource) {
  const preferredName = [
    source.profileDisplayName,
    source.profileFullName,
    source.metadataDisplayName,
    source.metadataFullName,
  ]
    .map(readableString)
    .find(Boolean);

  if (preferredName) return preferredName;

  const emailName = source.email?.split("@")[0]?.trim();
  if (emailName) return emailName;

  const phoneDigits = source.phone?.replace(/\D/g, "");
  return phoneDigits && phoneDigits.length >= 4
    ? `Student ····${phoneDigits.slice(-4)}`
    : "Student";
}
