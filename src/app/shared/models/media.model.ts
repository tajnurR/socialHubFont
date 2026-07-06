export type MediaType = 'IMAGE' | 'VIDEO';
export type MediaUploadStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED';
export type MediaFilter = 'ALL' | 'IMAGES' | 'VIDEOS' | 'UPLOADED' | 'FAILED' | 'RECENT';
export type MediaSortOrder = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC' | 'SIZE_DESC';

export interface MediaFolder {
  folderId: number;
  name: string;
  googleDriveFolderId: string;
  googleDriveUrl?: string | null;
  mediaCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  mediaId: number;
  fileName: string;
  originalFileName: string;
  mediaType: MediaType;
  contentType: string;
  extension: string;
  fileSize: number;
  checksumSha256: string;
  folderId?: number | null;
  folderName?: string | null;
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

export interface MediaPage {
  items: MediaItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export interface CreateMediaFolderRequest {
  name: string;
}
