import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  MediaBulkUploadResult,
  MediaFilter,
  MediaItem,
} from '../../shared/models/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly api = inject(ApiService);

  list(filter: MediaFilter = 'ALL'): Observable<MediaItem[]> {
    return this.api.get<MediaItem[]>(ApiEndpoint.MEDIA, { params: { filter } });
  }

  upload(files: File[]): Observable<MediaBulkUploadResult> {
    const form = new FormData();
    for (const file of files) {
      form.append('files', file, file.name);
    }
    return this.api.post<MediaBulkUploadResult>(ApiEndpoint.MEDIA, form);
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

  export(format: 'csv' | 'xlsx'): Observable<Blob> {
    return this.api.get<Blob>(ApiEndpoint.MEDIA_EXPORT, {
      params: { format },
      responseType: 'blob',
    });
  }
}
