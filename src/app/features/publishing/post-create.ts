import { NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import {
  BulkUploadResult,
  CreatePostRequest,
  Product,
} from '../../shared/models/publishing.model';
import { SocialIntegration } from '../../shared/models/social-integration.model';
import { SocialPlatform } from '../../shared/models/social-platform.model';
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
  mediaUrl: string;
  link: string;
  productId: number | null;
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
                Create one {{ config.label }} post and reset the form for the next one.
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

              <label>
                <span class="text-sm font-medium text-slate-700">Image / Video URL</span>
                <input
                  [(ngModel)]="form.mediaUrl"
                  class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  [class.border-red-300]="submitted() && mediaMissing()"
                  [class.border-slate-300]="!(submitted() && mediaMissing())"
                />
                @if (submitted() && mediaMissing()) {
                  <p class="mt-1 text-xs text-red-600">Media is required for {{ config.label }}.</p>
                }
              </label>

              <label>
                <span class="text-sm font-medium text-slate-700">Link</span>
                <input
                  [(ngModel)]="form.link"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
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
              Download the {{ config.label }} template. Valid rows import as drafts.
            </p>

            <button
              type="button"
              class="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              [disabled]="downloading()"
              (click)="downloadTemplate()"
            >
              {{ downloading() ? 'Preparing...' : 'Download template' }}
            </button>

            <input
              type="file"
              accept=".xlsx"
              class="mt-4 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              (change)="onFileSelected($event)"
            />

            <button
              type="button"
              class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              [disabled]="!selectedFile() || uploading()"
              (click)="upload()"
            >
              {{ uploading() ? 'Uploading...' : 'Upload Excel' }}
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
export class PostCreate implements OnInit {
  private readonly publishing = inject(PublishingService);
  private readonly notify = inject(NotificationService);

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

  protected form: PostForm = this.emptyForm();

  protected readonly selectedConfig = computed(() =>
    this.platformConfigs.find((config) => config.platform === this.selectedPlatform()),
  );
  protected readonly selectedAccounts = computed(() =>
    this.platformAccounts(this.selectedPlatform()),
  );

  ngOnInit(): void {
    this.publishing.listAccounts().subscribe({ next: (items) => this.accounts.set(items) });
    this.publishing.listProducts().subscribe({ next: (items) => this.products.set(items) });
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
  }

  protected savePost(): void {
    this.submitted.set(true);
    if (
      !this.selectedPlatform() ||
      !this.form.socialIntegrationId ||
      !this.form.content.trim() ||
      !this.form.title.trim() ||
      !this.form.productId
    ) {
      return;
    }
    if (this.mediaMissing()) {
      return;
    }
    this.saving.set(true);
    this.publishing.createPost(this.formBody()).subscribe({
      next: () => {
        this.notify.success('Post saved.');
        this.saving.set(false);
        this.resetForm();
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not save post.');
        this.saving.set(false);
      },
    });
  }

  protected downloadTemplate(): void {
    const platform = this.selectedPlatform();
    if (!platform) {
      return;
    }
    this.downloading.set(true);
    this.publishing.downloadTemplate(platform).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${platform.toLowerCase()}-posts-template.xlsx`;
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

  protected onFileSelected(event: Event): void {
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
    return Boolean(this.selectedConfig()?.mediaRequired && !this.form.mediaUrl.trim());
  }

  private formBody(): CreatePostRequest {
    return {
      platform: this.selectedPlatform()!,
      socialIntegrationId: this.form.socialIntegrationId!,
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      link: this.form.link.trim() || null,
      mediaUrl: this.form.mediaUrl.trim() || null,
      productId: this.form.productId!,
    };
  }

  private emptyForm(): PostForm {
    return {
      title: '',
      content: '',
      socialIntegrationId: null,
      mediaUrl: '',
      link: '',
      productId: null,
    };
  }
}
