import { NgClass } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MediaFolder, MediaItem, MediaType } from '../../shared/models/media.model';
import {
  BulkUploadResult,
  CreatePostRequest,
  PostResponse,
  Product,
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
  link: string;
  productId: number | null;
}

interface PlatformTarget {
  id: string;
  platform: SocialPlatform | null;
  socialIntegrationId: number | null;
}

interface PendingUploadMedia {
  id: string;
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
          subtitle="Create one post and prepare it for one or more connected accounts."
        />
        <a
          routerLink="/posts"
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
        >
          Back to Posts
        </a>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div class="mb-4">
              <h2 class="font-semibold text-slate-900">Single post</h2>
              <p class="mt-1 text-sm text-slate-500">
                The same content is saved as one draft per selected platform/account combination.
              </p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <section class="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 class="text-sm font-semibold text-slate-900">Publishing Platforms & Accounts</h3>
                    <p class="mt-1 text-sm text-slate-500">
                      Choose where this post will be published. You can select the same platform multiple times if you want to publish through different connected accounts.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    (click)="addTarget()"
                  >
                    Add Account
                  </button>
                </div>

                <div class="mt-4 space-y-3">
                  @for (target of targets(); track target.id; let index = $index) {
                    <div class="rounded-lg border border-slate-200 bg-white p-3">
                      <div class="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto]">
                        <label>
                          <span class="text-xs font-medium text-slate-500">Social Media Platform</span>
                          <select
                            [ngModel]="target.platform"
                            (ngModelChange)="updateTargetPlatform(target.id, $event)"
                            class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            [class.border-red-300]="submitted() && !target.platform"
                            [class.border-slate-300]="!(submitted() && !target.platform)"
                          >
                            <option [ngValue]="null">Select platform</option>
                            @for (config of platformConfigs; track config.platform) {
                              <option [ngValue]="config.platform">{{ config.label }}</option>
                            }
                          </select>
                          <p class="mt-1 text-xs text-slate-500">Choose where this draft will be prepared.</p>
                        </label>

                        <label>
                          <span class="text-xs font-medium text-slate-500">Connected Account</span>
                          <select
                            [ngModel]="target.socialIntegrationId"
                            (ngModelChange)="updateTargetAccount(target.id, $event)"
                            class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                            [class.border-red-300]="submitted() && (!target.socialIntegrationId || duplicateTarget(target))"
                            [class.border-slate-300]="!(submitted() && (!target.socialIntegrationId || duplicateTarget(target)))"
                            [disabled]="!target.platform"
                          >
                            <option [ngValue]="null">Select connected account</option>
                            @for (account of platformAccounts(target.platform); track account.id) {
                              <option [ngValue]="account.id">{{ accountName(account) }}</option>
                            }
                          </select>
                          <p class="mt-1 text-xs text-slate-500">Select the account that will publish this draft.</p>
                        </label>

                        <button
                          type="button"
                          class="self-end rounded-lg border border-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                          [disabled]="targets().length === 1"
                          (click)="removeTarget(target.id)"
                        >
                          Remove
                        </button>
                      </div>

                      @if (submitted() && !target.platform) {
                        <p class="mt-2 text-xs text-red-600">Platform is required for target {{ index + 1 }}.</p>
                      } @else if (submitted() && !target.socialIntegrationId) {
                        <p class="mt-2 text-xs text-red-600">Connected account is required for target {{ index + 1 }}.</p>
                      } @else if (submitted() && duplicateTarget(target)) {
                        <p class="mt-2 text-xs text-red-600">This platform/account combination is already selected.</p>
                      }
                    </div>
                  }
                </div>

                @if (submitted() && targetValidationError()) {
                  <p class="mt-3 text-xs text-red-600">{{ targetValidationError() }}</p>
                }
              </section>

