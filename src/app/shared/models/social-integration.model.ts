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

export interface InstagramAccountOption {
  id: string;
  name: string;
  pageId?: string | null;
  pageName?: string | null;
}

export interface InstagramExchangeResult {
  exchangeId: string;
  accounts: InstagramAccountOption[];
  userTokenExpiresAt?: string | null;
}

export interface InstagramAuthorizationUrl {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface LinkedInAuthorizationUrl {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface LinkedInAccountOption {
  id: string;
  name: string;
  accountType: 'PERSONAL' | 'COMPANY' | string;
}

export interface LinkedInExchangeResult {
  exchangeId: string;
  accounts: LinkedInAccountOption[];
  tokenExpiresAt?: string | null;
}

export interface LinkedInCredentialConfig {
  id: number;
  label?: string | null;
  clientId: string;
  clientSecretMasked: string;
  redirectUri?: string | null;
  scopes?: string | null;
  apiVersion?: string | null;
  connected?: boolean;
  createdAt?: string | null;
  status?: 'ACTIVE' | 'DELETED';
}

export interface LinkedInCredentialConfigRequest {
  clientId: string;
  clientSecret: string;
  label?: string | null;
  redirectUri?: string | null;
  scopes?: string | null;
  apiVersion?: string | null;
}

export interface LinkedInCredentialConfigUpdateRequest {
  clientId: string;
  clientSecret?: string | null;
  label?: string | null;
  redirectUri?: string | null;
  scopes?: string | null;
  apiVersion?: string | null;
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
  connected?: boolean;
  createdAt?: string | null;
  status?: 'ACTIVE' | 'DELETED';
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

export interface FacebookCredentialConfigUpdateRequest {
  appId: string;
  appSecret?: string | null;
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

export type DriveConnectionStatus =
  | 'CONNECTED'
  | 'REAUTH_REQUIRED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface GoogleDriveConnection {
  connected: boolean;
  googleAccountName?: string | null;
  googleAccountEmail?: string | null;
  status: DriveConnectionStatus;
  connectedAt?: string | null;
  lastSyncAt?: string | null;
}

export interface GoogleDriveAuthorizationUrl {
  authorizationUrl: string;
  state: string;
  expiresAt: string;
}

export interface GoogleDriveCredentialConfig {
  id: number;
  label?: string | null;
  clientId: string;
  clientSecretMasked: string;
  redirectUri?: string | null;
  scopes?: string | null;
}

export interface GoogleDriveCredentialConfigRequest {
  clientId: string;
  clientSecret: string;
  label?: string | null;
  redirectUri?: string | null;
  scopes?: string | null;
}

export interface GoogleDriveQuota {
  limitBytes?: number | null;
  usageBytes?: number | null;
  full: boolean;
}

export interface GoogleDriveTestResult {
  ok: boolean;
  message: string;
  testedAt: string;
  quota?: GoogleDriveQuota | null;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  size?: number | null;
  createdTime?: string | null;
}

export interface GoogleDriveFiles {
  files: GoogleDriveFile[];
}
