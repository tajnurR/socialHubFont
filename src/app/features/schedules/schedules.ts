import { DatePipe, DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { ScheduleEditor } from './schedule-editor';
import {
  PLATFORM_META,
  SCHEDULE_PLATFORMS,
  SCHEDULE_STATUSES,
  SCHEDULE_TYPES,
  Schedule,
  ScheduleFilters,
  SchedulePlatform,
  ScheduleStatus,
  ScheduleType,
  ScheduleView,
} from './schedule.model';
import { SchedulesService } from './schedules.service';

@Component({
  selector: 'app-schedules',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    NgClass,
    NgTemplateOutlet,
    PageHeader,
    ScheduleEditor,
  ],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <app-page-header
          title="Schedules"
          subtitle="Plan, organise and track your social media content."
        />
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            (click)="setView(view() === 'calendar' ? 'cards' : 'calendar')"
          >
            Calendar View
          </button>
          <button
            type="button"
            class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            (click)="create()"
          >
            + Create Schedule
          </button>
        </div>
      </div>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-6">
        @for (card of summaryCards(); track card.label) {
          <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p class="text-xs font-medium text-slate-500">{{ card.label }}</p>
            <p class="mt-2 text-2xl font-bold text-slate-900">{{ card.value | number }}</p>
            <p class="mt-1 text-xs text-slate-400">{{ card.hint }}</p>
          </div>
        }
      </section>

      <section class="rounded-lg border border-slate-200 bg-white p-4">
        <div
          class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_160px_220px_180px_120px]"
        >
          <label>
            <span class="text-xs font-medium text-slate-500">Search</span>
            <input
              [(ngModel)]="filters.search"
              type="search"
              placeholder="Search by schedule name"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Platform</span>
            <select
              [(ngModel)]="filters.platform"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              @for (platform of platforms; track platform) {
                <option [value]="platform">{{ platformMeta[platform].label }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Status</span>
            <select
              [(ngModel)]="filters.status"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              @for (status of statuses; track status) {
                <option [value]="status">{{ title(status) }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Frequency</span>
            <select
              [(ngModel)]="filters.frequency"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              @for (type of types; track type) {
                <option [value]="type">{{ title(type) }}</option>
              }
            </select>
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label>
              <span class="text-xs font-medium text-slate-500">From</span>
              <input
                [(ngModel)]="filters.from"
                type="date"
                class="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
            </label>
            <label>
              <span class="text-xs font-medium text-slate-500">To</span>
              <input
                [(ngModel)]="filters.to"
                type="date"
                class="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
              />
            </label>
          </div>
          <label>
            <span class="text-xs font-medium text-slate-500">Sort</span>
            <select
              [(ngModel)]="filters.sort"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="nextPost">Next Post</option>
              <option value="mostPosts">Most Posts</option>
              <option value="completionRate">Completion Rate</option>
            </select>
          </label>
          <div class="flex items-end gap-1">
            <button
              type="button"
              class="h-10 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              (click)="setView(view() === 'table' ? 'cards' : 'table')"
            >
              {{ view() === 'table' ? 'Cards' : 'Table' }}
            </button>
          </div>
        </div>
      </section>

      @if (loading()) {
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-64 animate-pulse rounded-lg bg-slate-100"></div>
          }
        </div>
      } @else if (filteredSchedules().length === 0) {
        <section
          class="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
        >
          <h3 class="text-lg font-semibold text-slate-900">No schedules created yet.</h3>
          <p class="mt-2 text-sm text-slate-500">
            Create a reusable content plan to organize posts by campaign, platform, and cadence.
          </p>
          <button
            type="button"
            class="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            (click)="create()"
          >
            Create Your First Schedule
          </button>
        </section>
      } @else if (view() === 'calendar') {
        <section class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="font-semibold text-slate-800">Calendar</h3>
            <p class="text-xs text-slate-500">Posts grouped by scheduled date.</p>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            @for (day of calendarDays(); track day.date) {
              <div class="min-h-40 rounded-lg border border-slate-200 p-3">
                <p class="text-sm font-semibold text-slate-800">
                  {{ day.date | date: 'EEE, MMM d' }}
                </p>
                <div class="mt-3 space-y-2">
                  @for (item of day.items; track item.post.id) {
                    <a
                      [routerLink]="['/schedules', item.schedule.id]"
                      class="block rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs hover:border-indigo-200 hover:bg-indigo-50"
                    >
                      <span class="font-medium text-slate-800">{{ item.post.title }}</span>
                      <span class="mt-1 flex items-center gap-1 text-slate-500">
                        <span>{{ platformMeta[item.post.platform].icon }}</span>
                        {{ item.post.scheduledAt | date: 'shortTime' }}
                      </span>
                    </a>
                  } @empty {
                    <p class="text-xs text-slate-400">No posts</p>
                  }
                </div>
              </div>
            }
          </div>
        </section>
      } @else if (view() === 'table') {
        <section class="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Schedule</th>
                <th class="px-3 py-3">Platforms</th>
                <th class="px-3 py-3">Frequency</th>
                <th class="px-3 py-3">Progress</th>
                <th class="px-3 py-3">Health</th>
                <th class="px-3 py-3">Next Post</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (schedule of filteredSchedules(); track schedule.id) {
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <span
                        class="h-8 w-1.5 rounded-full"
                        [style.background]="schedule.color"
                      ></span>
                      <div>
                        <p class="font-medium text-slate-900">{{ schedule.name }}</p>
                        <p class="text-xs text-slate-500">{{ schedule.description }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-3">
                    <ng-container
                      [ngTemplateOutlet]="platformIcons"
                      [ngTemplateOutletContext]="{ $implicit: schedule.platforms }"
                    />
                  </td>
                  <td class="px-3 py-3 text-slate-600">
                    {{ title(schedule.scheduleType) }} · {{ time12(schedule.postingTime) }}
                  </td>
                  <td class="px-3 py-3">
                    <ng-container
                      [ngTemplateOutlet]="progress"
                      [ngTemplateOutletContext]="{ $implicit: schedule }"
                    />
                  </td>
                  <td class="px-3 py-3">
                    <ng-container
                      [ngTemplateOutlet]="health"
                      [ngTemplateOutletContext]="{ $implicit: schedule }"
                    />
                  </td>
                  <td class="px-3 py-3 text-slate-600">
                    {{ schedule.nextPostAt ? (schedule.nextPostAt | date: 'short') : 'None' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <ng-container
                      [ngTemplateOutlet]="actions"
                      [ngTemplateOutletContext]="{ $implicit: schedule }"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      } @else {
        <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
          @for (schedule of filteredSchedules(); track schedule.id) {
            <article
              class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="h-3 w-3 rounded-full" [style.background]="schedule.color"></span>
                    <h3 class="truncate text-lg font-semibold text-slate-900">
                      {{ schedule.name }}
                    </h3>
                  </div>
                  <p class="mt-1 line-clamp-2 text-sm text-slate-500">{{ schedule.description }}</p>
                </div>
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-medium"
                  [ngClass]="statusClass(schedule.status)"
                >
                  {{ title(schedule.status) }}
                </span>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <ng-container
                  [ngTemplateOutlet]="platformIcons"
                  [ngTemplateOutletContext]="{ $implicit: schedule.platforms }"
                />
              </div>

              <div class="mt-4 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div>
                  <p class="text-xs text-slate-400">Frequency</p>
                  <p class="font-medium text-slate-700">{{ title(schedule.scheduleType) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Time</p>
                  <p class="font-medium text-slate-700">{{ time12(schedule.postingTime) }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Timezone</p>
                  <p class="font-medium text-slate-700">{{ schedule.timezone }}</p>
                </div>
                <div>
                  <p class="text-xs text-slate-400">Next post</p>
                  <p class="font-medium text-slate-700">
                    {{
                      schedule.nextPostAt ? (schedule.nextPostAt | date: 'MMM d, h:mm a') : 'None'
                    }}
                  </p>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                <div>
                  <p class="text-lg font-bold text-slate-900">{{ schedule.totalPosts }}</p>
                  <p class="text-xs text-slate-500">Total</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-emerald-700">{{ schedule.postedCount }}</p>
                  <p class="text-xs text-slate-500">Posted</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-amber-700">{{ schedule.pendingCount }}</p>
                  <p class="text-xs text-slate-500">Pending</p>
                </div>
                <div>
                  <p class="text-lg font-bold text-red-700">{{ schedule.failedCount }}</p>
                  <p class="text-xs text-slate-500">Failed</p>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between gap-4">
                <div class="flex-1">
                  <ng-container
                    [ngTemplateOutlet]="progress"
                    [ngTemplateOutletContext]="{ $implicit: schedule }"
                  />
                </div>
                <ng-container
                  [ngTemplateOutlet]="health"
                  [ngTemplateOutletContext]="{ $implicit: schedule }"
                />
              </div>

              <div class="mt-4 flex flex-wrap justify-end gap-2">
                <ng-container
                  [ngTemplateOutlet]="actions"
                  [ngTemplateOutletContext]="{ $implicit: schedule }"
                />
              </div>
            </article>
          }
        </section>
      }
    </div>

    <ng-template #platformIcons let-platforms>
      <div class="flex flex-wrap gap-2">
        @for (platform of platforms; track platform) {
          <span
            class="inline-flex min-h-8 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
            [ngClass]="platformTone(platform)"
            [title]="platformLabel(platform)"
          >
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px] font-bold">
              {{ platformIcon(platform) }}
            </span>
            <span>{{ platformLabel(platform) }}</span>
          </span>
        }
      </div>
    </ng-template>

    <ng-template #progress let-schedule>
      <div>
        <div class="mb-1 flex justify-between text-xs">
          <span class="text-slate-500">Completion</span>
          <span class="font-medium text-slate-700">{{ completion(schedule) }}%</span>
        </div>
        <div class="h-2 rounded-full bg-slate-100">
          <div class="h-2 rounded-full bg-indigo-600" [style.width.%]="completion(schedule)"></div>
        </div>
      </div>
    </ng-template>

    <ng-template #health let-schedule>
      <div class="whitespace-nowrap rounded-lg bg-slate-50 px-3 py-2 text-right">
        <p class="text-xs text-slate-400">Health</p>
        <p class="text-sm font-bold" [ngClass]="healthClass(healthScore(schedule))">
          {{ healthScore(schedule) }} · {{ healthLabel(schedule) }}
        </p>
      </div>
    </ng-template>

    <ng-template #actions let-schedule>
      <div class="flex flex-wrap justify-end gap-1.5">
        <a
          [routerLink]="['/schedules', schedule.id]"
          class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          View
        </a>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          (click)="edit(schedule)"
        >
          Edit
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          (click)="togglePause(schedule)"
        >
          {{ schedule.status === 'paused' ? 'Resume' : 'Pause' }}
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          (click)="duplicate(schedule)"
        >
          Duplicate
        </button>
        <button
          type="button"
          class="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          (click)="delete(schedule)"
        >
          Delete
        </button>
      </div>
    </ng-template>

    <app-schedule-editor
      [open]="editorOpen()"
      [schedule]="editingSchedule()"
      (cancel)="closeEditor()"
      (saved)="onSaved()"
    />
  `,
})
export class Schedules implements OnInit {
  private readonly schedulesService = inject(SchedulesService);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = signal(true);
  protected readonly view = signal<ScheduleView>('cards');
  protected readonly editorOpen = signal(false);
  protected readonly editingSchedule = signal<Schedule | null>(null);
  protected readonly platformMeta = PLATFORM_META;
  protected readonly platforms = SCHEDULE_PLATFORMS;
  protected readonly statuses = SCHEDULE_STATUSES;
  protected readonly types = SCHEDULE_TYPES;

  protected readonly filters: ScheduleFilters = {
    search: '',
    platform: 'all',
    status: 'all',
    frequency: 'all',
    from: '',
    to: '',
    sort: 'newest',
  };

  protected readonly summaryCards = computed(() => {
    const summary = this.schedulesService.summary();
    return [
      { label: 'Total Schedules', value: summary.totalSchedules, hint: 'All plans' },
      { label: 'Active Schedules', value: summary.activeSchedules, hint: 'Currently running' },
      { label: 'Total Linked Posts', value: summary.totalLinkedPosts, hint: 'Across schedules' },
      { label: 'Posted This Week', value: summary.postedThisWeek, hint: 'Published recently' },
      { label: 'Pending / Not Posted', value: summary.pendingNotPosted, hint: 'Needs monitoring' },
      { label: 'Failed Posts', value: summary.failedPosts, hint: 'Needs action' },
    ];
  });

  protected filteredSchedules(): Schedule[] {
    const search = this.filters.search.trim().toLowerCase();
    const from = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const to = this.filters.to ? new Date(`${this.filters.to}T23:59:59`).getTime() : null;
    return [...this.schedulesService.schedules()]
      .filter((schedule) => !search || schedule.name.toLowerCase().includes(search))
      .filter(
        (schedule) =>
          this.filters.platform === 'all' ||
          schedule.platforms.includes(this.filters.platform as SchedulePlatform),
      )
      .filter(
        (schedule) =>
          this.filters.status === 'all' ||
          schedule.status === (this.filters.status as ScheduleStatus),
      )
      .filter(
        (schedule) =>
          this.filters.frequency === 'all' ||
          schedule.scheduleType === (this.filters.frequency as ScheduleType),
      )
      .filter((schedule) => {
        const candidate = new Date(schedule.nextPostAt ?? schedule.startDate).getTime();
        return (from == null || candidate >= from) && (to == null || candidate <= to);
      })
      .sort((a, b) => this.compareSchedules(a, b));
  }

  protected calendarDays() {
    const groups = new Map<string, { schedule: Schedule; post: Schedule['posts'][number] }[]>();
    for (const schedule of this.filteredSchedules()) {
      for (const post of schedule.posts) {
        const key = post.scheduledAt.slice(0, 10);
        groups.set(key, [...(groups.get(key) ?? []), { schedule, post }]);
      }
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 16)
      .map(([date, items]) => ({ date, items }));
  }

  ngOnInit(): void {
    this.schedulesService.load();
    setTimeout(() => this.loading.set(false), 250);
  }

  protected setView(view: ScheduleView): void {
    this.view.set(view);
  }

  protected create(): void {
    this.editingSchedule.set(null);
    this.editorOpen.set(true);
  }

  protected edit(schedule: Schedule): void {
    this.editingSchedule.set(schedule);
    this.editorOpen.set(true);
  }

  protected closeEditor(): void {
    this.editorOpen.set(false);
    this.editingSchedule.set(null);
  }

  protected onSaved(): void {
    this.closeEditor();
  }

  protected togglePause(schedule: Schedule): void {
    this.schedulesService.togglePause(schedule.id);
    this.notifications.success(
      schedule.status === 'paused' ? 'Schedule resumed' : 'Schedule paused',
    );
  }

  protected duplicate(schedule: Schedule): void {
    const copy = this.schedulesService.duplicate(schedule.id);
    if (copy) {
      this.notifications.success('Schedule duplicated');
    }
  }

  protected async delete(schedule: Schedule): Promise<void> {
    const confirmed = await this.confirm.ask(
      `Delete ${schedule.name}? Linked posts will be removed from this schedule.`,
      'Delete schedule',
      'Delete',
    );
    if (!confirmed) {
      return;
    }
    this.schedulesService.delete(schedule.id);
    this.notifications.success('Schedule deleted');
  }

  protected completion(schedule: Schedule): number {
    return this.schedulesService.completion(schedule);
  }

  protected healthScore(schedule: Schedule): number {
    return this.schedulesService.healthScore(schedule);
  }

  protected healthLabel(schedule: Schedule): string {
    return this.schedulesService.healthLabel(this.healthScore(schedule));
  }

  protected healthClass(score: number): string {
    if (score >= 90) return 'text-emerald-700';
    if (score >= 75) return 'text-lime-700';
    if (score >= 50) return 'text-amber-700';
    return 'text-red-700';
  }

  protected statusClass(status: ScheduleStatus): string {
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

  protected title(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected platformIcon(platform: string): string {
    return PLATFORM_META[platform as SchedulePlatform]?.icon ?? '?';
  }

  protected platformLabel(platform: string): string {
    return PLATFORM_META[platform as SchedulePlatform]?.label ?? platform;
  }

  protected platformTone(platform: string): string {
    return PLATFORM_META[platform as SchedulePlatform]?.tone ?? 'border-slate-200 text-slate-600';
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

  private compareSchedules(a: Schedule, b: Schedule): number {
    switch (this.filters.sort) {
      case 'nextPost':
        return (
          new Date(a.nextPostAt ?? '9999-12-31').getTime() -
          new Date(b.nextPostAt ?? '9999-12-31').getTime()
        );
      case 'mostPosts':
        return b.totalPosts - a.totalPosts;
      case 'completionRate':
        return this.completion(b) - this.completion(a);
      case 'newest':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  }
}