              <label>
                <span class="text-sm font-medium text-slate-700">Post Title</span>
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
                <span class="text-sm font-medium text-slate-700">Post Content</span>
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
                      Add one or more images/videos. They will be saved in order and attached to each generated draft.
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      [disabled]="!uploadFolderId"
                      (click)="mediaInput.click()"
                    >
                      Choose files
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
                  multiple
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
                  @if (hasSelectedMedia()) {
                    <div class="space-y-3">
                      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        @for (pending of pendingUploads(); track pending.id) {
                          <div class="overflow-hidden rounded-md border border-slate-200 bg-white">
                            <div class="aspect-square bg-slate-100">
                              @if (pending.mediaType === 'IMAGE') {
                                <img [src]="pending.previewUrl" alt="Selected upload preview" class="h-full w-full object-cover" />
                              } @else {
                                <video [src]="pending.previewUrl" class="h-full w-full bg-black object-cover" muted preload="metadata"></video>
                              }
                            </div>
                            <div class="space-y-1 p-2">
                              <p class="truncate text-xs font-medium text-slate-900">{{ pending.file.name }}</p>
                              <p class="text-[11px] text-slate-500">{{ pending.mediaType }} · {{ formatBytes(pending.file.size) }}</p>
                              <button type="button" class="text-[11px] font-medium text-red-600" (click)="removePendingUpload(pending.id)">Remove</button>
                            </div>
                          </div>
                        }
                        @for (media of selectedLibraryMedia(); track media.mediaId) {
                          <div class="overflow-hidden rounded-md border border-indigo-200 bg-white">
                            <div class="aspect-square bg-slate-100">
                              @if (media.mediaType === 'IMAGE' && previewUrlForMedia(media)) {
                                <img [src]="previewUrlForMedia(media) || ''" [alt]="media.fileName" class="h-full w-full object-cover" />
                              } @else if (media.mediaType === 'VIDEO' && previewUrlForMedia(media)) {
                                <video [src]="previewUrlForMedia(media) || ''" class="h-full w-full bg-black object-cover" muted preload="metadata"></video>
                              } @else {
                                <div class="flex h-full items-center justify-center text-xs font-medium text-slate-400">{{ media.mediaType }}</div>
                              }
                            </div>
                            <div class="space-y-1 p-2">
                              <p class="truncate text-xs font-medium text-slate-900">{{ media.fileName }}</p>
                              <p class="text-[11px] text-slate-500">Library · {{ media.mediaType }}</p>
                              <button type="button" class="text-[11px] font-medium text-red-600" (click)="removeLibraryMedia(media.mediaId)">Remove</button>
                            </div>
                          </div>
                        }
                      </div>
                      <p class="text-xs text-slate-500">
                        {{ selectedMediaCount() }} media item(s) selected. New files will upload to Google Drive before drafts are created.
                      </p>
                    </div>
                  } @else {
                    <div class="space-y-2 text-center text-sm text-slate-500">
                      <p class="font-medium text-slate-700">
                        {{ uploadFolderId ? 'Drop images or videos here' : 'Select an upload folder first' }}
                      </p>
                      <p>Supported images: jpg, jpeg, png, webp, gif. Supported videos: mp4, mov, avi, webm.</p>
                    </div>
                  }
                </div>

