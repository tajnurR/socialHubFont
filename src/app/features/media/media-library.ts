import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MediaFilter, MediaItem } from '../../shared/models/media.model';
import { MediaService } from './media.service';

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  percentage: number;
  errors: string[];
}

@Component({
  selector: 'app-media-library',
  imports: [DatePipe, PageHeader],
  template: `
    <app-page-header title="Media" subtitle="Google Drive-backed image and video library" />

    <section
      class="rounded-lg border border-dashed border-slate-300 bg-white p-6"
      [class.border-indigo-400]="dragging()"
      [class.bg-indigo-50]="dragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-800">Upload media files</h3>
          <p class="mt-1 text-sm text-slate-500">
            Images: jpg, jpeg, png, webp, gif. Videos: mp4, mov, avi, webm.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            [disabled]="uploading()"
            (click)="fileInput.click()"
          >
            Select files
          </button>
          <input
            #fileInput
            type="file"
            multiple
            class="hidden"
            accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
            (change)="onFileInput($event)"
          />
          <input
            #retryInput
            type="file"
            class="hidden"
            accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
            (change)="onRetryInput($event)"
          />
        </div>
      </div>

      @if (progress(); as p) {
        <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span class="font-medium text-slate-700">
              {{ p.uploaded + p.failed }} / {{ p.total }} processed
            </span>
            <span class="text-slate-500">
              Uploaded {{ p.uploaded }} · Failed {{ p.failed }} · {{ p.percentage }}%
            </span>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full bg-indigo-600 transition-all" [style.width.%]="p.percentage"></div>
          </div>
          @if (p.errors.length) {
            <div class="mt-3 space-y-1 text-sm text-red-600">
              @for (error of p.errors; track error) {
                <p>{{ error }}</p>
              }
            </div>
          }
        </div>
      }
    </section>

    <section class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex flex-wrap gap-2">
        @for (option of filters; track option.value) {
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            [class.border-indigo-600]="activeFilter() === option.value"
            [class.bg-indigo-50]="activeFilter() === option.value"
            [class.text-indigo-700]="activeFilter() === option.value"
            [class.border-slate-200]="activeFilter() !== option.value"
            [class.text-slate-600]="activeFilter() !== option.value"
            (click)="setFilter(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          (click)="export('csv')"
        >
          Export CSV
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          (click)="export('xlsx')"
        >
          Export XLSX
        </button>
      </div>
    </section>

    <section class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium uppercase text-slate-500">All media</p>
        <p class="mt-2 text-2xl font-semibold text-slate-800">{{ media().length }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium uppercase text-slate-500">Images</p>
        <p class="mt-2 text-2xl font-semibold text-slate-800">{{ imageCount() }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium uppercase text-slate-500">Videos</p>
        <p class="mt-2 text-2xl font-semibold text-slate-800">{{ videoCount() }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-xs font-medium uppercase text-slate-500">Failed</p>
        <p class="mt-2 text-2xl font-semibold text-slate-800">{{ failedCount() }}</p>
      </div>
    </section>

    <section class="mt-6">
      @if (loading()) {
        <div class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading media…
        </div>
      } @else {
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          @for (item of media(); track item.mediaId) {
            <article class="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div class="aspect-video bg-slate-100">
                @if (item.mediaType === 'IMAGE' && item.thumbnailUrl) {
                  <img
                    [src]="item.thumbnailUrl"
                    [alt]="item.fileName"
                    class="h-full w-full object-cover"
                  />
                } @else if (item.mediaType === 'VIDEO' && (item.directDownloadUrl || item.googleDriveUrl)) {
                  <video
                    class="h-full w-full bg-black object-contain"
                    [src]="item.directDownloadUrl || item.googleDriveUrl || ''"
                    controls
                    preload="metadata"
                  ></video>
                } @else {
                  <div class="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                    {{ item.mediaType }}
                  </div>
                }
              </div>

              <div class="space-y-4 p-4">
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <h3 class="min-w-0 truncate text-sm font-semibold text-slate-800">
                      {{ item.fileName }}
                    </h3>
                    <span
                      class="shrink-0 rounded-full px-2 py-1 text-xs font-medium"
                      [class.bg-emerald-50]="item.uploadStatus === 'UPLOADED'"
                      [class.text-emerald-700]="item.uploadStatus === 'UPLOADED'"
                      [class.bg-amber-50]="item.uploadStatus === 'UPLOADING'"
                      [class.text-amber-700]="item.uploadStatus === 'UPLOADING'"
                      [class.bg-red-50]="item.uploadStatus === 'FAILED'"
                      [class.text-red-700]="item.uploadStatus === 'FAILED'"
                    >
                      {{ item.uploadStatus }}
                    </span>
                  </div>
                  <dl class="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div>
                      <dt class="font-medium text-slate-400">Type</dt>
                      <dd class="mt-1 text-slate-700">{{ item.contentType }}</dd>
                    </div>
                    <div>
                      <dt class="font-medium text-slate-400">Size</dt>
                      <dd class="mt-1 text-slate-700">{{ formatBytes(item.fileSize) }}</dd>
                    </div>
                    <div>
                      <dt class="font-medium text-slate-400">Uploaded</dt>
                      <dd class="mt-1 text-slate-700">{{ item.createdAt | date: 'mediumDate' }}</dd>
                    </div>
                    <div>
                      <dt class="font-medium text-slate-400">Posts</dt>
                      <dd class="mt-1 text-slate-700">{{ item.relatedPostCount }}</dd>
                    </div>
                  </dl>
                </div>

                <div class="rounded-lg bg-slate-50 p-3 text-xs">
                  <p class="font-medium text-slate-500">Google Drive</p>
                  <p class="mt-1 truncate text-slate-700">{{ item.googleDriveFileId || 'No file id' }}</p>
                  @if (item.googleDriveUrl) {
                    <a
                      [href]="item.googleDriveUrl"
                      target="_blank"
                      rel="noreferrer"
                      class="mt-1 block truncate text-indigo-600 hover:underline"
                    >
                      {{ item.googleDriveUrl }}
                    </a>
                  }
                  @if (item.errorMessage) {
                    <p class="mt-2 text-red-600">{{ item.errorMessage }}</p>
                  }
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    [disabled]="!fileUrl(item)"
                    (click)="copyUrl(item)"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    [disabled]="!item.googleDriveUrl"
                    (click)="openDrive(item)"
                  >
                    Open Drive
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    [disabled]="!item.googleDriveFileId"
                    (click)="download(item)"
                  >
                    Download
                  </button>
                  @if (item.uploadStatus === 'FAILED') {
                    <button
                      type="button"
                      class="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      (click)="chooseRetry(item.mediaId, retryInput)"
                    >
                      Retry
                    </button>
                  }
                  <button
                    type="button"
                    class="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                    (click)="remove(item)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No media found.
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class MediaLibrary implements OnInit {
  private readonly service = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly media = signal<MediaItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly activeFilter = signal<MediaFilter>('ALL');
  protected readonly progress = signal<UploadProgress | null>(null);
  private readonly retryMediaId = signal<number | null>(null);

  protected readonly filters: { value: MediaFilter; label: string }[] = [
    { value: 'ALL', label: 'All media' },
    { value: 'IMAGES', label: 'Images' },
    { value: 'VIDEOS', label: 'Videos' },
    { value: 'UPLOADED', label: 'Uploaded' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'RECENT', label: 'Recently uploaded' },
  ];

  protected readonly imageCount = computed(
    () => this.media().filter((item) => item.mediaType === 'IMAGE').length,
  );
  protected readonly videoCount = computed(
    () => this.media().filter((item) => item.mediaType === 'VIDEO').length,
  );
  protected readonly failedCount = computed(
    () => this.media().filter((item) => item.uploadStatus === 'FAILED').length,
  );

  ngOnInit(): void {
    this.load();
  }

  protected setFilter(filter: MediaFilter): void {
    this.activeFilter.set(filter);
    this.load();
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      void this.uploadFiles(Array.from(files));
    }
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      void this.uploadFiles(Array.from(input.files));
    }
    input.value = '';
  }

  protected chooseRetry(mediaId: number, input: HTMLInputElement): void {
    this.retryMediaId.set(mediaId);
    input.click();
  }

  protected onRetryInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const mediaId = this.retryMediaId();
    input.value = '';
    this.retryMediaId.set(null);
    if (!file || mediaId == null) {
      return;
    }
    this.service.retry(mediaId, file).subscribe({
      next: () => {
        this.notify.success('Media upload retried.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not retry upload.'),
    });
  }

  protected async uploadFiles(files: File[]): Promise<void> {
    const valid = files.filter((file) => this.isSupported(file));
    const invalidCount = files.length - valid.length;
    if (invalidCount) {
      this.notify.error(`${invalidCount} unsupported file(s) skipped.`);
    }
    if (!valid.length) {
      return;
    }

    this.uploading.set(true);
    this.progress.set({ total: valid.length, uploaded: 0, failed: 0, percentage: 0, errors: [] });
    for (const file of valid) {
      try {
        const result = await lastValueFrom(this.service.upload([file]));
        const item = result.items[0];
        this.updateProgress(item?.uploaded === true, item?.errorMessage ? `${file.name}: ${item.errorMessage}` : null);
      } catch (err: any) {
        this.updateProgress(false, `${file.name}: ${err?.error?.message ?? 'Upload failed.'}`);
      }
    }
    this.uploading.set(false);
    this.load();
  }

  private updateProgress(uploaded: boolean, error: string | null): void {
    const current = this.progress();
    if (!current) {
      return;
    }
    const next = {
      ...current,
      uploaded: current.uploaded + (uploaded ? 1 : 0),
      failed: current.failed + (uploaded ? 0 : 1),
      errors: error ? [...current.errors, error] : current.errors,
    };
    next.percentage = Math.round(((next.uploaded + next.failed) / next.total) * 100);
    this.progress.set(next);
  }

  protected copyUrl(item: MediaItem): void {
    const url = this.fileUrl(item);
    if (!url) {
      return;
    }
    navigator.clipboard
      ?.writeText(url)
      .then(() => this.notify.success('Media URL copied.'))
      .catch(() => this.notify.error('Could not copy URL.'));
  }

  protected openDrive(item: MediaItem): void {
    if (item.googleDriveUrl) {
      window.open(item.googleDriveUrl, '_blank', 'noreferrer');
    }
  }

  protected download(item: MediaItem): void {
    this.service.download(item.mediaId).subscribe({
      next: (blob) => this.saveBlob(blob, item.fileName),
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not download media.'),
    });
  }

  protected export(format: 'csv' | 'xlsx'): void {
    this.service.export(format).subscribe({
      next: (blob) => this.saveBlob(blob, `media-library.${format}`),
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not export media.'),
    });
  }

  protected async remove(item: MediaItem): Promise<void> {
    const ok = await this.confirm.ask(`Delete "${item.fileName}" from the media library?`, 'Delete media', 'Delete');
    if (!ok) {
      return;
    }
    this.service.delete(item.mediaId).subscribe({
      next: () => {
        this.notify.success('Media deleted.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not delete media.'),
    });
  }

  protected fileUrl(item: MediaItem): string | null {
    return item.googleDriveUrl || item.directDownloadUrl || null;
  }

  protected formatBytes(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit++;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  private load(): void {
    this.loading.set(true);
    this.service.list(this.activeFilter()).subscribe({
      next: (items) => {
        this.media.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Could not load media.');
        this.loading.set(false);
      },
    });
  }

  private isSupported(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'avi', 'webm'].includes(ext);
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
