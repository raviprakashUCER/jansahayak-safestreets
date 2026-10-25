/**
 * Role Definitions & Permissions for JanSahayak
 */

export type UserRole = "citizen" | "moderator" | "admin" | "field_official";

export interface UserSession {
  userId: string;
  email: string;
  fullName?: string;
  role: UserRole;
  avatarUrl?: string;
  isAuthenticated: boolean;
}

export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    canSubmitReport: boolean;
    canViewPublicMap: boolean;
    canViewModerationQueue: boolean;
    canApproveRejectIncident: boolean;
    canMergeIncidents: boolean;
    canPublishMapPin: boolean;
    canViewCivicAnalytics: boolean;
    canManageUsers: boolean;
    canUpdateRepairStatus: boolean;
  }
> = {
  citizen: {
    canSubmitReport: true,
    canViewPublicMap: true,
    canViewModerationQueue: false,
    canApproveRejectIncident: false,
    canMergeIncidents: false,
    canPublishMapPin: false,
    canViewCivicAnalytics: false,
    canManageUsers: false,
    canUpdateRepairStatus: false,
  },
  moderator: {
    canSubmitReport: true,
    canViewPublicMap: true,
    canViewModerationQueue: true,
    canApproveRejectIncident: true,
    canMergeIncidents: true,
    canPublishMapPin: true,
    canViewCivicAnalytics: true,
    canManageUsers: false,
    canUpdateRepairStatus: false,
  },
  admin: {
    canSubmitReport: true,
    canViewPublicMap: true,
    canViewModerationQueue: true,
    canApproveRejectIncident: true,
    canMergeIncidents: true,
    canPublishMapPin: true,
    canViewCivicAnalytics: true,
    canManageUsers: true,
    canUpdateRepairStatus: true,
  },
  field_official: {
    canSubmitReport: true,
    canViewPublicMap: true,
    canViewModerationQueue: true,
    canApproveRejectIncident: false,
    canMergeIncidents: false,
    canPublishMapPin: false,
    canViewCivicAnalytics: true,
    canManageUsers: false,
    canUpdateRepairStatus: true,
  },
};

export function hasPermission(
  role: UserRole,
  permission: keyof (typeof ROLE_PERMISSIONS)["citizen"],
): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}
