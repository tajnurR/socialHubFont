import { SocialPlatform } from './social-platform.model';

/** Post lifecycle (mirrors backend `PostStatus`). */
export type PostStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'POSTED'
  | 'NOT_POSTED'
  | 'FAILED'
  | 'PAUSED'
  | 'CANCELLED';

/** Mirrors the backend `PostResponse` DTO. */
export interface PostResponse {
  id: number;
  socialIntegrationId: number;
  targetAccountName?: string | null;
  platform: SocialPlatform;
  title?: string | null;
  content?: string | null;
  link?: string | null;
  mediaUrl?: string | null;
  mediaAssetId?: number | null;
  mediaType?: 'IMAGE' | 'VIDEO' | null;
  googleDriveFileId?: string | null;
  googleDriveUrl?: string | null;
  directDownloadUrl?: string | null;
  thumbnailUrl?: string | null;
  mediaUploadStatus?: 'UPLOADING' | 'UPLOADED' | 'FAILED' | null;
  productId?: number | null;
  status: PostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  externalPostId?: string | null;
  errorMessage?: string | null;
  scheduleEventId?: number | null;
  scheduleName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Create a single post from Post Management. */
export interface CreatePostRequest {
  platform: SocialPlatform;
  socialIntegrationId: number;
  title: string;
  content: string;
  link?: string | null;
  mediaUrl?: string | null;
  mediaAssetId?: number | null;
  productId: number;
}

/** Editable fields of a draft (mirrors `UpdatePostRequest`). */
export interface UpdatePostRequest {
  platform?: SocialPlatform | null;
  socialIntegrationId?: number | null;
  title?: string | null;
  content: string;
  link?: string | null;
  mediaUrl?: string | null;
  mediaAssetId?: number | null;
  productId?: number | null;
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
  keyword?: string;
  status?: PostStatus;
  platform?: SocialPlatform;
  pageId?: number;
  productId?: number;
  scheduleId?: number;
  from?: string;
  to?: string;
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
