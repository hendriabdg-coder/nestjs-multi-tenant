/**
 * Minimal shape this library needs from an authenticated request. Matches the
 * `req.user` object Passport attaches after a JWT strategy's `validate()` resolves
 * (e.g. `{ id, email, tenantId }`) — only `tenantId` is required here.
 */
export interface TenantAwareUser {
  tenantId?: string;
  [key: string]: unknown;
}

export interface TenantAwareRequest {
  user?: TenantAwareUser;
}
