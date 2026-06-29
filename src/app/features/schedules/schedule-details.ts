import { DatePipe, DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  PLATFORM_META,
  SCHEDULE_PLATFORMS,
  Schedule,
  SchedulePlatform,
  SchedulePost,
  SchedulePostStatus,
} from './schedule.model';
import { ScheduleEditor } from './schedule-editor';
import { SchedulesService } from './schedules.service';

@Component({
  selector: 'app-schedule-details',
  imports: [FormsModule, RouterLink, DatePipe, DecimalPipe, NgClass, SlicePipe, ScheduleEditor],
  template: `
    @if (schedule(); as s) {
      <div class="space-y-5">
        <a routerLink="/schedules" class="text-sm font-medium text-slate-600 hover:underline"
          >← Schedules</a
        >

        <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <span class="h-10 w-2 rounded-full" [style.background]="s.color"></span>
                <div>
                  <h1 class="text-2xl font-bold text-slate-900">{{ s.name }}</h1>
                  <p class="mt-1 max-w-3xl text-sm text-slate-500">{{ s.description }}</p>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [ngClass]="statusClass(s.status)"
                >
                  {{ title(s.status) }}
                </span>
                @for (platform of s.platforms; track platform) {
                  <span
                    class="flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-bold"
                    [ngClass]="platformMeta[platform].tone"
                  >
                    {{ platformMeta[platform].icon }} {{ platformMeta[platform].label }}
                  </span>
                }
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                (click)="edit()"
              >
                Edit
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                (click)="togglePause(s)"
              >
                {{ s.status === 'paused' ? 'Resume' : 'Pause' }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                (click)="moreOpen.update((v) => !v)"
              >
                More Actions
              </button>
            </div>
          </div>
          @if (moreOpen()) {
            <div class="mt-4 flex flex-wrap gap-2 rounded-lg bg-slate-50 p-3">
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                (click)="applyBestTime(s)"
              >
                Apply Best Time
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                (click)="saveAsTemplate()"
              >
                Save Schedule as Template
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-sm text-red-600"
                (click)="delete(s)"
              >
                Delete
              </button>
            </div>
          }
        </section>

        <section class="grid grid-cols-2 gap-3 lg:grid-cols-7">
          @for (card of overviewCards(s); track card.label) {
            <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
              <p class="mt-2 text-xl font-bold text-slate-900">{{ card.value }}</p>
              <p class="mt-1 text-xs text-slate-400">{{ card.hint }}</p>
            </div>
          }
        </section>

        <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div class="space-y-4">
            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-4 flex items-center justify-between">
                <h2 class="font-semibold text-slate-900">Schedule info</h2>
                <span class="text-xs text-slate-400"
                  >Created {{ s.createdAt | date: 'mediumDate' }} · Updated
                  {{ s.updatedAt | date: 'mediumDate' }}</span
                >
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p class="text-xs text-slate-400">Platforms</p>
                  <p class="font-medium text-slate-800">{{ platformLabels(s.platforms) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Frequency</p>
                  <p class="font-medium text-slate-800">{{ title(s.scheduleType) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Days</p>
                  <p class="font-medium text-slate-800">
                    {{ s.daysOfWeek?.join(', ') || 'Any day' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Time</p>
                  <p class="font-medium text-slate-800">{{ s.postingTime }} · {{ s.timezone }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Start date</p>
                  <p class="font-medium text-slate-800">{{ s.startDate | date: 'mediumDate' }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">End date</p>
                  <p class="font-medium text-slate-800">
                    {{ s.endDate ? (s.endDate | date: 'mediumDate') : 'No end date' }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Daily limit</p>
                  <p class="font-medium text-slate-800">{{ s.dailyPostLimit || 'None' }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Completion</p>
                  <p class="font-medium text-slate-800">{{ completion(s) }}%</p>
                </div>
              </div>
            </div>

            @if (conflicts().length) {
              <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h2 class="font-semibold text-amber-900">Conflict warnings</h2>
                <div class="mt-3 space-y-2">
                  @for (conflict of conflicts(); track conflict.id) {
                    <div class="rounded-lg bg-white/80 p-3 text-sm">
                      <p class="font-medium text-slate-900">{{ conflict.title }}</p>
                      <p class="text-slate-600">{{ conflict.detail }}</p>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                          (click)="keepBoth()"
                        >
                          Keep Both
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                          (click)="changeTime()"
                        >
                          Change Time
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                          (click)="moveConflictToBest(conflict.postIds[0])"
                        >
                          Move to Next Best Time
                        </button>
                        <button
                          type="button"
                          class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                        >
                          View Conflicting Posts
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-slate-900">Linked posts</h2>
                  <p class="text-xs text-slate-500">
                    Table and timeline view for all posts in this schedule.
                  </p>
                </div>
                <select
                  [(ngModel)]="platformFilter"
                  class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="all">All platforms</option>
                  @for (platform of platforms; track platform) {
                    <option [value]="platform">{{ platformMeta[platform].label }}</option>
                  }
                </select>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full min-w-[900px] text-left text-sm">
                  <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th class="px-3 py-3">Preview</th>
                      <th class="px-3 py-3">Caption</th>
                      <th class="px-3 py-3">Platform</th>
                      <th class="px-3 py-3">Scheduled</th>
                      <th class="px-3 py-3">Status</th>
                      <th class="px-3 py-3">Published</th>
                      <th class="px-3 py-3">Engagement</th>
                      <th class="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (post of filteredPosts(); track post.id) {
                      <tr class="hover:bg-slate-50">
                        <td class="px-3 py-3">
                          <button
                            type="button"
                            class="block h-14 w-20 overflow-hidden rounded-lg bg-slate-100"
                            (click)="selectedPost.set(post)"
                          >
                            @if (post.thumbnailUrl) {
                              <img
                                [src]="post.thumbnailUrl"
                                alt=""
                                class="h-full w-full object-cover"
                              />
                            }
                          </button>
                        </td>
                        <td class="max-w-xs px-3 py-3">
                          <p class="font-medium text-slate-900">{{ post.title }}</p>
                          <p class="line-clamp-2 text-xs text-slate-500">{{ post.caption }}</p>
                        </td>
                        <td class="px-3 py-3">
                          <span
                            class="rounded-full border px-2 py-1 text-xs font-bold"
                            [ngClass]="platformMeta[post.platform].tone"
                          >
                            {{ platformMeta[post.platform].icon }}
                            {{ platformMeta[post.platform].label }}
                          </span>
                        </td>
                        <td class="px-3 py-3 text-slate-600">
                          {{ post.scheduledAt | date: 'medium' }}
                        </td>
                        <td class="px-3 py-3">
                          <span
                            class="rounded-full px-2 py-1 text-xs font-medium"
                            [ngClass]="postStatusClass(post.status)"
                            >{{ postStatusLabel(post.status) }}</span
                          >
                        </td>
                        <td class="px-3 py-3 text-slate-600">
                          {{ post.publishedAt ? (post.publishedAt | date: 'medium') : '—' }}
                        </td>
                        <td class="px-3 py-3 text-slate-600">
                          {{ engagement(post) | number }} total
                        </td>
                        <td class="px-3 py-3 text-right">
                          <div class="flex flex-wrap justify-end gap-1">
                            @if (canQuickAction(post)) {
                              <button
                                type="button"
                                class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                                (click)="quick(post, 'tonight')"
                              >
                                Post Tonight
                              </button>
                              <button
                                type="button"
                                class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                                (click)="quick(post, 'tomorrow')"
                              >
                                Move to Tomorrow
                              </button>
                              <button
                                type="button"
                                class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                                (click)="quick(post, 'best')"
                              >
                                Next Best Time
                              </button>
                              @if (post.status === 'failed') {
                                <button
                                  type="button"
                                  class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                                  (click)="quick(post, 'retry')"
                                >
                                  Retry Post
                                </button>
                              }
                              <button
                                type="button"
                                class="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                                (click)="skip(post)"
                              >
                                Skip Post
                              </button>
                            }
                            <button
                              type="button"
                              class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                              (click)="selectedPost.set(post)"
                            >
                              Preview
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside class="space-y-4">
            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <h2 class="font-semibold text-slate-900">Schedule Health Score</h2>
              <div class="mt-4 flex items-end gap-3">
                <p class="text-4xl font-bold" [ngClass]="healthClass(healthScore(s))">
                  {{ healthScore(s) }}
                </p>
                <p class="pb-1 text-sm font-medium text-slate-600">{{ healthLabel(s) }}</p>
              </div>
              <div class="mt-4 h-2 rounded-full bg-slate-100">
                <div class="h-2 rounded-full bg-indigo-600" [style.width.%]="healthScore(s)"></div>
              </div>
              <ul class="mt-4 space-y-2 text-sm text-slate-600">
                @for (suggestion of healthSuggestions(s); track suggestion) {
                  <li class="rounded-lg bg-slate-50 px-3 py-2">{{ suggestion }}</li>
                }
              </ul>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="font-semibold text-slate-900">Best Time Suggestion</h2>
                <button
                  type="button"
                  class="text-xs font-medium text-indigo-600 hover:underline"
                  (click)="applyBestTime(s)"
                >
                  Apply Best Time
                </button>
              </div>
              @if (bestTimes().length) {
                <div class="space-y-2">
                  @for (item of bestTimes(); track item.platform) {
                    <div class="rounded-lg bg-slate-50 p-3 text-sm">
                      <p class="font-medium text-slate-800">
                        {{ platformMeta[item.platform].label }}: {{ item.window }}
                      </p>
                      <p class="text-xs text-slate-500">{{ item.confidence }}</p>
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-slate-500">
                  No analytics exists yet. Suggestions will appear after posts collect engagement.
                </p>
              }
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <h2 class="font-semibold text-slate-900">Mini calendar</h2>
              <p class="mt-1 text-xs text-slate-500">Drag a post here to reschedule into a day.</p>
              <div class="mt-4 grid grid-cols-2 gap-2">
                @for (day of calendarDays(); track day.date) {
                  <div
                    class="min-h-28 rounded-lg border border-slate-200 p-2"
                    (dragover)="$event.preventDefault()"
                    (drop)="dropOnDay(day.date)"
                  >
                    <p class="text-xs font-semibold text-slate-700">
                      {{ day.date | date: 'MMM d' }}
                    </p>
                    @for (post of day.posts; track post.id) {
                      <div
                        draggable="true"
                        class="mt-1 cursor-move rounded bg-slate-50 px-2 py-1 text-xs text-slate-600"
                        (dragstart)="dragPostId.set(post.id)"
                      >
                        {{ platformMeta[post.platform].icon }} {{ post.title | slice: 0 : 24 }}
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="rounded-lg border border-slate-200 bg-white p-5">
              <h2 class="font-semibold text-slate-900">Smart Insights</h2>
              <div class="mt-3 space-y-2">
                @for (insight of insights(); track insight.id) {
                  <p class="rounded-lg px-3 py-2 text-sm" [ngClass]="insightClass(insight.tone)">
                    {{ insight.text }}
                  </p>
                }
              </div>
            </div>
          </aside>
        </section>
      </div>

      @if (selectedPost(); as post) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          (click)="selectedPost.set(null)"
        >
          <div
            class="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-4 flex items-start justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {{ platformMeta[post.platform].label }} preview
                </p>
                <h3 class="text-lg font-semibold text-slate-900">{{ post.title }}</h3>
              </div>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600"
                (click)="selectedPost.set(null)"
              >
                ×
              </button>
            </div>
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div class="mb-3 flex items-center gap-2">
                <span
                  class="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold"
                  [ngClass]="platformMeta[post.platform].tone"
                >
                  {{ platformMeta[post.platform].icon }}
                </span>
                <div>
                  <p class="text-sm font-semibold text-slate-900">SocialHub Preview</p>
                  <p class="text-xs text-slate-500">{{ post.scheduledAt | date: 'medium' }}</p>
                </div>
              </div>
              <p class="whitespace-pre-line text-sm text-slate-700">
                {{ post.caption || '(missing caption)' }}
              </p>
              @if (post.thumbnailUrl) {
                <img
                  [src]="post.thumbnailUrl"
                  alt=""
                  class="mt-3 max-h-72 w-full rounded-lg object-cover"
                />
              }
              <p class="mt-3 text-xs text-slate-500">
                {{ post.hashtags.join(' ') }} · {{ post.cta }}
              </p>
            </div>
            <div class="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-xs text-slate-500">Likes</p>
                <p class="font-bold">{{ post.engagement.likes | number }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-xs text-slate-500">Comments</p>
                <p class="font-bold">{{ post.engagement.comments | number }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-xs text-slate-500">Shares</p>
                <p class="font-bold">{{ post.engagement.shares | number }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-2">
                <p class="text-xs text-slate-500">Views</p>
                <p class="font-bold">{{ post.engagement.views || 0 | number }}</p>
              </div>
            </div>
          </div>
        </div>
      }

      <app-schedule-editor
        [open]="editorOpen()"
        [schedule]="s"
        (cancel)="editorOpen.set(false)"
        (saved)="editorOpen.set(false)"
      />
    } @else {
      <div class="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 class="text-lg font-semibold text-slate-900">Schedule not found</h1>
        <a
          routerLink="/schedules"
          class="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline"
          >Back to Schedules</a
        >
      </div>
    }
  `,
})
export class ScheduleDetails implements OnInit {
  readonly id = input.required<string>();

