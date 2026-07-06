import { NgClass } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MediaFolder, MediaItem, MediaType } from '../../shared/models/media.model';
import {
  BulkUploadResult,
  CreatePostRequest,
  Product,
  UpdatePostRequest,
} from '../../shared/models/publishing.model';
import { SocialIntegration } from '../../shared/models/social-integration.model';
import { SocialPlatform } from '../../shared/models/social-platform.model';
import { MediaService as LibraryMediaService } from '../media/media.service';
import { PublishingService } from './publishing.service';

interface PlatformConfig {
  platform: SocialPlatform;
  label: string;
  accountLabel: string;
  contentLabel: string;
  titleLabel: string;
  mediaRequired: boolean;
}

interface PostForm {
  title: string;
  content: string;
  socialIntegrationId: number | null;
  link: string;
  productId: number | null;
}

interface PendingUploadMedia {
  file: File;
  mediaType: MediaType;
  previewUrl: string;
}

interface SaveWorkflowState {
  percentage: number;
  title: string;
  detail: string;
  tone: 'info' | 'success' | 'error';
  postId?: number;
}

@Component({
  selector: 'app-post-create',
  imports: [FormsModule, NgClass, PageHeader, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Create Post"
          subtitle="Choose a platform, then add a single post or upload posts in bulk."
        />
        <a
          routerLink="/posts"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Back to Posts
        </a>
      </div>

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold text-slate-900">Select platform</h2>
            <p class="mt-1 text-sm text-slate-500">
              Forms and upload validation change based on the selected social network.
            </p>
          </div>
          @if (selectedConfig(); as config) {
            <span class="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {{ config.label }}
            </span>
          }
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          @for (config of platformConfigs; track config.platform) {
            <button
              type="button"
              class="min-h-28 rounded-lg border p-4 text-left transition"
              [ngClass]="
                selectedPlatform() === config.platform
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50'
              "
              (click)="selectPlatform(config.platform)"
            >
              <p class="font-semibold text-slate-900">{{ config.label }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ config.accountLabel }}</p>
              <p class="mt-3 text-xs font-medium text-indigo-600">
                {{ platformAccounts(config.platform).length }} connected
              </p>
            </button>
          }
        </div>
      </section>

      @if (selectedConfig(); as config) {
        <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div class="mb-4">
              <h2 class="font-semibold text-slate-900">Single post</h2>
              <p class="mt-1 text-sm text-slate-500">
                Create one {{ config.label }} draft, then upload or attach media as needed.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="sm:col-span-2">
                <span class="text-sm font-medium text-slate-700">{{ config.accountLabel }}</span>
                <select
                  [(ngModel)]="form.socialIntegrationId"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-red-300]="submitted() && !form.socialIntegrationId"
                  [class.border-slate-300]="!(submitted() && !form.socialIntegrationId)"
                >
                  <option [ngValue]="null">Select account</option>
                  @for (account of selectedAccounts(); track account.id) {
                    <option [ngValue]="account.id">{{ accountName(account) }}</option>
                  }
                </select>
                @if (submitted() && !form.socialIntegrationId) {
                  <p class="mt-1 text-xs text-red-600">Target page/account is required.</p>
                }
              </label>

              <label>
                <span class="text-sm font-medium text-slate-700">{{ config.titleLabel }}</span>
                <input
                  [(ngModel)]="form.title"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-red-300]="submitted() && !form.title.trim()"
                  [class.border-slate-300]="!(submitted() && !form.title.trim())"
                />
                @if (submitted() && !form.title.trim()) {
                  <p class="mt-1 text-xs text-red-600">Post title is required.</p>
                }
              </label>

              <label>
                <span class="text-sm font-medium text-slate-700">Product</span>
                <select
                  [(ngModel)]="form.productId"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-red-300]="submitted() && !form.productId"
                  [class.border-slate-300]="!(submitted() && !form.productId)"
                >
                  <option [ngValue]="null">Select product</option>
                  @for (product of products(); track product.id) {
                    <option [ngValue]="product.id">{{ product.name }}</option>
                  }
                </select>
                @if (submitted() && !form.productId) {
                  <p class="mt-1 text-xs text-red-600">Product is required.</p>
                }
              </label>

              <label class="sm:col-span-2">
                <span class="text-sm font-medium text-slate-700">{{ config.contentLabel }}</span>
                <textarea
                  [(ngModel)]="form.content"
                  rows="6"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  [class.border-red-300]="submitted() && !form.content.trim()"
                  [class.border-slate-300]="!(submitted() && !form.content.trim())"
                ></textarea>
                @if (submitted() && !form.content.trim()) {
                  <p class="mt-1 text-xs text-red-600">Post content is required.</p>
                }
              </label>

              <label class="sm:col-span-2">
                <span class="text-sm font-medium text-slate-700">Link</span>
                <input
                  [(ngModel)]="form.link"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>

              <div class="sm:col-span-2">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span class="text-sm font-medium text-slate-700">Media</span>
                    <p class="mt-1 text-xs text-slate-500">
                      Drag a file here, choose one from your device, or attach an uploaded library item.
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      [disabled]="!uploadFolderId"
                      (click)="mediaInput.click()"
                    >
                      Choose file
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      (click)="toggleLibrary()"
                    >
                      {{ showLibrary() ? 'Hide library' : 'Select from library' }}
                    </button>
                    @if (hasSelectedMedia()) {
                      <button
                        type="button"
                        class="rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        (click)="clearMediaSelection()"
                      >
                        Clear media
                      </button>
                    }
                  </div>
                </div>

                <div class="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    [(ngModel)]="uploadFolderId"
                  >
                    <option [ngValue]="null">Select upload folder</option>
                    @for (folder of mediaFolders(); track folder.folderId) {
                      <option [ngValue]="folder.folderId">{{ folder.name }}</option>
                    }
                  </select>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    (click)="showFolderForm.update((value) => !value)"
                  >
                    {{ showFolderForm() ? 'Cancel' : 'New folder' }}
                  </button>
                  @if (showFolderForm()) {
                    <input
                      [(ngModel)]="newFolderName"
                      placeholder="Folder name"
                      class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:col-span-1"
                      (keydown.enter)="createMediaFolder()"
                    />
                    <button
                      type="button"
                      class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                      [disabled]="creatingFolder() || !newFolderName.trim()"
                      (click)="createMediaFolder()"
                    >
                      {{ creatingFolder() ? 'Creating...' : 'Create' }}
                    </button>
                  }
                </div>

                <input
                  #mediaInput
                  type="file"
                  class="hidden"
                  accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo,video/webm"
                  (change)="onMediaFileSelected($event)"
                />

                <div
                  class="mt-3 rounded-lg border border-dashed p-4 transition"
                  [class.border-indigo-400]="dragging()"
                  [class.bg-indigo-50]="dragging()"
                  [class.border-red-300]="submitted() && mediaMissing()"
                  [class.border-slate-300]="!(submitted() && mediaMissing()) && !dragging()"
                  [class.opacity-60]="!uploadFolderId && !hasSelectedMedia()"
                  (dragover)="onMediaDragOver($event)"
                  (dragleave)="onMediaDragLeave($event)"
                  (drop)="onMediaDrop($event)"
                >
                  @if (pendingUpload(); as pending) {
                    <div class="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                      <div class="overflow-hidden rounded-lg bg-slate-100">
                        @if (pending.mediaType === 'IMAGE') {
                          <img [src]="pending.previewUrl" alt="Selected upload preview" class="aspect-video h-full w-full object-cover" />
                        } @else {
                          <video [src]="pending.previewUrl" class="aspect-video h-full w-full bg-black object-contain" controls preload="metadata"></video>
                        }
                      </div>
                      <div class="space-y-2">
                        <p class="text-sm font-medium text-slate-900">{{ pending.file.name }}</p>
                        <p class="text-xs text-slate-500">
                          {{ pending.mediaType }} · {{ formatBytes(pending.file.size) }}
                        </p>
                        <p class="text-sm text-slate-600">
                          This file will upload to Google Drive after the draft is created.
                        </p>
                      </div>
                    </div>
                  } @else if (selectedLibraryMedia(); as media) {
                    <div class="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                      <div class="overflow-hidden rounded-lg bg-slate-100">
                        @if (media.mediaType === 'IMAGE' && previewUrlForMedia(media)) {
                          <img [src]="previewUrlForMedia(media) || ''" alt="Selected library media" class="aspect-video h-full w-full object-cover" />
                        } @else if (media.mediaType === 'VIDEO' && previewUrlForMedia(media)) {
                          <video [src]="previewUrlForMedia(media) || ''" class="aspect-video h-full w-full bg-black object-contain" controls preload="metadata"></video>
                        } @else {
                          <div class="flex aspect-video items-center justify-center text-sm font-medium text-slate-400">
                            {{ media.mediaType }}
                          </div>
                        }
                      </div>
                      <div class="space-y-2">
                        <p class="text-sm font-medium text-slate-900">{{ media.fileName }}</p>
                        <p class="text-xs text-slate-500">
                          Library item · {{ media.mediaType }} · {{ formatBytes(media.fileSize) }}
                        </p>
                        <p class="text-sm text-slate-600">
                          Existing media will attach to the draft without uploading a duplicate file.
                        </p>
                      </div>
                    </div>
                  } @else {
                    <div class="space-y-2 text-center text-sm text-slate-500">
                      <p class="font-medium text-slate-700">
                        {{ uploadFolderId ? 'Drop an image or video here' : 'Select an upload folder first' }}
                      </p>
                      <p>Supported images: jpg, jpeg, png, webp, gif. Supported videos: mp4, mov, avi, webm.</p>
                    </div>
                  }
                </div>

                @if (submitted() && mediaMissing()) {
                  <p class="mt-2 text-xs text-red-600">Media is required for {{ config.label }}.</p>
                }

                @if (mediaValidationError()) {
                  <p class="mt-2 text-xs text-red-600">{{ mediaValidationError() }}</p>
                }

                @if (workflow(); as state) {
                  <div
                    class="mt-3 rounded-lg border p-3"
                    [ngClass]="workflowClass(state.tone)"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-medium">{{ state.title }}</p>
                      <span class="text-xs font-medium">{{ state.percentage }}%</span>
                    </div>
                    <div class="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                      <div class="h-full bg-current transition-all" [style.width.%]="state.percentage"></div>
                    </div>
                    <p class="mt-2 text-xs">{{ state.detail }}</p>
                    @if (state.postId) {
                      <a routerLink="/posts" class="mt-2 inline-block text-xs font-medium underline">
                        View drafts
                      </a>
                    }
                  </div>
                }

                @if (showLibrary()) {
                  <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p class="text-sm font-medium text-slate-900">Media Library</p>
                        <p class="mt-1 text-xs text-slate-500">
                          Attach an existing uploaded image or video.
                        </p>
                      </div>
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        (click)="loadLibraryMedia()"
                      >
                        Refresh
                      </button>
                    </div>

                    @if (libraryLoading()) {
                      <p class="mt-4 text-sm text-slate-500">Loading uploaded media…</p>
                    } @else if (!libraryMedia().length) {
                      <p class="mt-4 text-sm text-slate-500">
                        No uploaded media is available yet. Upload a file or add one from the Media page first.
                      </p>
                    } @else {
                      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        @for (item of libraryMedia(); track item.mediaId) {
                          <button
                            type="button"
                            class="overflow-hidden rounded-lg border bg-white text-left transition"
                            [ngClass]="
                              selectedLibraryMedia()?.mediaId === item.mediaId
                                ? 'border-indigo-300 ring-2 ring-indigo-100'
                                : 'border-slate-200 hover:border-indigo-200'
                            "
                            (click)="selectLibraryMedia(item)"
                          >
                            <div class="aspect-video bg-slate-100">
                              @if (item.mediaType === 'IMAGE' && previewUrlForMedia(item)) {
                                <img [src]="previewUrlForMedia(item) || ''" [alt]="item.fileName" class="h-full w-full object-cover" />
                              } @else if (item.mediaType === 'VIDEO' && previewUrlForMedia(item)) {
                                <video [src]="previewUrlForMedia(item) || ''" class="h-full w-full bg-black object-contain" preload="metadata"></video>
                              } @else {
                                <div class="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                                  {{ item.mediaType }}
                                </div>
                              }
                            </div>
                            <div class="space-y-1 p-3">
                              <p class="truncate text-sm font-medium text-slate-900">{{ item.fileName }}</p>
                              <p class="text-xs text-slate-500">
                                {{ item.mediaType }} · {{ formatBytes(item.fileSize) }}
                              </p>
                            </div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 sm:w-auto"
                (click)="resetForm()"
              >
                Reset
              </button>
              <button
                type="button"
                class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                [disabled]="saving()"
                (click)="savePost()"
              >
                {{ saving() ? 'Saving...' : 'Save Post' }}
              </button>
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 class="font-semibold text-slate-900">Bulk upload</h2>
            <p class="mt-1 text-sm text-slate-500">
              Download the {{ config.label }} CSV or XLSX template. Valid rows import as drafts.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                [disabled]="downloading()"
                (click)="downloadTemplate('xlsx')"
              >
                {{ downloading() ? 'Preparing...' : 'Download XLSX' }}
              </button>
              <button
                type="button"
                class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                [disabled]="downloading()"
                (click)="downloadTemplate('csv')"
              >
                {{ downloading() ? 'Preparing...' : 'Download CSV' }}
              </button>
            </div>

            <input
              type="file"
              accept=".xlsx,.csv,text/csv"
              class="mt-4 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              (change)="onBulkFileSelected($event)"
            />

            <button
              type="button"
              class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              [disabled]="!selectedFile() || uploading()"
              (click)="upload()"
            >
              {{ uploading() ? 'Uploading...' : 'Upload Template' }}
            </button>

            @if (uploadResult(); as result) {
              <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p class="text-sm font-medium text-emerald-700">
                  {{ result.importedCount }} post(s) imported as drafts.
                </p>
                @if (result.importedCount > 0) {
                  <a routerLink="/posts" class="mt-2 inline-block text-xs font-medium text-indigo-600 hover:underline">
                    View imported posts
                  </a>
                }
                @if (result.errors.length) {
                  <ul class="mt-3 max-h-52 space-y-1 overflow-y-auto text-xs text-amber-700">
                    @for (error of result.errors; track error.row) {
                      <li>Row {{ error.row }}: {{ error.message }}</li>
                    }
                  </ul>
                  @if (result.errorReportCsv) {
                    <button
                      type="button"
                      class="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      (click)="downloadErrorReport(result)"
                    >
                      Download error report
                    </button>
                  }
                }
              </div>
            }
          </section>
        </div>
      } @else {
        <section class="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Select a social media platform to start creating posts.
        </section>
      }
    </div>
  `,
})
export class PostCreate implements OnInit, OnDestroy {
  private readonly publishing = inject(PublishingService);
  private readonly mediaLibraryService = inject(LibraryMediaService);
  private readonly notify = inject(NotificationService);
  private readonly apiOrigin = environment.apiBaseUrl.replace(/\/api\/v1$/, '');

  protected readonly platformConfigs: PlatformConfig[] = [
    {
      platform: 'FACEBOOK',
      label: 'Facebook',
      accountLabel: 'Select Facebook Page',
      contentLabel: 'Post Content',
      titleLabel: 'Post Title',
      mediaRequired: false,
    },
    {
      platform: 'INSTAGRAM',
      label: 'Instagram',
      accountLabel: 'Select Instagram Account',
      contentLabel: 'Caption',
      titleLabel: 'Internal Title',
      mediaRequired: true,
    },
    {
      platform: 'LINKEDIN',
      label: 'LinkedIn',
      accountLabel: 'Select Company Page or Profile',
      contentLabel: 'Post Content',
      titleLabel: 'Post Title',
      mediaRequired: false,
    },
    {
      platform: 'X',
      label: 'X',
      accountLabel: 'Select X Account',
      contentLabel: 'Post Content',
      titleLabel: 'Internal Title',
      mediaRequired: false,
    },
  ];

  protected readonly accounts = signal<SocialIntegration[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly selectedPlatform = signal<SocialPlatform | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly downloading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadResult = signal<BulkUploadResult | null>(null);
  protected readonly pendingUpload = signal<PendingUploadMedia | null>(null);
  protected readonly selectedLibraryMedia = signal<MediaItem | null>(null);
  protected readonly libraryMedia = signal<MediaItem[]>([]);
  protected readonly mediaFolders = signal<MediaFolder[]>([]);
  protected readonly libraryLoading = signal(false);
  protected readonly showLibrary = signal(false);
  protected readonly showFolderForm = signal(false);
  protected readonly creatingFolder = signal(false);
  protected readonly dragging = signal(false);
  protected readonly mediaValidationError = signal<string | null>(null);
  protected readonly workflow = signal<SaveWorkflowState | null>(null);

  protected form: PostForm = this.emptyForm();
  protected uploadFolderId: number | null = null;
  protected newFolderName = '';

  protected readonly selectedConfig = computed(() =>
    this.platformConfigs.find((config) => config.platform === this.selectedPlatform()),
  );
  protected readonly selectedAccounts = computed(() => this.platformAccounts(this.selectedPlatform()));

  ngOnInit(): void {
    this.publishing.listAccounts().subscribe({ next: (items) => this.accounts.set(items) });
    this.publishing.listProducts().subscribe({ next: (items) => this.products.set(items) });
    this.loadMediaFolders();
  }

  ngOnDestroy(): void {
    this.revokePendingPreview();
  }

  protected selectPlatform(platform: SocialPlatform): void {
    this.selectedPlatform.set(platform);
    this.resetForm();
    this.uploadResult.set(null);
    this.selectedFile.set(null);
  }

  protected resetForm(): void {
    const platform = this.selectedPlatform();
    this.form = this.emptyForm();
    this.form.socialIntegrationId = platform ? this.platformAccounts(platform)[0]?.id ?? null : null;
    this.submitted.set(false);
    this.mediaValidationError.set(null);
    this.clearMediaSelection();
  }

  protected async savePost(): Promise<void> {
    this.submitted.set(true);
    this.mediaValidationError.set(null);
    if (
      !this.selectedPlatform() ||
      !this.form.socialIntegrationId ||
      !this.form.content.trim() ||
      !this.form.title.trim() ||
      !this.form.productId ||
      this.mediaMissing()
    ) {
      return;
    }

    this.saving.set(true);
    this.workflow.set({ percentage: 10, title: 'Saving draft', detail: 'Creating the draft post.', tone: 'info' });

    try {
      if (this.pendingUpload()) {
        await this.saveWithNewUpload();
      } else {
        const mediaAssetId = this.selectedLibraryMedia()?.mediaId ?? null;
        const draft = await firstValueFrom(this.publishing.createPost(this.formBody(mediaAssetId)));
        this.workflow.set({
          percentage: 100,
          title: 'Draft saved',
          detail: mediaAssetId
            ? 'The draft was created and linked to the selected media library item.'
            : 'The draft was created without media.',
          tone: 'success',
          postId: draft.id,
        });
        this.notify.success(mediaAssetId ? 'Draft saved with selected media.' : 'Draft saved.');
        this.resetForm();
      }
    } catch (err) {
      this.workflow.set({
        percentage: 100,
        title: 'Save failed',
        detail: this.errorMessage(err, 'Could not save post.'),
        tone: 'error',
      });
      this.notify.error(this.errorMessage(err, 'Could not save post.'));
    } finally {
      this.saving.set(false);
    }
  }

  protected downloadTemplate(format: 'xlsx' | 'csv'): void {
    const platform = this.selectedPlatform();
    if (!platform) {
      return;
    }
    this.downloading.set(true);
    this.publishing.downloadTemplate(platform, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${platform.toLowerCase()}-posts-template.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => {
        this.notify.error('Could not download the template.');
        this.downloading.set(false);
      },
    });
  }

  protected downloadErrorReport(result: BulkUploadResult): void {
    if (!result.errorReportCsv) {
      return;
    }
    const blob = new Blob([result.errorReportCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.errorReportFileName || 'bulk-upload-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  protected onBulkFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected upload(): void {
    const platform = this.selectedPlatform();
    const file = this.selectedFile();
    if (!platform || !file) {
      return;
    }
    this.uploading.set(true);
    this.uploadResult.set(null);
    this.publishing.bulkUpload(platform, file).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.uploading.set(false);
        this.notify.success(`Imported ${result.importedCount} post(s).`);
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Upload failed.');
        this.uploading.set(false);
      },
    });
  }

  protected onMediaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.uploadFolderId) {
      this.mediaValidationError.set('Select or create a media folder before choosing a file.');
      input.value = '';
      return;
    }
    const file = input.files?.[0] ?? null;
    this.applySelectedMediaFile(file);
    input.value = '';
  }

  protected onMediaDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.uploadFolderId) {
      return;
    }
    this.dragging.set(true);
  }

  protected onMediaDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
  }

  protected onMediaDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (!this.uploadFolderId) {
      this.mediaValidationError.set('Select or create a media folder before dropping a file.');
      return;
    }
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.applySelectedMediaFile(file);
  }

  protected createMediaFolder(): void {
    const name = this.newFolderName.trim();
    if (!name) {
      return;
    }
    this.creatingFolder.set(true);
    this.mediaLibraryService.createFolder({ name }).subscribe({
      next: (folder) => {
        this.mediaFolders.update((items) => [...items, folder].sort((a, b) => a.name.localeCompare(b.name)));
        this.uploadFolderId = folder.folderId;
        this.newFolderName = '';
        this.showFolderForm.set(false);
        this.creatingFolder.set(false);
        this.notify.success('Folder created.');
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not create media folder.');
        this.creatingFolder.set(false);
      },
    });
  }

  protected toggleLibrary(): void {
    const next = !this.showLibrary();
    this.showLibrary.set(next);
    if (next) {
      this.loadLibraryMedia();
    }
  }

  protected loadLibraryMedia(): void {
    this.libraryLoading.set(true);
    this.mediaLibraryService.list('UPLOADED').subscribe({
      next: (items) => {
        this.libraryMedia.set(items);
        this.libraryLoading.set(false);
      },
      error: () => {
        this.notify.error('Could not load the media library.');
        this.libraryLoading.set(false);
      },
    });
  }

  protected selectLibraryMedia(item: MediaItem): void {
    this.revokePendingPreview();
    this.pendingUpload.set(null);
    this.selectedLibraryMedia.set(item);
    this.mediaValidationError.set(null);
    this.workflow.set(null);
  }

  protected clearMediaSelection(): void {
    this.revokePendingPreview();
    this.pendingUpload.set(null);
    this.selectedLibraryMedia.set(null);
    this.mediaValidationError.set(null);
  }

  protected hasSelectedMedia(): boolean {
    return this.pendingUpload() !== null || this.selectedLibraryMedia() !== null;
  }

  protected previewUrlForMedia(item: MediaItem): string | null {
    return item.mediaId ? `${this.apiOrigin}/api/v1/media/${item.mediaId}/download` : null;
  }

  protected platformAccounts(platform: SocialPlatform | null): SocialIntegration[] {
    if (!platform) {
      return [];
    }
    return this.accounts().filter((account) => account.platform === platform);
  }

  protected accountName(account: SocialIntegration): string {
    return account.displayName || account.externalAccountId || `#${account.id}`;
  }

  protected mediaMissing(): boolean {
    return Boolean(
      this.selectedConfig()?.mediaRequired &&
        !this.pendingUpload() &&
        !this.selectedLibraryMedia(),
    );
  }

  protected formatBytes(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
  }

  protected workflowClass(tone: SaveWorkflowState['tone']): string {
    switch (tone) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'error':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    }
  }

  private async saveWithNewUpload(): Promise<void> {
    const pending = this.pendingUpload();
    if (!pending) {
      return;
    }

    const draft = await firstValueFrom(this.publishing.createPost(this.formBody(null)));
    this.workflow.set({
      percentage: 45,
      title: 'Uploading media',
      detail: 'The draft is saved. Uploading the selected file to Google Drive.',
      tone: 'info',
      postId: draft.id,
    });

    if (!this.uploadFolderId) {
      throw new Error('Select or create a media folder before uploading.');
    }
    const result = await firstValueFrom(this.mediaLibraryService.upload([pending.file], this.uploadFolderId));
    const item = result.items[0];
    if (!item) {
      throw new Error('Media upload did not return a result.');
    }
    if (!item.media) {
      this.workflow.set({
        percentage: 100,
        title: 'Draft saved',
        detail: `The draft was created, but the media upload failed: ${item.errorMessage ?? 'Unknown error.'}`,
        tone: 'error',
        postId: draft.id,
      });
      this.notify.error(item.errorMessage ?? 'Media upload failed.');
      this.resetForm();
      return;
    }

    this.workflow.set({
      percentage: 80,
      title: 'Attaching media',
      detail: 'Linking the uploaded media record to the saved draft.',
      tone: 'info',
      postId: draft.id,
    });
    const updated = await firstValueFrom(
      this.publishing.updatePost(draft.id, this.updateBody(item.media.mediaId)),
    );

    if (item.uploaded) {
      this.workflow.set({
        percentage: 100,
        title: 'Draft saved',
        detail: 'The draft was created and linked to the uploaded Google Drive media.',
        tone: 'success',
        postId: updated.id,
      });
      this.notify.success('Draft saved with uploaded media.');
    } else {
      this.workflow.set({
        percentage: 100,
        title: 'Draft saved with media error',
        detail:
          item.errorMessage ??
          'The draft was created and linked to a failed media upload. Retry it from Media Library.',
        tone: 'error',
        postId: updated.id,
      });
      this.notify.error(
        item.errorMessage ??
          'Draft saved, but the media upload failed. Retry it from Media Library.',
      );
    }

    this.resetForm();
  }

  private applySelectedMediaFile(file: File | null): void {
    if (!file) {
      return;
    }
    const classified = this.classifyFile(file);
    if (!classified) {
      return;
    }
    this.revokePendingPreview();
    this.selectedLibraryMedia.set(null);
    this.pendingUpload.set({
      file,
      mediaType: classified,
      previewUrl: URL.createObjectURL(file),
    });
    this.mediaValidationError.set(null);
    this.workflow.set(null);
  }

  private classifyFile(file: File): MediaType | null {
    const name = file.name.toLowerCase();
    const extension = name.includes('.') ? name.split('.').pop() ?? '' : '';
    const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
    const videoExtensions = new Set(['mp4', 'mov', 'avi', 'webm']);
    const mime = (file.type || '').toLowerCase();

    if (imageExtensions.has(extension) || mime.startsWith('image/')) {
      return 'IMAGE';
    }
    if (videoExtensions.has(extension) || mime.startsWith('video/')) {
      return 'VIDEO';
    }

    this.mediaValidationError.set(
      'Unsupported media file. Supported images: jpg, jpeg, png, webp, gif. Supported videos: mp4, mov, avi, webm.',
    );
    return null;
  }

  private revokePendingPreview(): void {
    const pending = this.pendingUpload();
    if (pending?.previewUrl) {
      URL.revokeObjectURL(pending.previewUrl);
    }
  }

  private loadMediaFolders(): void {
    this.mediaLibraryService.folders().subscribe({
      next: (items) => this.mediaFolders.set(items),
      error: () => this.notify.error('Could not load media folders.'),
    });
  }

  private formBody(mediaAssetId: number | null): CreatePostRequest {
    return {
      platform: this.selectedPlatform()!,
      socialIntegrationId: this.form.socialIntegrationId!,
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      link: this.form.link.trim() || null,
      mediaAssetId,
      productId: this.form.productId!,
    };
  }

  private updateBody(mediaAssetId: number): UpdatePostRequest {
    return {
      platform: this.selectedPlatform(),
      socialIntegrationId: this.form.socialIntegrationId,
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      link: this.form.link.trim() || null,
      mediaAssetId,
      productId: this.form.productId,
    };
  }

  private errorMessage(error: unknown, fallback: string): string {
    const candidate = (error as { error?: { message?: string }; message?: string } | null)?.error?.message;
    if (candidate) {
      return candidate;
    }
    const direct = (error as { message?: string } | null)?.message;
    return direct || fallback;
  }

  private emptyForm(): PostForm {
    return {
      title: '',
      content: '',
      socialIntegrationId: null,
      link: '',
      productId: null,
    };
  }
}