                @if (submitted() && mediaMissing()) {
                  <p class="mt-2 text-xs text-red-600">Media is required when any selected platform requires media.</p>
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
                      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                        @for (item of libraryMedia(); track item.mediaId) {
                          <button
                            type="button"
                            class="overflow-hidden rounded-md border bg-white text-left transition"
                            [ngClass]="
                              isLibraryMediaSelected(item.mediaId)
                                ? 'border-indigo-300 ring-2 ring-indigo-100'
                                : 'border-slate-200 hover:border-indigo-200'
                            "
                            (click)="selectLibraryMedia(item)"
                          >
                            <div class="aspect-square bg-slate-100">
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
                            <div class="space-y-1 p-2">
                              <p class="truncate text-xs font-medium text-slate-900">{{ item.fileName }}</p>
                              <p class="text-[11px] text-slate-500">
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
              Download a platform-specific CSV or XLSX template. Valid rows import as drafts.
            </p>

            <div class="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-900">
              <p class="font-semibold">How to format the file</p>
              <ul class="mt-2 space-y-1">
                <li>Use one row per draft post and keep the template headers unchanged.</li>
                <li>Required columns: postContent, product, postTitle, and pageId.</li>
                <li>For multiple media files, put URLs in imageUrl, videoUrl, or googleDriveUrl separated by semicolons, commas, or new lines.</li>
                <li>Example: <span class="font-mono">https://site.com/a.jpg; https://site.com/b.jpg</span></li>
                <li>Public image/video URLs are imported into your Media Library; Google Drive URLs must be accessible from your connected Drive account.</li>
              </ul>
            </div>

            <label class="mt-4 block">
              <span class="text-xs font-medium text-slate-500">Template Platform</span>
              <select
                [(ngModel)]="bulkPlatform"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                @for (config of platformConfigs; track config.platform) {
                  <option [ngValue]="config.platform">{{ config.label }}</option>
                }
              </select>
            </label>

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
    </div>
  `,
})
export class PostCreate implements OnInit, OnDestroy {
  private readonly publishing = inject(PublishingService);
  private readonly mediaLibraryService = inject(LibraryMediaService);
  private readonly notify = inject(NotificationService);
  private targetSequence = 0;

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
  protected readonly targets = signal<PlatformTarget[]>([this.emptyTarget()]);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly downloading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadResult = signal<BulkUploadResult | null>(null);
  protected readonly pendingUploads = signal<PendingUploadMedia[]>([]);
  protected readonly selectedLibraryMedia = signal<MediaItem[]>([]);
  protected readonly libraryMedia = signal<MediaItem[]>([]);
  protected readonly previewUrls = signal<Map<number, string>>(new Map());
  protected readonly mediaFolders = signal<MediaFolder[]>([]);
  protected readonly libraryLoading = signal(false);
  protected readonly showLibrary = signal(false);
  protected readonly showFolderForm = signal(false);
  protected readonly creatingFolder = signal(false);
  protected readonly dragging = signal(false);
  protected readonly mediaValidationError = signal<string | null>(null);
  protected readonly workflow = signal<SaveWorkflowState | null>(null);
  private readonly objectUrls = new Map<number, string>();
  private mediaSequence = 0;

  protected form: PostForm = this.emptyForm();
  protected uploadFolderId: number | null = null;
  protected newFolderName = '';
  protected bulkPlatform: SocialPlatform = 'FACEBOOK';

  ngOnInit(): void {
    this.publishing.listAccounts().subscribe({
      next: (items) => {
        this.accounts.set(items);
        this.initializeDefaultTarget();
      },
    });
    this.publishing.listProducts().subscribe({ next: (items) => this.products.set(items) });
    this.loadMediaFolders();
  }

  ngOnDestroy(): void {
    this.revokePendingPreviews();
    this.revokePreviewUrls();
  }

  protected resetForm(): void {
    this.form = this.emptyForm();
    this.targets.set([this.defaultTarget()]);
    this.submitted.set(false);
    this.mediaValidationError.set(null);
    this.clearMediaSelection();
  }

  protected async savePost(): Promise<void> {
    this.submitted.set(true);
    this.mediaValidationError.set(null);
    if (
      !this.targetsValid() ||
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
      if (this.pendingUploads().length) {
        await this.saveWithNewUpload();
      } else {
        const mediaAssetIds = this.selectedLibraryMedia().map((media) => media.mediaId);
        const drafts = await this.createDrafts(mediaAssetIds);
        this.workflow.set({
          percentage: 100,
          title: drafts.length === 1 ? 'Draft saved' : 'Drafts saved',
          detail: mediaAssetIds.length
            ? `${drafts.length} draft(s) were created and linked to the selected media library item.`
            : `${drafts.length} draft(s) were created without media.`,
          tone: 'success',
          postId: drafts[0]?.id,
        });
        this.notify.success(`${drafts.length} draft(s) saved.`);
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
    const platform = this.bulkPlatform;
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
    const platform = this.bulkPlatform;
    const file = this.selectedFile();
    if (!file) {
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

  protected addTarget(): void {
    this.targets.update((items) => [...items, this.emptyTarget()]);
  }

  protected removeTarget(id: string): void {
    this.targets.update((items) => {
      const next = items.filter((target) => target.id !== id);
      return next.length ? next : [this.emptyTarget()];
    });
  }

  protected updateTargetPlatform(id: string, platform: SocialPlatform | null): void {
    this.targets.update((items) =>
      items.map((target) =>
        target.id === id
          ? {
              ...target,
              platform,
              socialIntegrationId: platform ? this.platformAccounts(platform)[0]?.id ?? null : null,
            }
          : target,
      ),
    );
  }

  protected updateTargetAccount(id: string, socialIntegrationId: number | null): void {
    this.targets.update((items) =>
      items.map((target) => (target.id === id ? { ...target, socialIntegrationId } : target)),
    );
  }

  protected duplicateTarget(target: PlatformTarget): boolean {
    if (!target.platform || !target.socialIntegrationId) {
      return false;
    }
    return this.targets().filter((item) => this.targetKey(item) === this.targetKey(target)).length > 1;
  }

  protected targetValidationError(): string | null {
    if (this.targets().some((target) => !target.platform)) {
      return 'Select a platform for every target.';
    }
    if (this.targets().some((target) => !target.socialIntegrationId)) {
      return 'Select a connected account for every target.';
    }
    if (this.hasDuplicateTargets()) {
      return 'Remove duplicate platform/account combinations before saving.';
    }
    return null;
  }

  protected onMediaFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.uploadFolderId) {
      this.mediaValidationError.set('Select or create a media folder before choosing a file.');
      input.value = '';
      return;
    }
    this.applySelectedMediaFiles(Array.from(input.files ?? []));
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
    this.applySelectedMediaFiles(Array.from(event.dataTransfer?.files ?? []));
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
        this.syncPreviewUrls(items);
        this.libraryLoading.set(false);
      },
      error: () => {
        this.notify.error('Could not load the media library.');
        this.libraryLoading.set(false);
      },
    });
  }

  protected selectLibraryMedia(item: MediaItem): void {
    this.selectedLibraryMedia.update((items) =>
      items.some((media) => media.mediaId === item.mediaId)
        ? items.filter((media) => media.mediaId !== item.mediaId)
        : [...items, item],
    );
    this.loadPreview(item, item.mediaType === 'VIDEO');
    this.mediaValidationError.set(null);
    this.workflow.set(null);
  }

  protected clearMediaSelection(): void {
    this.revokePendingPreviews();
    this.pendingUploads.set([]);
    this.selectedLibraryMedia.set([]);
    this.mediaValidationError.set(null);
  }

  protected hasSelectedMedia(): boolean {
    return this.selectedMediaCount() > 0;
  }

  protected selectedMediaCount(): number {
    return this.pendingUploads().length + this.selectedLibraryMedia().length;
  }

  protected previewUrlForMedia(item: MediaItem): string | null {
    return item.thumbnailUrl || this.previewUrls().get(item.mediaId) || null;
  }

  protected isLibraryMediaSelected(mediaId: number): boolean {
    return this.selectedLibraryMedia().some((item) => item.mediaId === mediaId);
  }

  protected removePendingUpload(id: string): void {
    this.pendingUploads.update((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return items.filter((item) => item.id !== id);
    });
  }

  protected removeLibraryMedia(mediaId: number): void {
    this.selectedLibraryMedia.update((items) => items.filter((item) => item.mediaId !== mediaId));
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
      this.selectedTargets().some((target) => this.platformConfig(target.platform)?.mediaRequired) &&
        !this.pendingUploads().length &&
        !this.selectedLibraryMedia().length,
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
    const pending = this.pendingUploads();
    if (!pending.length) {
      return;
    }

    this.workflow.set({
      percentage: 35,
      title: 'Uploading media',
      detail: 'Uploading the selected files to Google Drive before creating account-specific drafts.',
      tone: 'info',
    });

    if (!this.uploadFolderId) {
      throw new Error('Select or create a media folder before uploading.');
    }
    const result = await firstValueFrom(
      this.mediaLibraryService.upload(pending.map((item) => item.file), this.uploadFolderId),
    );
    const uploadedMedia = result.items.filter((item) => item.media).map((item) => item.media!);
    if (!result.items.length) {
      throw new Error('Media upload did not return a result.');
    }
    if (!uploadedMedia.length) {
      const firstError = result.items.find((item) => item.errorMessage)?.errorMessage;
      this.workflow.set({
        percentage: 100,
        title: 'Media upload failed',
        detail: firstError ?? 'The selected files could not be uploaded.',
        tone: 'error',
      });
      this.notify.error(firstError ?? 'Media upload failed.');
      return;
    }

    this.workflow.set({
      percentage: 70,
      title: 'Creating drafts',
      detail: 'Saving one draft for each selected platform/account combination.',
      tone: 'info',
    });
    const libraryMediaIds = this.selectedLibraryMedia().map((media) => media.mediaId);
    const drafts = await this.createDrafts([...libraryMediaIds, ...uploadedMedia.map((media) => media.mediaId)]);

    if (result.failedCount === 0) {
      this.workflow.set({
        percentage: 100,
        title: drafts.length === 1 ? 'Draft saved' : 'Drafts saved',
        detail: `${drafts.length} draft(s) were created and linked to ${uploadedMedia.length + libraryMediaIds.length} media item(s).`,
        tone: 'success',
        postId: drafts[0]?.id,
      });
      this.notify.success(`${drafts.length} draft(s) saved with uploaded media.`);
    } else {
      this.workflow.set({
        percentage: 100,
        title: drafts.length === 1 ? 'Draft saved with media error' : 'Drafts saved with media error',
        detail:
          result.items.find((item) => item.errorMessage)?.errorMessage ??
          'Drafts were created with the media that uploaded successfully. Retry failed files from Media Library.',
        tone: 'error',
        postId: drafts[0]?.id,
      });
      this.notify.error(
        result.items.find((item) => item.errorMessage)?.errorMessage ??
          'Drafts saved, but one or more media uploads failed. Retry them from Media Library.',
      );
    }

    this.resetForm();
  }

  private async createDrafts(mediaAssetIds: number[]): Promise<PostResponse[]> {
    const drafts: PostResponse[] = [];
    for (const target of this.selectedTargets()) {
      const draft = await firstValueFrom(this.publishing.createPost(this.formBody(target, mediaAssetIds)));
      drafts.push(draft);
    }
    return drafts;
  }

  private applySelectedMediaFiles(files: File[]): void {
    if (!files.length) {
      return;
    }
    const pending: PendingUploadMedia[] = [];
    for (const file of files) {
      const classified = this.classifyFile(file);
      if (!classified) {
        continue;
      }
      this.mediaSequence += 1;
      pending.push({
        id: `media-${this.mediaSequence}`,
        file,
        mediaType: classified,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (!pending.length) {
      return;
    }
    this.pendingUploads.update((items) => [...items, ...pending]);
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

  private revokePendingPreviews(): void {
    for (const pending of this.pendingUploads()) {
      URL.revokeObjectURL(pending.previewUrl);
    }
  }

  private loadPreview(item: MediaItem, includeVideo: boolean): void {
    if (item.thumbnailUrl || this.objectUrls.has(item.mediaId)) {
      return;
    }
    if (item.mediaType !== 'IMAGE' && !(includeVideo && item.mediaType === 'VIDEO')) {
      return;
    }
    this.mediaLibraryService.download(item.mediaId).subscribe({
      next: (blob) => {
        const existing = this.objectUrls.get(item.mediaId);
        if (existing) {
          URL.revokeObjectURL(existing);
        }
        this.objectUrls.set(item.mediaId, URL.createObjectURL(blob));
        this.previewUrls.set(new Map(this.objectUrls));
      },
      error: () => this.notify.error('Could not load media preview.'),
    });
  }

  private syncPreviewUrls(items: MediaItem[]): void {
    const ids = new Set(items.map((item) => item.mediaId));
    for (const [mediaId, url] of this.objectUrls) {
      if (!ids.has(mediaId)) {
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

  private revokePreviewUrls(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
    this.previewUrls.set(new Map());
  }

  private loadMediaFolders(): void {
    this.mediaLibraryService.folders().subscribe({
      next: (items) => this.mediaFolders.set(items),
      error: () => this.notify.error('Could not load media folders.'),
    });
  }

  private initializeDefaultTarget(): void {
    this.targets.update((items) => {
      if (items.length !== 1 || items[0].platform || items[0].socialIntegrationId) {
        return items;
      }
      return [this.defaultTarget()];
    });
  }

  private defaultTarget(): PlatformTarget {
    const firstAccount = this.accounts()[0];
    return {
      id: this.nextTargetId(),
      platform: firstAccount?.platform ?? 'FACEBOOK',
      socialIntegrationId: firstAccount?.id ?? null,
    };
  }

  private emptyTarget(): PlatformTarget {
    return {
      id: this.nextTargetId(),
      platform: null,
      socialIntegrationId: null,
    };
  }

  private nextTargetId(): string {
    this.targetSequence += 1;
    return `target-${this.targetSequence}`;
  }

  private selectedTargets(): Array<{ platform: SocialPlatform; socialIntegrationId: number }> {
    return this.targets().filter(
      (target): target is PlatformTarget & { platform: SocialPlatform; socialIntegrationId: number } =>
        Boolean(target.platform && target.socialIntegrationId),
    );
  }

  private targetsValid(): boolean {
    return (
      this.targets().length > 0 &&
      this.targets().every((target) => target.platform && target.socialIntegrationId) &&
      !this.hasDuplicateTargets()
    );
  }

  private hasDuplicateTargets(): boolean {
    const keys = this.targets()
      .filter((target) => target.platform && target.socialIntegrationId)
      .map((target) => this.targetKey(target));
    return new Set(keys).size !== keys.length;
  }

  private targetKey(target: PlatformTarget): string {
    return `${target.platform ?? ''}:${target.socialIntegrationId ?? ''}`;
  }

  private platformConfig(platform: SocialPlatform | null): PlatformConfig | undefined {
    return this.platformConfigs.find((config) => config.platform === platform);
  }

  private formBody(
    target: { platform: SocialPlatform; socialIntegrationId: number },
    mediaAssetIds: number[],
  ): CreatePostRequest {
    return {
      platform: target.platform,
      socialIntegrationId: target.socialIntegrationId,
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      link: this.form.link.trim() || null,
      mediaAssetId: mediaAssetIds[0] ?? null,
      mediaAssetIds,
      productId: this.form.productId!,
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
      link: '',
      productId: null,
    };
  }
}
