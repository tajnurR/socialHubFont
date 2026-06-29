import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ConnectedPage } from '../../shared/models/facebook-analytics.model';
import {
  PostResponse,
  Product,
  ScheduleMode,
  ScheduledPostInput,
} from '../../shared/models/publishing.model';
import { FacebookService } from '../facebook/facebook.service';
import { PublishingService } from './publishing.service';

interface ScheduleRow {
  post: PostResponse;
  localTime: string; // datetime-local value (EXPLICIT mode)
}

/**
 * Drafts workspace: filter by page/product, edit/publish/delete a single draft,
 * or multi-select drafts and apply a schedule (EXPLICIT per-post times, or an
 * INTERVAL starting at a time and spacing posts by N hours).
 */
@Component({
  selector: 'app-drafts',
  imports: [PageHeader, FormsModule, DatePipe],
  template: `
    <app-page-header title="Drafts" subtitle="Publish now, edit, or schedule your draft posts" />

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label class="block text-xs font-medium text-slate-500">Page</label>
        <select
          [(ngModel)]="pageFilter"
          (ngModelChange)="load()"
          class="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option [ngValue]="null">All pages</option>
          @for (pg of pages(); track pg.integrationId) {
            <option [ngValue]="pg.integrationId">{{ pg.name || pg.pageId }}</option>
          }
        </select>
      </div>
      <div>
        <label class="block text-xs font-medium text-slate-500">Product</label>
        <select
          [(ngModel)]="productFilter"
          (ngModelChange)="load()"
          class="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option [ngValue]="null">All products</option>
          @for (pr of products(); track pr.id) {
            <option [ngValue]="pr.id">{{ pr.name }}</option>
          }
        </select>
      </div>
      <div class="flex-1"></div>
      @if (selectedIds().size > 0) {
        <button
          (click)="openScheduler()"
          class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Schedule {{ selectedIds().size }} selected
        </button>
      }
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading drafts…</p>
    } @else {
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="w-10 px-4 py-3">
                <input type="checkbox" [checked]="allSelected()" (change)="toggleAll($event)" />
              </th>
              <th class="px-4 py-3">Message</th>
              <th class="px-4 py-3">Page</th>
              <th class="px-4 py-3">Product</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (post of posts(); track post.id) {
              <tr>
                <td class="px-4 py-3">
                  <input
                    type="checkbox"
                    [checked]="selectedIds().has(post.id)"
                    (change)="toggle(post.id)"
                  />
                </td>
                <td class="px-4 py-3 text-slate-700">
                  {{ post.content || '(no message)' }}
                  @if (post.link) {
                    <span class="block text-xs text-indigo-500">{{ post.link }}</span>
                  }
                </td>
                <td class="px-4 py-3 text-slate-600">{{ pageName(post.socialIntegrationId) }}</td>
                <td class="px-4 py-3 text-slate-600">{{ productName(post.productId) }}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <button (click)="publish(post)" class="text-xs font-medium text-emerald-600 hover:underline">
                    Publish now
                  </button>
                  <button (click)="edit(post)" class="ml-3 text-xs font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                  <button (click)="remove(post)" class="ml-3 text-xs font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-6 text-center text-sm text-slate-400">
                  No drafts. Upload a sheet on the Bulk upload page.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <!-- Edit modal -->
    @if (editing(); as e) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-lg rounded-xl bg-white p-6">
          <h3 class="text-lg font-semibold text-slate-800">Edit draft</h3>
          <div class="mt-4 space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-500">Message</label>
              <textarea
                [(ngModel)]="editForm.content"
                rows="4"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              ></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500">Link</label>
              <input
                [(ngModel)]="editForm.link"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500">Page</label>
              <select
                [(ngModel)]="editForm.socialIntegrationId"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                @for (pg of pages(); track pg.integrationId) {
                  <option [ngValue]="pg.integrationId">{{ pg.name || pg.pageId }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500">Product</label>
              <select
                [(ngModel)]="editForm.productId"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option [ngValue]="null">None</option>
                @for (pr of products(); track pr.id) {
                  <option [ngValue]="pr.id">{{ pr.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button (click)="editing.set(null)" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              (click)="saveEdit()"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Schedule modal -->
    @if (scheduling()) {
      <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6">
          <h3 class="text-lg font-semibold text-slate-800">Schedule {{ scheduleRows().length }} post(s)</h3>

          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div class="sm:col-span-3">
              <label class="block text-xs font-medium text-slate-500">Schedule name *</label>
              <input
                [(ngModel)]="scheduleName"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500">Mode</label>
              <select
                [(ngModel)]="scheduleMode"
                class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="EXPLICIT">Explicit (per post)</option>
                <option value="INTERVAL">Interval</option>
              </select>
            </div>
            @if (scheduleMode === 'INTERVAL') {
              <div>
                <label class="block text-xs font-medium text-slate-500">Start time</label>
                <input
                  type="datetime-local"
                  [(ngModel)]="intervalStart"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-500">Interval (hours)</label>
                <input
                  type="number"
                  min="1"
                  [(ngModel)]="intervalHours"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            }
          </div>

          <!-- Preview / per-post times -->
          <div class="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-3 py-2">Post</th>
                  <th class="px-3 py-2">Scheduled time</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (row of scheduleRows(); track row.post.id; let i = $index) {
                  <tr>
                    <td class="px-3 py-2 text-slate-700">
                      {{ (row.post.content || '(no message)').slice(0, 50) }}
                    </td>
                    <td class="px-3 py-2">
                      @if (scheduleMode === 'EXPLICIT') {
                        <input
                          type="datetime-local"
                          [(ngModel)]="row.localTime"
                          class="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                        />
                      } @else {
                        <span class="text-slate-600">{{ intervalPreview(i) | date: 'medium' }}</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button (click)="scheduling.set(false)" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              (click)="applySchedule()"
              [disabled]="!scheduleName.trim() || applying()"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ applying() ? 'Scheduling…' : 'Apply schedule' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class Drafts implements OnInit {
  private readonly publishing = inject(PublishingService);
  private readonly facebook = inject(FacebookService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly posts = signal<PostResponse[]>([]);
  protected readonly pages = signal<ConnectedPage[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);

  protected pageFilter: number | null = null;
  protected productFilter: number | null = null;

  protected readonly selectedIds = signal<Set<number>>(new Set());

  // Edit modal
  protected readonly editing = signal<PostResponse | null>(null);
  protected editForm: {
    content: string;
    link: string;
    socialIntegrationId: number | null;
    productId: number | null;
  } = { content: '', link: '', socialIntegrationId: null, productId: null };

  // Schedule modal
  protected readonly scheduling = signal(false);
  protected readonly applying = signal(false);
  protected readonly scheduleRows = signal<ScheduleRow[]>([]);
  protected scheduleName = '';
  protected scheduleMode: ScheduleMode = 'EXPLICIT';
  protected intervalStart = '';
  protected intervalHours = 24;

  protected readonly allSelected = computed(
    () => this.posts().length > 0 && this.selectedIds().size === this.posts().length,
  );

  ngOnInit(): void {
    this.facebook.pages().subscribe({ next: (p) => this.pages.set(p) });
    this.publishing.listProducts().subscribe({ next: (p) => this.products.set(p) });
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.selectedIds.set(new Set());
    this.publishing
      .listPosts({
        status: 'DRAFT',
        pageId: this.pageFilter ?? undefined,
        productId: this.productFilter ?? undefined,
      })
      .subscribe({
        next: (list) => {
          this.posts.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Could not load drafts.');
          this.loading.set(false);
        },
      });
  }

  protected pageName(id: number): string {
    const pg = this.pages().find((p) => p.integrationId === id);
    return pg?.name || pg?.pageId || `#${id}`;
  }

  protected productName(id: number | null | undefined): string {
    if (id == null) {
      return '—';
    }
    return this.products().find((p) => p.id === id)?.name ?? `#${id}`;
  }

  // --- selection -----------------------------------------------------------

  protected toggle(id: number): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedIds.set(checked ? new Set(this.posts().map((p) => p.id)) : new Set());
  }

  // --- single-post actions -------------------------------------------------

  protected publish(post: PostResponse): void {
    this.publishing.publishPost(post.id).subscribe({
      next: () => {
        this.notify.success('Post published.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Publish failed.'),
    });
  }

  protected edit(post: PostResponse): void {
    this.editing.set(post);
    this.editForm = {
      content: post.content ?? '',
      link: post.link ?? '',
      socialIntegrationId: post.socialIntegrationId,
      productId: post.productId ?? null,
    };
  }

  protected saveEdit(): void {
    const post = this.editing();
    if (!post) {
      return;
    }
    this.publishing.updatePost(post.id, this.editForm).subscribe({
      next: () => {
        this.notify.success('Draft updated.');
        this.editing.set(null);
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not update draft.'),
    });
  }

  protected async remove(post: PostResponse): Promise<void> {
    const ok = await this.confirm.ask('Delete this draft?', 'Delete draft', 'Delete');
    if (!ok) {
      return;
    }
    this.publishing.deletePost(post.id).subscribe({
      next: () => {
        this.notify.success('Draft deleted.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not delete draft.'),
    });
  }

  // --- scheduling ----------------------------------------------------------

  protected openScheduler(): void {
    const selected = this.posts().filter((p) => this.selectedIds().has(p.id));
    const defaultLocal = this.toLocalInput(new Date(Date.now() + 60 * 60 * 1000));
    this.scheduleRows.set(selected.map((post) => ({ post, localTime: defaultLocal })));
    this.scheduleName = '';
    this.scheduleMode = 'EXPLICIT';
    this.intervalStart = defaultLocal;
    this.intervalHours = 24;
    this.scheduling.set(true);
  }

  protected intervalPreview(index: number): Date | null {
    if (!this.intervalStart) {
      return null;
    }
    const start = new Date(this.intervalStart).getTime();
    return new Date(start + index * this.intervalHours * 3600 * 1000);
  }

  protected applySchedule(): void {
    if (!this.scheduleName.trim()) {
      return;
    }
    this.applying.set(true);

    const startInstant =
      this.scheduleMode === 'INTERVAL' && this.intervalStart
        ? new Date(this.intervalStart).toISOString()
        : null;

    this.publishing
      .createScheduleEvent({
        name: this.scheduleName.trim(),
        mode: this.scheduleMode,
        startTime: startInstant,
        intervalHours: this.scheduleMode === 'INTERVAL' ? this.intervalHours : null,
      })
      .subscribe({
        next: (event) => {
          const items: ScheduledPostInput[] = this.scheduleRows().map((row) => ({
            postId: row.post.id,
            scheduledAt:
              this.scheduleMode === 'EXPLICIT' && row.localTime
                ? new Date(row.localTime).toISOString()
                : null,
          }));
          this.publishing.attachPosts(event.id, { items }).subscribe({
            next: () => {
              this.notify.success('Posts scheduled.');
              this.applying.set(false);
              this.scheduling.set(false);
              this.load();
            },
            error: (err) => {
              this.notify.error(err?.error?.message ?? 'Could not schedule posts.');
              this.applying.set(false);
            },
          });
        },
        error: (err) => {
          this.notify.error(err?.error?.message ?? 'Could not create schedule.');
          this.applying.set(false);
        },
      });
  }

  /** Formats a Date as a `datetime-local` value in the user's local timezone. */
  private toLocalInput(date: Date): string {
    const off = date.getTimezoneOffset();
    return new Date(date.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
  }
}
