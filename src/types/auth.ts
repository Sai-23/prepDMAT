export const USER_ROLES = ["student", "reviewer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AuthUserSummary = {
  id: string;
  email: string | null;
  roles: UserRole[];
};

export type Profile = {
  id: string;
  displayName: string | null;
  fullName: string | null;
  avatarPath: string | null;
  targetExamDate: string | null;
  marketingEmailOptIn: boolean;
  marketingEmailOptInAt: string | null;
  marketingSmsOptIn: boolean;
  marketingSmsOptInAt: string | null;
  marketingConsentVersion: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
};
