import { SocialPlatform } from './social-platform.model';

/** Post lifecycle (mirrors backend `PostStatus`). */
export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED';

/** Mirrors the backend `PostResponse` DTO. */
export interface PostResponse {
  id: number;
  socialIntegrationId: number;
  platform: SocialPlatform;
  content?: string | null;
  link?: string | null;
  mediaUrl?: string | null;
  productId?: number | null;
  status: PostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalPostId?: string | null;
  errorMessage?: string | null;
  scheduleEventId?: number | null;
  createdAt: string;
}

/** Editable fields of a draft (mirrors `UpdatePostRequest`). */
export interface UpdatePostRequest {
  content?: string | null;
  link?: string | null;
  mediaUrl?: string | null;
  productId?: number | null;
  socialIntegrationId?: number | null;
}

export interface RowError {
  row: number;
  message: string;
}

/** Outcome of a bulk upload (mirrors `BulkUploadResult`). */
export interface BulkUploadResult {
  importedCount: number;
  errors: RowError[];
}

/** Optional filters for the posts list. */
export interface PostFilter {
  status?: PostStatus;
  pageId?: number;
  productId?: number;
}

// --- Products --------------------------------------------------------------

export interface Product {
  id: number;
  name: string;
  sku?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface ProductRequest {
  name: string;
  sku?: string | null;
  description?: string | null;
}

// --- Schedule events -------------------------------------------------------

export type ScheduleMode = 'EXPLICIT' | 'INTERVAL';

export interface CreateScheduleEventRequest {
  name: string;
  mode: ScheduleMode;
  startTime?: string | null;
  intervalHours?: number | null;
}

/** One post to attach. `scheduledAt` required for EXPLICIT, ignored for INTERVAL. */
export interface ScheduledPostInput {
  postId: number;
  scheduledAt?: string | null;
}

export interface AttachPostsRequest {
  items: ScheduledPostInput[];
}

export interface ScheduleEvent {
  id: number;
  name: string;
  mode: ScheduleMode;
  startTime?: string | null;
  intervalHours?: number | null;
  status: string;
  createdAt: string;
  posts: PostResponse[];
}
