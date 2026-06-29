import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { BulkUploadResult } from '../../shared/models/publishing.model';
import { PublishingService } from './publishing.service';

/**
 * Bulk-upload page: download the Excel template, upload a filled sheet, and see
 * the per-row import result (imported count + row-level errors).
 */
@Component({
  selector: 'app-bulk-upload',
  imports: [PageHeader, RouterLink],
  template: `
    <app-page-header
      title="Bulk upload posts"
      subtitle="Create draft posts in bulk from an Excel sheet"
    />

    <div class="space-y-6">
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-800">1. Get the template</h3>
        <p class="mt-1 text-sm text-slate-500">
          Columns: <code>message</code>, <code>pageId</code> (your connected Facebook Page ID),
          <code>productSku</code> (optional), <code>link</code> (optional),
          <code>scheduledAt</code> (optional, e.g. 2026-07-01T09:00).
        </p>
        <button
          type="button"
          (click)="download()"
          [disabled]="downloading()"
          class="mt-3 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {{ downloading() ? 'Preparing…' : 'Download template (.xlsx)' }}
        </button>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="font-semibold text-slate-800">2. Upload your filled sheet</h3>
        <p class="mt-1 text-sm text-slate-500">
          Valid rows are imported as drafts you own. Invalid rows are skipped and reported below.
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <input
            #fileInput
            type="file"
            accept=".xlsx"
            (change)="onFileSelected($event)"
            class="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <button
            type="button"
            (click)="upload()"
            [disabled]="!selectedFile() || uploading()"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ uploading() ? 'Uploading…' : 'Upload' }}
          </button>
        </div>
      </div>

      @if (result(); as r) {
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <h3 class="font-semibold text-slate-800">Import result</h3>
          <p class="mt-1 text-sm text-emerald-700">
            {{ r.importedCount }} post(s) imported as drafts.
          </p>
          @if (r.errors.length) {
            <p class="mt-3 text-sm font-medium text-amber-700">
              {{ r.errors.length }} row(s) skipped:
            </p>
            <ul class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              @for (e of r.errors; track e.row) {
                <li class="flex gap-3 px-3 py-2 text-sm">
                  <span class="font-mono text-slate-400">Row {{ e.row }}</span>
                  <span class="text-slate-700">{{ e.message }}</span>
                </li>
              }
            </ul>
          }
          @if (r.importedCount > 0) {
            <a
              routerLink="/posts/drafts"
              class="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
            >
              Go to drafts →
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class BulkUpload {
  private readonly publishing = inject(PublishingService);
  private readonly notify = inject(NotificationService);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly downloading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly result = signal<BulkUploadResult | null>(null);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected download(): void {
    this.downloading.set(true);
    this.publishing.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-posts-template.xlsx';
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

  protected upload(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }
    this.uploading.set(true);
    this.result.set(null);
    this.publishing.bulkUpload(file).subscribe({
      next: (res) => {
        this.result.set(res);
        this.uploading.set(false);
        this.notify.success(`Imported ${res.importedCount} post(s).`);
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Upload failed.');
        this.uploading.set(false);
      },
    });
  }
}
