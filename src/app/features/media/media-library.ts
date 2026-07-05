import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MediaFilter, MediaFolder, MediaItem } from '../../shared/models/media.model';
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
  imports: [DatePipe, FormsModule, NgClass, PageHeader],
  template: `
    <app-page-header title="Media" subtitle="Compact Google Drive-backed media library" />

    <section class="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-900">Folders</h3>
          <p class="mt-1 text-sm text-slate-500">
            Create Drive-backed folders and keep uploads organized.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            (click)="showFolderForm.update((value) => !value)"
          >
            {{ showFolderForm() ? 'Cancel' : 'New folder' }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            [disabled]="uploading()"
            (click)="fileInput.click()"
          >
            Upload to {{ uploadTargetLabel() }}
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

      @if (showFolderForm()) {
        <div class="mt-4 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row">
          <input
            [(ngModel)]="newFolderName"
            placeholder="Folder name"
            class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            (keydown.enter)="createFolder()"
          />
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            [disabled]="creatingFolder() || !newFolderName.trim()"
            (click)="createFolder()"
          >
            {{ creatingFolder() ? 'Creating...' : 'Create folder' }}
          </button>
        </div>
      }

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          [ngClass]="folderChipClass(null)"
          (click)="selectFolder(null)"
        >
          All files
        </button>
        <button
          type="button"
          class="rounded-lg border px-3 py-2 text-sm font-medium transition"
          [ngClass]="folderChipClass(0)"
          (click)="selectFolder(0)"
        >
          Unfiled
        </button>
        @for (folder of folders(); track folder.folderId) {
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-sm font-medium transition"
            [ngClass]="folderChipClass(folder.folderId)"
            (click)="selectFolder(folder.folderId)"
          >
            {{ folder.name }}
            <span class="ml-1 text-xs text-slate-400">{{ folder.mediaCount }}</span>
          </button>
        }
      </div>
    </section>

    <section
      class="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-5"
      [class.border-indigo-400]="dragging()"
      [class.bg-indigo-50]="dragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-base font-semibold text-slate-800">Upload media files</h3>
          <p class="mt-1 text-sm text-slate-500">
            Images: jpg, jpeg, png, webp, gif. Videos: mp4, mov, avi, webm.
          </p>
          <p class="mt-1 text-xs text-slate-400">Current upload target: {{ uploadTargetLabel() }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            (click)="export('csv')"
          >
            Export CSV
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            (click)="export('xlsx')"
          >
            Export XLSX
          </button>
        </div>
      </div>

      @if (progress(); as p) {
        <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
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

    <section class="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
      <p class="text-sm text-slate-500">{{ media().length }} visible item(s)</p>
    </section>

    <section class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
      <div class="rounded-lg border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-medium uppercase text-slate-500">Visible</p>
        <p class="mt-1 text-xl font-semibold text-slate-800">{{ media().length }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-medium uppercase text-slate-500">Images</p>
        <p class="mt-1 text-xl font-semibold text-slate-800">{{ imageCount() }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-medium uppercase text-slate-500">Videos</p>
        <p class="mt-1 text-xl font-semibold text-slate-800">{{ videoCount() }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-medium uppercase text-slate-500">Failed</p>
        <p class="mt-1 text-xl font-semibold text-slate-800">{{ failedCount() }}</p>
      </div>
    </section>

    <section class="mt-6">
      @if (loading()) {
        <div class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading media…
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          @for (item of media(); track item.mediaId) {
            <article class="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                class="relative block aspect-square w-full overflow-hidden bg-slate-100"
                (click)="openPreview(item)"
              >
                @if (item.mediaType === 'IMAGE') {
                  <img
                    [src]="previewUrl(item)"
                    [alt]="item.fileName"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  />
                } @else {
                  <video
                    class="h-full w-full bg-black object-cover"
                    [src]="previewUrl(item)"
                    muted
                    playsinline
                    preload="metadata"
                  ></video>
                  <span
                    class="absolute bottom-2 right-2 rounded bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-white"
                  >
                    Video
                  </span>
                }
              </button>

              <div class="space-y-2 p-3">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-slate-900">{{ item.fileName }}</p>
                    <p class="truncate text-[11px] text-slate-500">
                      {{ item.folderName || 'Unfiled' }}
                    </p>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium"
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

                <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <p>{{ formatBytes(item.fileSize) }}</p>
                  <p class="text-right">{{ item.createdAt | date: 'MMM d' }}</p>
                  <p class="truncate">{{ item.contentType }}</p>
                  <p class="text-right">{{ item.relatedPostCount }} post(s)</p>
                </div>

                @if (item.errorMessage) {
                  <p class="line-clamp-2 text-[11px] text-red-600">{{ item.errorMessage }}</p>
                }

                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    (click)="copyUrl(item)"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    [disabled]="!item.googleDriveUrl"
                    (click)="openDrive(item)"
                  >
                    Drive
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    (click)="download(item)"
                  >
                    Download
                  </button>
                  @if (item.uploadStatus === 'FAILED') {
                    <button
                      type="button"
                      class="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50"
                      (click)="chooseRetry(item.mediaId, retryInput)"
                    >
                      Retry
                    </button>
                  }
                  <button
                    type="button"
                    class="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50"
                    (click)="remove(item)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          } @empty {
            <div class="col-span-full rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No media found for this folder/filter.
            </div>
          }
        </div>
      }
    </section>

    @if (previewing(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" (click)="closePreview()">
        <div
          class="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-slate-900">{{ item.fileName }}</p>
              <p class="text-xs text-slate-500">{{ item.folderName || 'Unfiled' }}</p>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              (click)="closePreview()"
            >
              Close
            </button>
          </div>
          <div class="bg-slate-100 p-4">
            @if (item.mediaType === 'IMAGE') {
              <img [src]="previewUrl(item)" [alt]="item.fileName" class="max-h-[75vh] w-full object-contain" />
            } @else {
              <video
                [src]="previewUrl(item)"
                class="max-h-[75vh] w-full bg-black object-contain"
                controls
                preload="metadata"
              ></video>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MediaLibrary implements OnInit {
  private readonly service = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);
  private readonly apiOrigin = environment.apiBaseUrl.replace(/\/api\/v1$/, '');

  protected readonly media = signal<MediaItem[]>([]);
  protected readonly folders = signal<MediaFolder[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly activeFilter = signal<MediaFilter>('ALL');
  protected readonly selectedFolderId = signal<number | null>(null);
  protected readonly progress = signal<UploadProgress | null>(null);
  protected readonly showFolderForm = signal(false);
  protected readonly creatingFolder = signal(false);
  protected readonly previewing = signal<MediaItem | null>(null);
  private readonly retryMediaId = signal<number | null>(null);

  protected newFolderName = '';

  protected readonly filters: { value: MediaFilter; label: string }[] = [
    { value: 'ALL', label: 'All media' },
    { value: 'IMAGES', label: 'Images' },
    { value: 'VIDEOS', label: 'Videos' },
    { value: 'UPLOADED', label: 'Uploaded' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'RECENT', label: 'Recent' },
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
    this.reload();
  }

  protected setFilter(filter: MediaFilter): void {
    this.activeFilter.set(filter);
    this.loadMedia();
  }

  protected selectFolder(folderId: number | null): void {
    this.selectedFolderId.set(folderId);
    this.loadMedia();
  }

  protected folderChipClass(folderId: number | null): string {
    return this.selectedFolderId() === folderId
      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
      : 'border-slate-200 text-slate-600';
  }

  protected uploadTargetLabel(): string {
    const folderId = this.selectedFolderId();
    if (folderId === null) {
      return 'All files';
    }
    if (folderId === 0) {
      return 'Unfiled';
    }
    return this.folders().find((folder) => folder.folderId === folderId)?.name ?? 'Selected folder';
  }

  protected async createFolder(): Promise<void> {
    const name = this.newFolderName.trim();
    if (!name) {
      return;
    }
    this.creatingFolder.set(true);
    this.service.createFolder({ name }).subscribe({
      next: (folder) => {
        this.notify.success('Folder created.');
        this.newFolderName = '';
        this.showFolderForm.set(false);
        this.folders.update((items) => [...items, folder].sort((a, b) => a.name.localeCompare(b.name)));
        this.selectedFolderId.set(folder.folderId);
        this.loadMedia();
        this.creatingFolder.set(false);
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not create folder.');
        this.creatingFolder.set(false);
      },
    });
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
        this.reload();
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
        const result = await lastValueFrom(this.service.upload([file], this.uploadFolderParam()));
        const item = result.items[0];
        this.updateProgress(
          item?.uploaded === true,
          item?.errorMessage ? `${file.name}: ${item.errorMessage}` : null,
        );
      } catch (err: any) {
        this.updateProgress(false, `${file.name}: ${err?.error?.message ?? 'Upload failed.'}`);
      }
    }
    this.uploading.set(false);
    this.reload();
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
    const url = item.googleDriveUrl || item.directDownloadUrl;
    if (!url) {
      this.notify.error('No media URL is available yet.');
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
    this.service.export(format, this.exportFolderParam()).subscribe({
      next: (blob) => this.saveBlob(blob, `media-library.${format}`),
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not export media.'),
    });
  }

  protected async remove(item: MediaItem): Promise<void> {
    const ok = await this.confirm.ask(
      `Delete "${item.fileName}" from the media library?`,
      'Delete media',
      'Delete',
    );
    if (!ok) {
      return;
    }
    this.service.delete(item.mediaId).subscribe({
      next: () => {
        this.notify.success('Media deleted.');
        this.reload();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not delete media.'),
    });
  }

  protected openPreview(item: MediaItem): void {
    this.previewing.set(item);
  }

  protected closePreview(): void {
    this.previewing.set(null);
  }

  protected previewUrl(item: MediaItem): string {
    return `${this.apiOrigin}/api/v1/media/${item.mediaId}/download`;
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

  private reload(): void {
    this.loadFolders();
    this.loadMedia();
  }

  private loadFolders(): void {
    this.service.folders().subscribe({
      next: (items) => this.folders.set(items),
      error: () => this.notify.error('Could not load media folders.'),
    });
  }

  private loadMedia(): void {
    this.loading.set(true);
    this.service.list(this.activeFilter(), this.listFolderParam()).subscribe({
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

  private listFolderParam(): number | null | undefined {
    const folderId = this.selectedFolderId();
    return folderId === null ? undefined : folderId;
  }

  private uploadFolderParam(): number | null | undefined {
    const folderId = this.selectedFolderId();
    if (folderId === null || folderId === 0) {
      return undefined;
    }
    return folderId;
  }

  private exportFolderParam(): number | null | undefined {
    const folderId = this.selectedFolderId();
    return folderId === null ? undefined : folderId;
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
