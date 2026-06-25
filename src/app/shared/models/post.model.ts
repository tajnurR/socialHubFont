import { SocialPlatform } from './social-platform.model';

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

/** Mirrors the backend `Post` entity / future post DTO. */
export interface Post {
  id: number;
  organizationId: number;
  socialAccountId?: number | null;
  platform: SocialPlatform;
  externalPostId?: string | null;
  content?: string | null;
  status: PostStatus;
  publishedAt?: string | null;
  createdAt: string;
}