  private readonly schedules = inject(SchedulesService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly platformMeta = PLATFORM_META;
  protected readonly platforms = SCHEDULE_PLATFORMS;
  protected platformFilter: 'all' | SchedulePlatform = 'all';
  protected readonly selectedPost = signal<SchedulePost | null>(null);
  protected readonly editorOpen = signal(false);
  protected readonly moreOpen = signal(false);
  protected readonly dragPostId = signal<string | null>(null);

  protected readonly schedule = computed(() => this.schedules.schedule(this.id()));
  protected filteredPosts(): SchedulePost[] {
    const schedule = this.schedule();
    if (!schedule) {
      return [];
    }
    return schedule.posts.filter(
      (post) => this.platformFilter === 'all' || post.platform === this.platformFilter,
    );
  }
  protected readonly bestTimes = computed(() => {
    const schedule = this.schedule();
    return schedule ? this.schedules.bestTimes(schedule) : [];
  });
  protected readonly conflicts = computed(() => {
    const schedule = this.schedule();
    return schedule ? this.schedules.conflicts(schedule) : [];
  });
  protected readonly insights = computed(() => {
    const schedule = this.schedule();
    return schedule ? this.schedules.insights(schedule) : [];
  });
  protected readonly calendarDays = computed(() => {
    const schedule = this.schedule();
    if (!schedule) {
      return [];
    }
    const groups = new Map<string, SchedulePost[]>();
    for (const post of schedule.posts) {
      const day = post.scheduledAt.slice(0, 10);
      groups.set(day, [...(groups.get(day) ?? []), post]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 8)
      .map(([date, posts]) => ({ date, posts }));
  });

  ngOnInit(): void {
    this.schedules.load();
  }

  protected edit(): void {
    this.editorOpen.set(true);
  }

  protected overviewCards(schedule: Schedule) {
    const successRate = schedule.totalPosts
      ? Math.round(
          (schedule.postedCount / (schedule.postedCount + schedule.failedCount || 1)) * 100,
        )
      : 0;
    return [
      { label: 'Total Posts', value: schedule.totalPosts, hint: 'Linked content' },
      { label: 'Posted', value: schedule.postedCount, hint: 'Published' },
      { label: 'Pending', value: schedule.pendingCount, hint: 'Not posted yet' },
      { label: 'Failed', value: schedule.failedCount, hint: 'Needs retry' },
      { label: 'Success Rate', value: `${successRate}%`, hint: 'Posted vs failed' },
      {
        label: 'Next Scheduled Post',
        value: schedule.nextPostAt ? new Date(schedule.nextPostAt).toLocaleDateString() : 'None',
        hint: schedule.nextPostAt
          ? new Date(schedule.nextPostAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'No upcoming post',
      },
      {
        label: 'Health Score',
        value: this.healthScore(schedule),
        hint: this.healthLabel(schedule),
      },
    ];
  }

  protected completion(schedule: Schedule): number {
    return this.schedules.completion(schedule);
  }

  protected healthScore(schedule: Schedule): number {
    return this.schedules.healthScore(schedule);
  }

  protected healthLabel(schedule: Schedule): string {
    return this.schedules.healthLabel(this.healthScore(schedule));
  }

  protected healthSuggestions(schedule: Schedule): string[] {
    return this.schedules.healthSuggestions(schedule);
  }

  protected togglePause(schedule: Schedule): void {
    this.schedules.togglePause(schedule.id);
    this.notifications.success(
      schedule.status === 'paused' ? 'Schedule resumed' : 'Schedule paused',
    );
  }

  protected applyBestTime(schedule: Schedule): void {
    this.schedules.applyBestTime(schedule.id);
    this.notifications.success('Best time applied');
  }

  protected async delete(schedule: Schedule): Promise<void> {
    const ok = await this.confirm.ask(`Delete ${schedule.name}?`, 'Delete schedule', 'Delete');
    if (!ok) {
      return;
    }
    this.schedules.delete(schedule.id);
    this.notifications.success('Schedule deleted');
  }

  protected async skip(post: SchedulePost): Promise<void> {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    const ok = await this.confirm.ask(`Skip ${post.title}?`, 'Skip post', 'Skip');
    if (!ok) {
      return;
    }
    this.schedules.quickReschedule(schedule.id, post.id, 'skip');
    this.notifications.info('Post skipped');
  }

  protected quick(post: SchedulePost, action: 'tonight' | 'tomorrow' | 'best' | 'retry'): void {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    this.schedules.quickReschedule(schedule.id, post.id, action);
    this.notifications.success('Post rescheduled');
  }

  protected dropOnDay(date: string): void {
    const schedule = this.schedule();
    const postId = this.dragPostId();
    this.dragPostId.set(null);
    if (!schedule || !postId) {
      return;
    }
    this.schedules.reschedulePostToDate(schedule.id, postId, date);
    this.notifications.info(`Moved post to ${date}.`);
  }

  protected moveConflictToBest(postId: string): void {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    this.schedules.quickReschedule(schedule.id, postId, 'best');
    this.notifications.success('Conflict moved to next best time');
  }

  protected keepBoth(): void {
    this.notifications.info('Conflict kept as-is.');
  }

  protected changeTime(): void {
    this.editorOpen.set(true);
  }

  protected saveAsTemplate(): void {
    this.notifications.success('Schedule saved as a template for this session.');
  }

  protected canQuickAction(post: SchedulePost): boolean {
    return ['scheduled', 'not_posted', 'failed', 'paused'].includes(post.status);
  }

  protected engagement(post: SchedulePost): number {
    return (
      post.engagement.likes +
      post.engagement.comments +
      post.engagement.shares +
      (post.engagement.views ?? 0)
    );
  }

  protected platformLabels(platforms: SchedulePlatform[]): string {
    return platforms.map((platform) => PLATFORM_META[platform].label).join(', ');
  }

  protected postStatusLabel(status: SchedulePostStatus): string {
    return status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected postStatusClass(status: SchedulePostStatus): string {
    switch (status) {
      case 'posted':
        return 'bg-emerald-50 text-emerald-700';
      case 'scheduled':
        return 'bg-amber-50 text-amber-700';
      case 'failed':
      case 'not_posted':
        return 'bg-red-50 text-red-700';
      case 'draft':
      case 'paused':
        return 'bg-slate-100 text-slate-600';
    }
  }

  protected statusClass(status: Schedule['status']): string {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700';
      case 'paused':
        return 'bg-slate-100 text-slate-600';
      case 'draft':
        return 'bg-amber-50 text-amber-700';
      case 'completed':
        return 'bg-indigo-50 text-indigo-700';
    }
  }

  protected healthClass(score: number): string {
    if (score >= 90) return 'text-emerald-700';
    if (score >= 75) return 'text-lime-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-red-700';
  }

  protected insightClass(tone: string): string {
    switch (tone) {
      case 'good':
        return 'bg-emerald-50 text-emerald-700';
      case 'warning':
        return 'bg-amber-50 text-amber-700';
      case 'critical':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-indigo-50 text-indigo-700';
    }
  }

  protected title(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
