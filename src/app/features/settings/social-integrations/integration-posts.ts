import { Component, inject, input, numberAttribute, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { IntegrationPost } from '../../../shared/models/social-integration.model';
import { SocialIntegrationsService } from './social-integrations.service';

/** Lists posts for a connected integration, with cursor-based "load more". */
@Component({
  selector: 'app-integration-posts',
  imports: [RouterLink, PageHeader],
  template: `
    <div class="flex items-center justify-between">
      <app-page-header title="Posts" subtitle="Published posts for this integration" />
      <div class="flex gap-2">
        <a routerLink="/settings/social-integrations" class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          ← Back
        </a>
        <a routerLink="new" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + New Post
        </a>
      </div>
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading posts…</p>
    } @else if (error()) {
      <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{{ error() }}</div>
    } @else {
      <div class="space-y-3">
        @for (post of posts(); track post.id) {
          <article class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex gap-4">
              @if (post.fullPicture) {
                <img [src]="post.fullPicture" alt="" class="h-16 w-16 flex-none rounded-lg object-cover" />
              }
              <div class="min-w-0">
                <p class="whitespace-pre-line text-sm text-slate-800">{{ post.message || '(no message)' }}</p>
                <div class="mt-2 flex gap-3 text-xs text-slate-400">
                  @if (post.createdTime) {
                    <span>{{ post.createdTime }}</span>
                  }
                  @if (post.permalinkUrl) {
                    <a [href]="post.permalinkUrl" target="_blank" rel="noopener" class="text-indigo-600 hover:underline">
                      View on platform ↗
                    </a>
                  }
                </div>
              </div>
            </div>
          </article>
        } @empty {
          <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No posts found for this account.
          </div>
        }
      </div>

      @if (nextCursor()) {
        <div class="mt-4 text-center">
          <button
            type="button"
            [disabled]="loadingMore()"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            (click)="loadMore()"
          >
            {{ loadingMore() ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      }
    }
  `,
})
export class IntegrationPosts implements OnInit {
  /** Bound from the route param via withComponentInputBinding. */
  readonly id = input.required({ transform: numberAttribute });

  private readonly service = inject(SocialIntegrationsService);
  private readonly notifications = inject(NotificationService);

  protected readonly posts = signal<IntegrationPost[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.service.getPosts(this.id()).subscribe({
      next: (page) => {
        this.posts.set(page.posts);
        this.nextCursor.set(page.nextCursor ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Could not load posts');
        this.loading.set(false);
      },
    });
  }

  protected loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor) {
      return;
    }
    this.loadingMore.set(true);
    this.service.getPosts(this.id(), cursor).subscribe({
      next: (page) => {
        this.posts.update((current) => [...current, ...page.posts]);
        this.nextCursor.set(page.nextCursor ?? null);
        this.loadingMore.set(false);
      },
      error: () => {
        this.notifications.error('Could not load more posts');
        this.loadingMore.set(false);
      },
    });
  }
}
