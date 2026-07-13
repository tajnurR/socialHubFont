import { DatePipe, DecimalPipe, NgClass, SlicePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
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
import { MediaService } from '../media/media.service';

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
                  <p class="text-xs text-slate-400">Platform</p>
                  <p class="font-medium text-slate-800">{{ platformLabels(s.platforms) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Posting accounts</p>
                  <p class="font-medium text-slate-800">Set on each post</p>
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
                  <p class="font-medium text-slate-800">{{ time12(s.postingTime) }} · {{ s.timezone }}</p>
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
                @if (s.scheduleType === 'custom') {
                  <div>
                    <p class="text-xs text-slate-400">Interval</p>
                    <p class="font-medium text-slate-800">
                      Every {{ s.customIntervalHours || 1 }} hour(s)
                    </p>
                  </div>
                }
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
                    Waiting posts only. Published posts stay in post history.
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

              <div class="grid gap-3 xl:hidden">
                @for (post of filteredPosts(); track post.id) {
                  <article class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div class="flex gap-3">
                      <button
                        type="button"
                        class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100"
                        (click)="selectedPost.set(post)"
                      >
                        @if (previewUrl(post)) {
                          <img [src]="previewUrl(post) || ''" alt="" class="h-full w-full object-cover" />
                        } @else {
                          <span class="flex h-full w-full items-center justify-center text-xs text-slate-400">{{ emptyPreviewLabel(post) }}</span>
                        }
                      </button>
                      <div class="min-w-0 flex-1">
                        <p class="truncate font-medium text-slate-900">{{ post.title }}</p>
                        <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ post.caption }}</p>
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          <span class="rounded-full border px-2 py-1 text-[11px] font-bold" [ngClass]="platformMeta[post.platform].tone">
                            {{ platformMeta[post.platform].icon }} {{ platformMeta[post.platform].label }}
                          </span>
                          <span class="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                            {{ accountLabel(post) }}
                          </span>
                          <span class="rounded-full px-2 py-1 text-[11px] font-medium" [ngClass]="postStatusClass(post.status)">
                            {{ postStatusLabel(post.status) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
                      <div>
                        <p class="text-xs text-slate-500">Scheduled</p>
                        <p class="text-sm font-medium text-slate-700">{{ scheduledDisplay(post) }}</p>
                      </div>
                      <label>
                        <span class="text-xs text-slate-500">Custom date/time</span>
                        <input
                          type="datetime-local"
                          class="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                          [ngModel]="customDateTimeValue(post)"
                          (ngModelChange)="customTimes[post.id] = $event"
                        />
                      </label>
                      <div class="flex flex-wrap gap-1.5 sm:justify-end">
                        <button type="button" class="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700" (click)="setCustomTime(post)">Save</button>
                        @if (post.scheduledAtOverride || post.timeOverride) {
                          <button type="button" class="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700" (click)="clearCustomTime(post)">Default</button>
                        }
                        <button type="button" class="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700" (click)="selectedPost.set(post)">View</button>
                        <button type="button" class="rounded-md border border-red-100 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600" (click)="removeFromSchedule(post)">Remove</button>
                      </div>
                    </div>
                  </article>
                } @empty {
                  <p class="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
                    No posts are waiting for this schedule. Add draft posts from the Add Post list.
                  </p>
                }
              </div>

              <div class="hidden overflow-x-auto xl:block">
                <table class="w-full min-w-[820px] text-left text-sm">
                  <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th class="px-3 py-3">Preview</th>
                      <th class="px-3 py-3">Caption</th>
                      <th class="px-3 py-3">Platform / Account</th>
                      <th class="px-3 py-3">Scheduled</th>
                      <th class="px-3 py-3">Status</th>
                      <th class="px-3 py-3">Override</th>
                      <th class="w-32 px-3 py-3 text-right">Actions</th>
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
                            @if (previewUrl(post)) {
                              <img
                                [src]="previewUrl(post) || ''"
                                alt=""
                                class="h-full w-full object-cover"
                              />
                            } @else {
                              <span class="flex h-full w-full items-center justify-center text-[11px] text-slate-400">{{ emptyPreviewLabel(post) }}</span>
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
                          <p class="mt-1 text-xs text-slate-500">{{ accountLabel(post) }}</p>
                        </td>
                        <td class="px-3 py-3 text-slate-600">
                          {{ scheduledDisplay(post) }}
                        </td>
                        <td class="px-3 py-3">
                          <span
                            class="rounded-full px-2 py-1 text-xs font-medium"
                            [ngClass]="postStatusClass(post.status)"
                            >{{ postStatusLabel(post.status) }}</span
                          >
                        </td>
                        <td class="px-3 py-3">
                          <div class="flex items-center gap-2">
                            <input
                              type="datetime-local"
                              class="w-44 rounded-md border border-slate-300 px-2 py-1 text-xs"
                              [ngModel]="customDateTimeValue(post)"
                              (ngModelChange)="customTimes[post.id] = $event"
                              title="Custom posting date and time"
                            />
                            <button
                              type="button"
                              class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                              (click)="setCustomTime(post)"
                            >
                              Save
                            </button>
                            @if (post.scheduledAtOverride || post.timeOverride) {
                              <button
                                type="button"
                                class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                                (click)="clearCustomTime(post)"
                              >
                                Default
                              </button>
                            }
                          </div>
                        </td>
                        <td class="px-3 py-3 text-right">
                          <div class="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700"
                              (click)="selectedPost.set(post)"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              class="rounded-md border border-red-100 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              (click)="removeFromSchedule(post)"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7" class="px-3 py-8 text-center text-sm text-slate-400">
                          No posts are waiting for this schedule. Add draft posts from the Add Post list.
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
                      {{ day.label }}
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
                  <p class="text-xs text-slate-500">{{ scheduledDisplay(post) }}</p>
                </div>
              </div>
              <p class="whitespace-pre-line text-sm text-slate-700">
                {{ post.caption || '(missing caption)' }}
              </p>
              @if (previewUrl(post)) {
                <img
                  [src]="previewUrl(post) || ''"
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
export class ScheduleDetails implements OnInit, OnDestroy {
  readonly id = input.required<string>();

  private readonly schedules = inject(SchedulesService);
  private readonly mediaService = inject(MediaService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly platformMeta = PLATFORM_META;
  protected readonly platforms = SCHEDULE_PLATFORMS;
  protected platformFilter: 'all' | SchedulePlatform = 'all';
  protected readonly selectedPost = signal<SchedulePost | null>(null);
  protected readonly editorOpen = signal(false);
  protected readonly moreOpen = signal(false);
  protected readonly dragPostId = signal<string | null>(null);
  protected customTimes: Record<string, string> = {};
  protected readonly previewUrls = signal<Map<string, string>>(new Map());
  private readonly objectUrls = new Map<string, string>();

  protected readonly schedule = computed(() => this.schedules.schedule(this.id()));
  protected filteredPosts(): SchedulePost[] {
    const schedule = this.schedule();
    if (!schedule) {
      return [];
    }
    return schedule.posts.filter(
      (post) =>
        this.isWaitingPost(post) &&
        (this.platformFilter === 'all' || post.platform === this.platformFilter),
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
    for (const post of schedule.posts.filter((item) => this.isWaitingPost(item))) {
      const day = this.dateKeyInZone(post.scheduledAt, schedule.timezone);
      groups.set(day, [...(groups.get(day) ?? []), post]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 8)
      .map(([date, posts]) => ({
        date,
        label: this.dateLabelInZone(posts[0]?.scheduledAt ?? date, schedule.timezone),
        posts,
      }));
  });

  constructor() {
    effect(() => {
      this.syncPreviewUrls(this.filteredPosts());
    });
  }

  ngOnInit(): void {
    this.schedules.load();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
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
    return ['pending', 'scheduled', 'not_posted', 'failed', 'paused'].includes(post.status);
  }

  protected isWaitingPost(post: SchedulePost): boolean {
    return ['pending', 'scheduled', 'not_posted', 'failed', 'paused'].includes(post.status);
  }

  protected customDateTimeValue(post: SchedulePost): string {
    return this.customTimes[post.id] ?? this.toDateTimeLocal(post.scheduledAtOverride) ?? '';
  }

  protected scheduledDisplay(post: SchedulePost): string {
    const schedule = this.schedule();
    return this.dateTimeLabelInZone(post.scheduledAt, schedule?.timezone);
  }

  protected setCustomTime(post: SchedulePost): void {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    const raw = this.customTimes[post.id] ?? this.toDateTimeLocal(post.scheduledAtOverride) ?? '';
    const value = raw.trim() ? new Date(raw).toISOString() : null;
    this.schedules.setPostTimeOverride(schedule.id, post.id, value);
    this.notifications.success(value ? 'Custom posting date/time saved.' : 'Post will use the schedule default time.');
  }

  protected clearCustomTime(post: SchedulePost): void {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    delete this.customTimes[post.id];
    this.schedules.setPostTimeOverride(schedule.id, post.id, null);
    this.notifications.success('Post will use the schedule default time.');
  }

  protected async removeFromSchedule(post: SchedulePost): Promise<void> {
    const schedule = this.schedule();
    if (!schedule) {
      return;
    }
    const ok = await this.confirm.ask(`Remove ${post.title} from this schedule?`, 'Remove post', 'Remove');
    if (!ok) {
      return;
    }
    this.schedules.detachPost(schedule.id, post.id);
    this.notifications.success('Post removed from schedule.');
  }

  protected timeFromIso(value: string): string {
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  protected accountLabel(post: SchedulePost): string {
    return post.targetAccountName || (post.socialIntegrationId ? `Account #${post.socialIntegrationId}` : 'No account');
  }

  protected previewUrl(post: SchedulePost): string | null {
    return (post.mediaType === 'IMAGE' && post.mediaAssetId ? this.previewUrls().get(post.id) : null) ?? post.thumbnailUrl ?? null;
  }

  protected emptyPreviewLabel(post: SchedulePost): string {
    return post.platform === 'LINKEDIN' ? 'Text post' : 'No media';
  }

  protected time12(value: string): string {
    const [hourPart, minutePart = '00'] = value.split(':');
    const hour = Number(hourPart);
    if (!Number.isFinite(hour)) {
      return value;
    }
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutePart.padStart(2, '0')} ${suffix}`;
  }

  private dateTimeLabelInZone(value: string, timezone?: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return this.safeFormatter(timezone, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private dateLabelInZone(value: string, timezone?: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return this.safeFormatter(timezone, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private dateKeyInZone(value: string, timezone?: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value.slice(0, 10);
    }
    const parts = this.safeFormatter(timezone, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private safeFormatter(
    timezone: string | undefined,
    options: Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormat {
    const timeZone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      return new Intl.DateTimeFormat('en', { ...options, timeZone });
    } catch {
      return new Intl.DateTimeFormat('en', options);
    }
  }

  private toDateTimeLocal(value?: string): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

  private syncPreviewUrls(posts: SchedulePost[]): void {
    const currentIds = new Set(posts.map((post) => post.id));
    for (const [postId, url] of this.objectUrls) {
      if (!currentIds.has(postId)) {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(postId);
      }
    }
    this.previewUrls.set(new Map(this.objectUrls));
    for (const post of posts) {
      if (post.mediaType !== 'IMAGE' || !post.mediaAssetId || this.objectUrls.has(post.id)) {
        continue;
      }
      this.mediaService.download(post.mediaAssetId).subscribe({
        next: (blob) => {
          const existing = this.objectUrls.get(post.id);
          if (existing) {
            URL.revokeObjectURL(existing);
          }
          this.objectUrls.set(post.id, URL.createObjectURL(blob));
          this.previewUrls.set(new Map(this.objectUrls));
        },
        error: () => {
          // Keep the raw thumbnail fallback if the authenticated preview cannot load.
        },
      });
    }
  }

  private revokePreviewUrls(): void {
    for (const url of this.objectUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this.objectUrls.clear();
    this.previewUrls.set(new Map());
  }

  protected postStatusClass(status: SchedulePostStatus): string {
    switch (status) {
      case 'posted':
        return 'bg-emerald-50 text-emerald-700';
      case 'processing':
        return 'bg-sky-50 text-sky-700';
      case 'pending':
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
