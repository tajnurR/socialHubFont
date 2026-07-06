import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MediaFilter, MediaFolder, MediaItem, MediaSortOrder } from '../../shared/models/media.model';
import { MediaService } from './media.service';

type ViewMode = 'grid' | 'list';

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  percentage: number;
  errors: string[];
}

@Component({
  selector: 'app-media-library',
  imports: [DatePipe, FormsModule, PageHeader],
  template: `
    <app-page-header title="Media" subtitle="Organize, upload, select, and export media files" />

    <section class="grid gap-4 xl:grid-cols-[360px_1fr]">
      <aside class="space-y-4">
        <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-slate-900">Upload folder</h3>
              <p class="mt-1 text-xs leading-5 text-slate-500">Choose or create a folder before adding files.</p>
            </div>
            <button
              type="button"
              class="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              (click)="showFolderForm.update((value) => !value)"
            >
              {{ showFolderForm() ? 'Cancel' : 'New' }}
            </button>
          </div>

          @if (showFolderForm()) {
            <div class="mt-4 space-y-2">
              <input
                [(ngModel)]="newFolderName"
                placeholder="Folder name"
                class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
                (keydown.enter)="createFolder()"
              />
              <button
                type="button"
                class="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                [disabled]="creatingFolder() || !newFolderName.trim()"
                (click)="createFolder()"
              >
                {{ creatingFolder() ? 'Creating...' : 'Create folder' }}
              </button>
            </div>
          }

          <select
            class="mt-4 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-600"
            [(ngModel)]="uploadFolderId"
          >
            <option [ngValue]="null">Select upload folder</option>
            @for (folder of folders(); track folder.folderId) {
              <option [ngValue]="folder.folderId">{{ folder.name }}</option>
            }
          </select>

          <div
            class="mt-4 rounded-lg border border-dashed p-4 transition"
            [class.border-teal-500]="dragging()"
            [class.bg-teal-50]="dragging()"
            [class.border-slate-300]="!dragging()"
            [class.bg-slate-50]="!dragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <p class="text-sm font-semibold text-slate-800">{{ uploadFolderLabel() }}</p>
            <p class="mt-1 text-xs leading-5 text-slate-500">
              jpg, png, webp, gif, mp4, mov, avi, and webm files are supported.
            </p>
            <button
              type="button"
              class="mt-3 w-full rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              [disabled]="uploading() || !uploadFolderId"
              (click)="fileInput.click()"
            >
              {{ uploading() ? 'Uploading...' : 'Choose files' }}
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

          @if (progress(); as p) {
            <div class="mt-4 rounded-lg border border-slate-200 bg-white p-3">
              <div class="flex items-center justify-between text-xs text-slate-600">
                <span>{{ p.uploaded + p.failed }} / {{ p.total }} processed</span>
                <span>{{ p.percentage }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div class="h-full bg-teal-700 transition-all" [style.width.%]="p.percentage"></div>
              </div>
              @if (p.errors.length) {
                <div class="mt-2 space-y-1 text-xs text-red-600">
                  @for (error of p.errors; track error) {
                    <p>{{ error }}</p>
                  }
                </div>
              }
            </div>
          }
        </div>

        <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900">Folders</h3>
          <div class="mt-3 space-y-1">
            <button type="button" class="w-full rounded-md px-3 py-2 text-left text-sm" [class.bg-slate-900]="selectedFolderId() === null" [class.text-white]="selectedFolderId() === null" [class.text-slate-700]="selectedFolderId() !== null" (click)="selectFolder(null)">
              All folders
            </button>
            <button type="button" class="w-full rounded-md px-3 py-2 text-left text-sm" [class.bg-slate-900]="selectedFolderId() === 0" [class.text-white]="selectedFolderId() === 0" [class.text-slate-700]="selectedFolderId() !== 0" (click)="selectFolder(0)">
              Unfiled
            </button>
            @for (folder of folders(); track folder.folderId) {
              <button type="button" class="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm" [class.bg-slate-900]="selectedFolderId() === folder.folderId" [class.text-white]="selectedFolderId() === folder.folderId" [class.text-slate-700]="selectedFolderId() !== folder.folderId" (click)="selectFolder(folder.folderId)">
                <span class="truncate">{{ folder.name }}</span>
                <span class="text-xs opacity-70">{{ folder.mediaCount }}</span>
              </button>
            }
          </div>
        </div>
      </aside>

      <main class="space-y-4">
        <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div class="grid gap-3 lg:grid-cols-[1fr_180px_180px_160px]">
            <input
              [ngModel]="searchTerm()"
              (ngModelChange)="setSearch($event)"
              placeholder="Search file or folder"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600"
            />
            <select
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              [(ngModel)]="activeFilterValue"
              (ngModelChange)="setFilter($event)"
            >
              @for (option of filters; track option.value) {
                <option [ngValue]="option.value">{{ option.label }}</option>
              }
            </select>
            <select
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              [ngModel]="sortOrder()"
              (ngModelChange)="setSortOrder($event)"
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NAME_ASC">Name A-Z</option>
              <option value="NAME_DESC">Name Z-A</option>
              <option value="SIZE_DESC">Largest first</option>
            </select>
            <select
              class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
              [ngModel]="pageSize()"
              (ngModelChange)="setPageSize($event)"
            >
              @for (size of pageSizeOptions; track size) {
                <option [ngValue]="size">{{ size }} per page</option>
              }
            </select>
          </div>

          <div class="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 md:flex-row md:items-center md:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" (click)="toggleVisibleSelection()">
                {{ allVisibleSelected() ? 'Clear visible' : 'Select visible' }}
              </button>
              <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="selectedCount() === 0" (click)="clearSelection()">
                Clear
              </button>
              <span class="text-sm text-slate-500">{{ selectedCount() }} selected</span>
              <span class="text-sm text-slate-500">{{ pageSummary() }}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="selectedCount() === 0" (click)="exportSelected('csv')">
                Export CSV
              </button>
              <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="selectedCount() === 0" (click)="exportSelected('xlsx')">
                Export XLSX
              </button>
              <div class="flex overflow-hidden rounded-md border border-slate-200">
                <button type="button" class="px-3 py-2 text-xs font-semibold" [class.bg-slate-900]="viewMode() === 'grid'" [class.text-white]="viewMode() === 'grid'" [class.text-slate-600]="viewMode() !== 'grid'" (click)="viewMode.set('grid')">Grid</button>
                <button type="button" class="border-l border-slate-200 px-3 py-2 text-xs font-semibold" [class.bg-slate-900]="viewMode() === 'list'" [class.text-white]="viewMode() === 'list'" [class.text-slate-600]="viewMode() !== 'list'" (click)="viewMode.set('list')">List</button>
              </div>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p class="text-xs font-medium text-slate-500">Total files</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">{{ totalCount() }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p class="text-xs font-medium text-slate-500">Images</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">{{ imageCount() }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p class="text-xs font-medium text-slate-500">Videos</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">{{ videoCount() }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p class="text-xs font-medium text-slate-500">Failed</p>
            <p class="mt-1 text-2xl font-semibold text-slate-900">{{ failedCount() }}</p>
          </div>
        </section>

        @if (loading()) {
          <div class="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Loading media...
          </div>
        } @else if (viewMode() === 'grid') {
          <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            @for (item of visibleMedia(); track item.mediaId) {
              <article class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div class="relative aspect-video bg-slate-100">
                  <input
                    type="checkbox"
                    class="absolute left-3 top-3 z-10 h-4 w-4 rounded border-slate-300"
                    [checked]="isSelected(item.mediaId)"
                    (change)="toggleSelection(item.mediaId)"
                  />
                  <button type="button" class="h-full w-full overflow-hidden" (click)="openPreview(item)">
                    @if (item.mediaType === 'IMAGE' && previewUrl(item); as src) {
                      <img [src]="src" [alt]="item.fileName" class="h-full w-full object-cover" loading="lazy" />
                    } @else if (item.thumbnailUrl) {
                      <img [src]="item.thumbnailUrl" [alt]="item.fileName" class="h-full w-full object-cover" loading="lazy" />
                    } @else {
                      <div class="flex h-full w-full items-center justify-center bg-slate-900 text-sm font-semibold text-white">
                        {{ item.mediaType }}
                      </div>
                    }
                  </button>
                  <span class="absolute bottom-3 right-3 rounded bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">{{ item.mediaType }}</span>
                </div>
                <div class="space-y-3 p-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-900">{{ item.fileName }}</p>
                    <p class="mt-1 truncate text-xs text-slate-500">{{ item.folderName || 'Unfiled' }}</p>
                  </div>
                  <div class="flex items-center justify-between text-xs text-slate-500">
                    <span>{{ formatBytes(item.fileSize) }}</span>
                    <span>{{ item.createdAt | date: 'MMM d, y' }}</span>
                  </div>
                  @if (item.errorMessage) {
                    <p class="line-clamp-2 text-xs text-red-600">{{ item.errorMessage }}</p>
                  }
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" (click)="copyUrl(item)">Copy</button>
                    <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="!item.googleDriveUrl" (click)="openDrive(item)">Drive</button>
                    <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" (click)="download(item)">Download</button>
                    @if (item.uploadStatus === 'FAILED') {
                      <button type="button" class="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50" (click)="chooseRetry(item.mediaId, retryInput)">Retry</button>
                    }
                    <button type="button" class="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" (click)="remove(item)">Delete</button>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="col-span-full rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                No media matches the current filters.
              </div>
            }
          </section>
        } @else {
          <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div class="hidden grid-cols-[44px_1fr_130px_120px_130px_220px] gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-500 lg:grid">
              <span></span>
              <span>File</span>
              <span>Folder</span>
              <span>Type</span>
              <span>Uploaded</span>
              <span>Actions</span>
            </div>
            @for (item of visibleMedia(); track item.mediaId) {
              <article class="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 lg:grid-cols-[44px_1fr_130px_120px_130px_220px] lg:items-center">
                <input type="checkbox" class="h-4 w-4 rounded border-slate-300" [checked]="isSelected(item.mediaId)" (change)="toggleSelection(item.mediaId)" />
                <div class="flex min-w-0 items-center gap-3">
                  <button type="button" class="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100" (click)="openPreview(item)">
                    @if (item.mediaType === 'IMAGE' && previewUrl(item); as src) {
                      <img [src]="src" [alt]="item.fileName" class="h-full w-full object-cover" loading="lazy" />
                    } @else if (item.thumbnailUrl) {
                      <img [src]="item.thumbnailUrl" [alt]="item.fileName" class="h-full w-full object-cover" loading="lazy" />
                    } @else {
                      <div class="flex h-full w-full items-center justify-center bg-slate-900 text-xs font-semibold text-white">
                        {{ item.mediaType }}
                      </div>
                    }
                  </button>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-900">{{ item.fileName }}</p>
                    <p class="text-xs text-slate-500">{{ formatBytes(item.fileSize) }} · {{ item.uploadStatus }}</p>
                  </div>
                </div>
                <p class="truncate text-sm text-slate-600">{{ item.folderName || 'Unfiled' }}</p>
                <p class="text-sm text-slate-600">{{ item.mediaType }}</p>
                <p class="text-sm text-slate-600">{{ item.createdAt | date: 'MMM d, y' }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" (click)="copyUrl(item)">Copy</button>
                  <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50" (click)="download(item)">Download</button>
                  @if (item.uploadStatus === 'FAILED') {
                    <button type="button" class="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50" (click)="chooseRetry(item.mediaId, retryInput)">Retry</button>
                  }
                  <button type="button" class="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50" (click)="remove(item)">Delete</button>
                </div>
              </article>
            } @empty {
              <div class="p-8 text-center text-sm text-slate-500">No media matches the current filters.</div>
            }
          </section>
        }

        <section class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <p class="text-sm text-slate-500">{{ pageSummary() }}</p>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="pageIndex() === 0" (click)="goToPage(0)">
              First
            </button>
            <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="pageIndex() === 0" (click)="goToPage(pageIndex() - 1)">
              Previous
            </button>
            <span class="rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              Page {{ currentPageLabel() }} / {{ totalPagesLabel() }}
            </span>
            <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="pageIndex() >= totalPages() - 1" (click)="goToPage(pageIndex() + 1)">
              Next
            </button>
            <button type="button" class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40" [disabled]="pageIndex() >= totalPages() - 1" (click)="goToPage(totalPages() - 1)">
              Last
            </button>
          </div>
        </section>
      </main>
    </section>

    @if (previewing(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" (click)="closePreview()">
        <div class="w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ item.fileName }}</p>
              <p class="text-xs text-slate-500">{{ item.folderName || 'Unfiled' }}</p>
            </div>
            <button type="button" class="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" (click)="closePreview()">Close</button>
          </div>
          <div class="bg-slate-100 p-4">
            @if (item.mediaType === 'IMAGE' && previewUrl(item); as src) {
              <img [src]="src" [alt]="item.fileName" class="max-h-[75vh] w-full object-contain" />
            } @else if (item.mediaType === 'VIDEO' && previewUrl(item); as src) {
              <video [src]="src" class="max-h-[75vh] w-full bg-black object-contain" controls preload="metadata"></video>
            } @else {
              <div class="flex min-h-80 items-center justify-center text-sm font-medium text-slate-500">
                Loading preview...
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MediaLibrary implements OnInit, OnDestroy {
  private readonly service = inject(MediaService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly media = signal<MediaItem[]>([]);
  protected readonly folders = signal<MediaFolder[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly selectedFolderId = signal<number | null>(null);
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly progress = signal<UploadProgress | null>(null);
  protected readonly showFolderForm = signal(false);
  protected readonly creatingFolder = signal(false);
  protected readonly previewing = signal<MediaItem | null>(null);
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly previewUrls = signal<Map<number, string>>(new Map());
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);
  protected readonly totalCount = signal(0);
  protected readonly totalPages = signal(0);
  private readonly activeFilter = signal<MediaFilter>('ALL');
  private readonly retryMediaId = signal<number | null>(null);
  private readonly objectUrls = new Map<number, string>();

  protected newFolderName = '';
  protected uploadFolderId: number | null = null;
  protected activeFilterValue: MediaFilter = 'ALL';
  protected readonly searchTerm = signal('');
  protected readonly sortOrder = signal<MediaSortOrder>('NEWEST');
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  protected readonly filters: { value: MediaFilter; label: string }[] = [
    { value: 'ALL', label: 'All types' },
    { value: 'IMAGES', label: 'Images' },
    { value: 'VIDEOS', label: 'Videos' },
    { value: 'UPLOADED', label: 'Uploaded' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'RECENT', label: 'Recent' },
  ];

  protected readonly visibleMedia = computed(() => this.media());

  protected readonly imageCount = computed(
    () => this.visibleMedia().filter((item) => item.mediaType === 'IMAGE').length,
  );
  protected readonly videoCount = computed(
    () => this.visibleMedia().filter((item) => item.mediaType === 'VIDEO').length,
  );
  protected readonly failedCount = computed(
    () => this.visibleMedia().filter((item) => item.uploadStatus === 'FAILED').length,
  );
  protected readonly selectedCount = computed(() => this.selectedIds().size);
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.visibleMedia();
    const selected = this.selectedIds();
    return visible.length > 0 && visible.every((item) => selected.has(item.mediaId));
  });
  protected readonly currentPageLabel = computed(() => (this.totalCount() ? this.pageIndex() + 1 : 0));
  protected readonly totalPagesLabel = computed(() => Math.max(this.totalPages(), 1));
  protected readonly pageSummary = computed(() => {
    const total = this.totalCount();
    if (!total) {
      return '0 files';
    }
    const start = this.pageIndex() * this.pageSize() + 1;
    const end = Math.min(start + this.visibleMedia().length - 1, total);
    return `${start}-${end} of ${total} files`;
  });

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
  }

  protected setFilter(filter: MediaFilter): void {
    this.activeFilter.set(filter);
    this.activeFilterValue = filter;
    this.pageIndex.set(0);
    this.clearSelection();
    this.loadMedia();
  }

  protected selectFolder(folderId: number | null): void {
    this.selectedFolderId.set(folderId);
    this.pageIndex.set(0);
    this.clearSelection();
    this.loadMedia();
  }

  protected setSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.clearSelection();
    this.loadMedia();
  }

  protected setSortOrder(value: MediaSortOrder): void {
    this.sortOrder.set(value);
    this.pageIndex.set(0);
    this.clearSelection();
    this.loadMedia();
  }

  protected setPageSize(value: number): void {
    this.pageSize.set(Number(value));
    this.pageIndex.set(0);
    this.clearSelection();
    this.loadMedia();
  }

  protected goToPage(page: number): void {
    const maxPage = Math.max(this.totalPages() - 1, 0);
    this.pageIndex.set(Math.max(0, Math.min(page, maxPage)));
    this.loadMedia();
  }

  protected uploadFolderLabel(): string {
    if (!this.uploadFolderId) {
      return 'Select a folder to unlock upload';
    }
    return `Upload to ${this.folders().find((folder) => folder.folderId === this.uploadFolderId)?.name ?? 'folder'}`;
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
        this.uploadFolderId = folder.folderId;
        this.selectedFolderId.set(folder.folderId);
        this.clearSelection();
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
    if (!this.uploadFolderId) {
      this.notify.error('Select or create a folder before uploading.');
      return;
    }
    const files = event.dataTransfer?.files;
    if (files?.length) {
      void this.uploadFiles(Array.from(files));
    }
  }

  protected onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.uploadFolderId) {
      this.notify.error('Select or create a folder before uploading.');
      input.value = '';
      return;
    }
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
    if (!this.uploadFolderId) {
      this.notify.error('Select or create a folder before uploading.');
      return;
    }
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
        const result = await lastValueFrom(this.service.upload([file], this.uploadFolderId));
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

  protected isSelected(mediaId: number): boolean {
    return this.selectedIds().has(mediaId);
  }

  protected toggleSelection(mediaId: number): void {
    this.selectedIds.update((selected) => {
      const next = new Set(selected);
      if (next.has(mediaId)) {
        next.delete(mediaId);
      } else {
        next.add(mediaId);
      }
      return next;
    });
  }

  protected toggleVisibleSelection(): void {
    if (this.allVisibleSelected()) {
      this.clearSelection();
      return;
    }
    this.selectedIds.set(new Set(this.visibleMedia().map((item) => item.mediaId)));
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
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

  protected exportSelected(format: 'csv' | 'xlsx'): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) {
      return;
    }
    this.service.export(format, null, ids).subscribe({
      next: (blob) => this.saveBlob(blob, `media-selected.${format}`),
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not export selected media.'),
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
        this.selectedIds.update((selected) => {
          const next = new Set(selected);
          next.delete(item.mediaId);
          return next;
        });
        this.reload();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not delete media.'),
    });
  }

  protected openPreview(item: MediaItem): void {
    this.previewing.set(item);
    this.loadPreview(item, true);
  }

  protected closePreview(): void {
    this.previewing.set(null);
  }

  protected previewUrl(item: MediaItem): string | null {
    return item.thumbnailUrl || this.previewUrls().get(item.mediaId) || null;
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
    this.service.page({
      filter: this.activeFilter(),
      folderId: this.listFolderParam(),
      search: this.searchTerm(),
      sortOrder: this.sortOrder(),
      page: this.pageIndex(),
      size: this.pageSize(),
    }).subscribe({
      next: (page) => {
        this.media.set(page.items);
        this.totalCount.set(page.totalCount);
        this.totalPages.set(page.totalPages);
        this.pageIndex.set(page.page);
        this.pageSize.set(page.pageSize);
        this.syncPreviewUrls(page.items);
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

  private syncPreviewUrls(items: MediaItem[]): void {
    const currentIds = new Set(items.map((item) => item.mediaId));
    for (const [mediaId, url] of this.objectUrls) {
      if (!currentIds.has(mediaId)) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(mediaId);
      }
    }
    this.previewUrls.set(new Map(this.objectUrls));
    for (const item of items) {
      if (item.mediaType === 'IMAGE') {
        this.loadPreview(item, false);
      }
    }
  }

  private loadPreview(item: MediaItem, includeVideo: boolean): void {
    if (item.thumbnailUrl || this.objectUrls.has(item.mediaId)) {
      return;
    }
    if (item.mediaType !== 'IMAGE' && !(includeVideo && item.mediaType === 'VIDEO')) {
      return;
    }
    this.service.download(item.mediaId).subscribe({
      next: (blob) => {
        const existing = this.objectUrls.get(item.mediaId);
        if (existing) {
          URL.revokeObjectURL(existing);
        }
        this.objectUrls.set(item.mediaId, URL.createObjectURL(blob));
        this.previewUrls.set(new Map(this.objectUrls));
      },
      error: () => {
        if (this.previewing()?.mediaId === item.mediaId) {
          this.notify.error('Could not load media preview.');
        }
      },
    });
  }

  private revokePreviewUrls(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
    this.previewUrls.set(new Map());
  }
}
