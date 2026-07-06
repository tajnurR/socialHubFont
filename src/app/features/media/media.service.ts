import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  CreateMediaFolderRequest,
  MediaBulkUploadResult,
  MediaFilter,
  MediaFolder,
  MediaItem,
  MediaPage,
  MediaSortOrder,
} from '../../shared/models/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(ApiService);

  list(filter: MediaFilter = 'ALL', folderId?: number | null): Observable<MediaItem[]> {
    return this.api.get<MediaItem[]>(ApiEndpoint.MEDIA, {
      params: this.withOptionalFolderId({ filter }, folderId),
    });
  }

  page(options: {
    filter: MediaFilter;
    folderId?: number | null;
    search?: string;
    sortOrder: MediaSortOrder;
    page: number;
    size: number;
  }): Observable<MediaPage> {
    const params = this.withOptionalSearch(
      this.withOptionalFolderId(
        {
          filter: options.filter,
          sortOrder: options.sortOrder,
          page: options.page,
          size: options.size,
        },
        options.folderId,
      ),
      options.search,
    );
    return this.api.get<MediaPage>(ApiEndpoint.MEDIA_PAGE, { params });
  }

  folders(): Observable<MediaFolder[]> {
    return this.api.get<MediaFolder[]>(ApiEndpoint.MEDIA_FOLDERS);
  }

  createFolder(body: CreateMediaFolderRequest): Observable<MediaFolder> {
    return this.api.post<MediaFolder>(ApiEndpoint.MEDIA_FOLDERS, body);
  }

  upload(files: File[], folderId: number): Observable<MediaBulkUploadResult> {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }
    return this.api.post<MediaBulkUploadResult>(ApiEndpoint.MEDIA, form, {
      params: this.withOptionalFolderId({}, folderId),
    });
  }

  retry(mediaId: number, file: File): Observable<MediaItem> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.api.post<MediaItem>(ApiEndpoint.MEDIA_RETRY, form, {
      pathParams: { id: mediaId },
    });
  }

  delete(mediaId: number): Observable<void> {
    return this.api.delete<void>(ApiEndpoint.MEDIA_BY_ID, { pathParams: { id: mediaId } });
  }

  download(mediaId: number): Observable<Blob> {
    return this.api.get<Blob>(ApiEndpoint.MEDIA_DOWNLOAD, {
      pathParams: { id: mediaId },
      responseType: 'blob',
    });
  }

  export(format: 'csv' | 'xlsx', folderId?: number | null, mediaIds: number[] = []): Observable<Blob> {
    return this.api.get<Blob>(ApiEndpoint.MEDIA_EXPORT, {
      params: this.withOptionalMediaIds(this.withOptionalFolderId({ format }, folderId), mediaIds),
      responseType: 'blob',
    });
  }

  private withOptionalFolderId<T extends Record<string, string | number | boolean | number[]>>(
    params: T,
    folderId?: number | null,
  ): T & { folderId?: number } {
    if (folderId == null) {
      return params;
    }
    return { ...params, folderId };
  }

  private withOptionalMediaIds<T extends Record<string, string | number | boolean | number[]>>(
    params: T,
    mediaIds: number[],
  ): T & { ids?: number[] } {
    const ids = mediaIds.filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) {
      return params;
    }
    return { ...params, ids };
  }

  private withOptionalSearch<T extends Record<string, string | number | boolean | number[]>>(
    params: T,
    search?: string,
  ): T & { search?: string } {
    const term = search?.trim();
    if (!term) {
      return params;
    }
    return { ...params, search: term };
  }
}
