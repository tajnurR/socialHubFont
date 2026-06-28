import { SocialPlatform } from './social-platform.model';

export type IntegrationStatus = 'CONNECTED' | 'REAUTH_REQUIRED' | 'ERROR' | 'DISCONNECTED';

/** Mirrors the backend `IntegrationResponse` (token is masked, never the real value). */
export interface SocialIntegration {
  id: number;
  platform: SocialPlatform;
  externalAccountId: string;
  displayName?: string | null;
  status: IntegrationStatus;
  accessTokenMasked: string;
  tokenType?: string | null;
  tokenObtainedAt?: string | null;
  tokenExpiresAt?: string | null;
  appCredentialId?: number | null;
  createdAt: string;
}

/** A Facebook Page the user can choose to connect (from the OAuth exchange). */
export interface FacebookPageOption {
  id: string;
  name: string;
}

/** Mirrors the backend Facebook OAuth exchange response. */
export interface FacebookExchangeResult {
  exchangeId: string;
  pages: FacebookPageOption[];
  userTokenExpiresAt?: string | null;
}

/** A stored Facebook app config owned by the current user. Secret is masked only. */
export interface FacebookCredentialConfig {
  id: number;
  label?: string | null;
  appId: string;
  appSecretMasked: string;
  redirectUri?: string | null;
  scopes?: string | null;
  apiVersion?: string | null;
}

/** Create another Facebook app config for the current user. */
export interface FacebookCredentialConfigRequest {
  appId: string;
  appSecret: string;
  label?: string | null;
  redirectUri?: string | null;
  scopes?: string | null;
  apiVersion?: string | null;
}

/** Mirrors the backend `ConnectIntegrationRequest`. Credentials are platform-specific. */
export interface ConnectIntegrationRequest {
  platform: SocialPlatform;
  credentials: Record<string, string>;
}

/** Mirrors the backend `CreatePostRequest`. */
export interface CreatePostRequest {
  message: string;
  link?: string;
}

/** Mirrors the backend `CreatePostResponse`. */
export interface CreatePostResponse {
  externalPostId: string;
}

/** Per-org Facebook app credential status (secret never returned, only masked). */
export interface FacebookCredentialStatus {
  configured: boolean;
  appId?: string | null;
  appSecretMasked?: string | null;
}
