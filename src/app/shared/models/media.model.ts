export type MediaType = 'IMAGE' | 'VIDEO';
export type MediaUploadStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED';
export type MediaFilter = 'ALL' | 'IMAGES' | 'VIDEOS' | 'UPLOADED' | 'FAILED' | 'RECENT';

export interface MediaItem {
  mediaId: number;
  fileName: string;
  originalFileName: string;
  mediaType: MediaType;
  contentType: string;
  extension: string;
  fileSize: number;
  checksumSha256: string;
  googleDriveFileId?: string | null;
  googleDriveUrl?: string | null;
  directDownloadUrl?: string | null;
  thumbnailUrl?: string | null;
  uploadStatus: MediaUploadStatus;
  errorMessage?: string | null;
  relatedPostCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadItemResult {
  fileName: string;
  duplicate: boolean;
  uploaded: boolean;
  errorMessage?: string | null;
  media?: MediaItem | null;
}

export interface MediaBulkUploadResult {
  totalCount: number;
  uploadedCount: number;
  failedCount: number;
  duplicateCount: number;
  progressPercentage: number;
  items: MediaUploadItemResult[];
}
