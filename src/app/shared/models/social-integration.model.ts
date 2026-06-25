import { SocialPlatform } from './social-platform.model';

export type IntegrationStatus = 'CONNECTED' | 'ERROR' | 'DISCONNECTED';

/** Mirrors the backend `IntegrationResponse` (token is masked, never the real value). */
export interface SocialIntegration {
  id: number;
  platform: SocialPlatform;
  externalAccountId: string;
  displayName?: string | null;
  status: IntegrationStatus;
  accessTokenMasked: string;
  createdAt: string;
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

/** Mirrors the backend `IntegrationPostResponse`. */
export interface IntegrationPost {
  id: string;
  message?: string | null;
  createdTime?: string | null;
  fullPicture?: string | null;
  permalinkUrl?: string | null;
}

/** Mirrors the backend `IntegrationPostPageResponse`. */
export interface IntegrationPostPage {
  posts: IntegrationPost[];
  nextCursor?: string | null;
}

/** Mirrors the backend `CreatePostResponse`. */
export interface CreatePostResponse {
  externalPostId: string;
}
