import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ConnectedPage } from '../../shared/models/facebook-analytics.model';
import { PostResponse, PostStatus } from '../../shared/models/publishing.model';
import { FacebookService } from '../facebook/facebook.service';
import { PublishingService } from './publishing.service';

/** Read-only monitor of scheduled, posted, and failed posts (status tabs). */
@Component({
  selector: 'app-posts-monitor',
  imports: [PageHeader, DatePipe],
  template: `
    <app-page-header title="Scheduled & posted" subtitle="Track the publishing pipeline" />

    <div class="mb-4 flex gap-2">
      @for (tab of tabs; track tab.value) {
        <button
          (click)="select(tab.value)"
          [class]="
            active() === tab.value
              ? 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white'
              : 'rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100'
          "
        >
          {{ tab.label }}
        </button>
      }
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading…</p>
    } @else {
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Message</th>
              <th class="px-4 py-3">Page</th>
              <th class="px-4 py-3">When</th>
              <th class="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (post of posts(); track post.id) {
              <tr>
                <td class="px-4 py-3 text-slate-700">{{ post.content || '(no message)' }}</td>
                <td class="px-4 py-3 text-slate-600">{{ pageName(post.socialIntegrationId) }}</td>
                <td class="px-4 py-3 text-slate-600">
                  @if (active() === 'POSTED') {
                    {{ post.publishedAt | date: 'medium' }}
                  } @else {
                    {{ post.scheduledAt | date: 'medium' }}
                  }
                </td>
                <td class="px-4 py-3">
                  @if (post.status === 'POSTED') {
                    @if (fbUrl(post); as url) {
                      <a [href]="url" target="_blank" rel="noopener" class="text-xs font-medium text-indigo-600 hover:underline">
                        View on Facebook ↗
                      </a>
                    } @else {
                      <span class="text-xs text-emerald-600">Posted</span>
                    }
                  } @else if (post.status === 'FAILED') {
                    <span class="text-xs text-red-600">{{ post.errorMessage || 'Failed' }}</span>
                  } @else {
                    <span class="text-xs text-amber-600">Pending</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-400">
                  Nothing here yet.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class PostsMonitor implements OnInit {
  private readonly publishing = inject(PublishingService);
  private readonly facebook = inject(FacebookService);

  protected readonly tabs: { value: PostStatus; label: string }[] = [
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'POSTED', label: 'Posted' },
    { value: 'FAILED', label: 'Failed' },
  ];

  protected readonly active = signal<PostStatus>('SCHEDULED');
  protected readonly posts = signal<PostResponse[]>([]);
  protected readonly pages = signal<ConnectedPage[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.facebook.pages().subscribe({ next: (p) => this.pages.set(p) });
    this.load();
  }

  protected select(status: PostStatus): void {
    this.active.set(status);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.publishing.listPosts({ status: this.active() }).subscribe({
      next: (list) => {
        this.posts.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected pageName(id: number): string {
    const pg = this.pages().find((p) => p.integrationId === id);
    return pg?.name || pg?.pageId || `#${id}`;
  }

  protected fbUrl(post: PostResponse): string | null {
    return post.externalPostId ? `https://facebook.com/${post.externalPostId}` : null;
  }
}
