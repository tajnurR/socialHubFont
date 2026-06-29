import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ScheduleEvent } from '../../shared/models/publishing.model';
import { PublishingService } from './publishing.service';

/** Lists schedule events and the posts grouped under each (with computed times). */
@Component({
  selector: 'app-schedule-events',
  imports: [PageHeader, RouterLink, DatePipe],
  template: `
    <app-page-header title="Schedules" subtitle="Schedule events and their posts" />

    @if (loading()) {
      <p class="text-sm text-slate-400">Loading schedules…</p>
    } @else if (events().length === 0) {
      <div class="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No schedules yet. Select drafts on the
        <a routerLink="/posts/drafts" class="font-medium text-indigo-600 hover:underline">Drafts</a>
        page and apply a schedule.
      </div>
    } @else {
      <div class="space-y-4">
        @for (event of events(); track event.id) {
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-slate-800">{{ event.name }}</h3>
                <p class="text-xs text-slate-500">
                  {{ event.mode }} mode
                  @if (event.mode === 'INTERVAL') {
                    · starts {{ event.startTime | date: 'short' }} · every {{ event.intervalHours }}h
                  }
                  · {{ event.status }}
                </p>
              </div>
              <span class="text-xs text-slate-400">{{ event.posts.length }} post(s)</span>
            </div>
            <ul class="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
              @for (post of event.posts; track post.id) {
                <li class="flex items-center justify-between px-3 py-2 text-sm">
                  <span class="truncate text-slate-700">{{ post.content || '(no message)' }}</span>
                  <span class="ml-3 flex items-center gap-3 whitespace-nowrap">
                    <span class="text-xs text-slate-500">{{ post.scheduledAt | date: 'short' }}</span>
                    <span [class]="statusClass(post.status)">{{ post.status }}</span>
                  </span>
                </li>
              }
            </ul>
          </div>
        }
      </div>
    }
  `,
})
export class ScheduleEvents implements OnInit {
  private readonly publishing = inject(PublishingService);

  protected readonly events = signal<ScheduleEvent[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.publishing.listScheduleEvents().subscribe({
      next: (list) => {
        this.events.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected statusClass(status: string): string {
    const base = 'rounded-full px-2 py-0.5 text-xs font-medium ';
    switch (status) {
      case 'POSTED':
        return base + 'bg-emerald-50 text-emerald-700';
      case 'FAILED':
        return base + 'bg-red-50 text-red-700';
      case 'SCHEDULED':
        return base + 'bg-amber-50 text-amber-700';
      default:
        return base + 'bg-slate-100 text-slate-600';
    }
  }
}
