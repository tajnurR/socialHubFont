import { NgClass } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import {
  DAYS_OF_WEEK,
  PLATFORM_META,
  SCHEDULE_COLORS,
  SCHEDULE_PLATFORMS,
  SCHEDULE_STATUSES,
  SCHEDULE_TYPES,
  Schedule,
  ScheduleDraft,
  SchedulePlatform,
  SchedulePost,
  ScheduleTemplate,
} from './schedule.model';
import { SchedulesService } from './schedules.service';

@Component({
  selector: 'app-schedule-editor',
  imports: [FormsModule, NgClass],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-slate-900/30" (click)="cancel.emit()"></div>
      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col overflow-hidden bg-slate-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Schedule editor"
      >
        <header class="border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {{ editing() ? 'Edit Schedule' : 'Create Schedule' }}
              </p>
              <h2 class="mt-1 text-xl font-bold text-slate-900">
                {{
                  editing() ? draft().name || 'Untitled schedule' : 'Build a reusable content plan'
                }}
              </h2>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              (click)="cancel.emit()"
            >
              Close
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section class="space-y-5">
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="md:col-span-2">
                    <span class="text-sm font-medium text-slate-700">Schedule name</span>
                    <input
                      [(ngModel)]="draft().name"
                      type="text"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      [class.border-red-300]="submitted() && !draft().name.trim()"
                      [class.border-slate-300]="!(submitted() && !draft().name.trim())"
                    />
                    @if (submitted() && !draft().name.trim()) {
                      <p class="mt-1 text-xs text-red-600">Schedule name is required.</p>
                    }
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Status</span>
                    <select
                      [(ngModel)]="draft().status"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      @for (status of statuses; track status) {
                        <option [value]="status">{{ title(status) }}</option>
                      }
                    </select>
                  </label>
                  <label class="md:col-span-3">
                    <span class="text-sm font-medium text-slate-700">Description</span>
                    <textarea
                      [(ngModel)]="draft().description"
                      rows="3"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    ></textarea>
                  </label>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-semibold text-slate-800">Platforms and cadence</h3>
                    <p class="text-xs text-slate-500">
                      Choose channels, frequency, and default posting time.
                    </p>
                  </div>
                  <div class="flex gap-2">
                    @for (color of colors; track color) {
                      <button
                        type="button"
                        class="h-6 w-6 rounded-full border border-white shadow ring-1"
                        [style.background]="color"
                        [class.ring-slate-900]="draft().color === color"
                        [class.ring-slate-200]="draft().color !== color"
                        [attr.aria-label]="'Use color ' + color"
                        (click)="update({ color })"
                      ></button>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                  @for (platform of platforms; track platform) {
                    <label
                      class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      [ngClass]="
                        isPlatformSelected(platform)
                          ? platformMeta[platform].tone
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      "
                    >
                      <input
                        type="checkbox"
                        class="sr-only"
                        [checked]="isPlatformSelected(platform)"
                        (change)="togglePlatform(platform)"
                      />
                      <span
                        class="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-xs font-bold"
                      >
                        {{ platformMeta[platform].icon }}
                      </span>
                      <span class="truncate">{{ platformMeta[platform].label }}</span>
                    </label>
                  }
                </div>
                @if (submitted() && draft().platforms.length === 0) {
                  <p class="mt-2 text-xs text-red-600">Select at least one platform.</p>
                }

                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label>
                    <span class="text-sm font-medium text-slate-700">Schedule type</span>
                    <select
                      [(ngModel)]="draft().scheduleType"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      @for (type of types; track type) {
                        <option [value]="type">{{ title(type) }}</option>
                      }
                    </select>
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Posting time</span>
                    <input
                      [(ngModel)]="draft().postingTime"
                      type="time"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Timezone</span>
                    <select
                      [(ngModel)]="draft().timezone"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option>Asia/Dhaka</option>
                      <option>UTC</option>
                      <option>America/New_York</option>
                      <option>Europe/London</option>
                      <option>Asia/Singapore</option>
                    </select>
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Daily post limit</span>
                    <input
                      [(ngModel)]="draft().dailyPostLimit"
                      type="number"
                      min="1"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  @for (day of days; track day) {
                    <button
                      type="button"
                      class="rounded-lg border px-3 py-1.5 text-sm font-medium"
                      [class.border-indigo-200]="draft().daysOfWeek.includes(day)"
                      [class.bg-indigo-50]="draft().daysOfWeek.includes(day)"
                      [class.text-indigo-700]="draft().daysOfWeek.includes(day)"
                      [class.border-slate-200]="!draft().daysOfWeek.includes(day)"
                      [class.text-slate-600]="!draft().daysOfWeek.includes(day)"
                      (click)="toggleDay(day)"
                    >
                      {{ day }}
                    </button>
                  }
                </div>

                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label>
                    <span class="text-sm font-medium text-slate-700">Start date</span>
                    <input
                      [(ngModel)]="draft().startDate"
                      type="date"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      [class.border-red-300]="submitted() && !draft().startDate"
                      [class.border-slate-300]="!(submitted() && !draft().startDate)"
                    />
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">End date</span>
                    <input
                      [(ngModel)]="draft().endDate"
                      type="date"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="font-semibold text-slate-800">Linked posts</h3>
                    <p class="text-xs text-slate-500">
                      Drag rows to change order and override individual post times.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    (click)="addPost()"
                  >
                    Create new post
                  </button>
                </div>

                <div class="space-y-2">
                  @for (post of draft().posts; track post.id; let i = $index) {
                    <div
                      draggable="true"
                      class="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[32px_minmax(0,1fr)_140px_130px_40px]"
                      (dragstart)="dragIndex.set(i)"
                      (dragover)="$event.preventDefault()"
                      (drop)="dropPost(i)"
                    >
                      <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400"
                        >☰</span
                      >
                      <label>
                        <span class="sr-only">Caption</span>
                        <input
                          [(ngModel)]="post.caption"
                          type="text"
                          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                          placeholder="Caption or title preview"
                        />
                      </label>
                      <select
                        [(ngModel)]="post.platform"
                        class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      >
                        @for (platform of draft().platforms; track platform) {
                          <option [value]="platform">{{ platformMeta[platform].label }}</option>
                        }
                      </select>
                      <input
                        [(ngModel)]="post.timeOverride"
                        type="time"
                        class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        title="Optional individual post time override"
                      />
                      <button
                        type="button"
                        class="rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                        (click)="removePost(post.id)"
                        aria-label="Remove post"
                      >
                        ×
                      </button>
                    </div>
                  } @empty {
                    <div
                      class="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500"
                    >
                      Link existing posts or create a new post to build the schedule.
                    </div>
                  }
                </div>
              </div>
            </section>

            <aside class="space-y-5">
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <h3 class="font-semibold text-slate-800">Best time suggestion</h3>
                @if (bestTimes().length) {
                  <div class="mt-3 space-y-2">
                    @for (suggestion of bestTimes(); track suggestion.platform) {
                      <div class="rounded-lg bg-slate-50 p-3 text-sm">
                        <p class="font-medium text-slate-800">
                          {{ platformMeta[suggestion.platform].label }}:
                          {{ suggestion.window }}
                        </p>
                        <p class="text-xs text-slate-500">{{ suggestion.confidence }}</p>
                      </div>
                    }
                  </div>
                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    (click)="applyBestTime()"
                  >
                    Apply Best Time
                  </button>
                } @else {
                  <p class="mt-2 text-sm text-slate-500">
                    No analytics yet. Suggestions appear after linked posts have engagement data.
                  </p>
                }
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <h3 class="font-semibold text-slate-800">Notifications</h3>
                <div class="mt-3 space-y-2 text-sm text-slate-700">
                  <label class="flex items-center gap-2">
                    <input [(ngModel)]="draft().notifications.publishSuccess" type="checkbox" />
                    Publish success
                  </label>
                  <label class="flex items-center gap-2">
                    <input [(ngModel)]="draft().notifications.failure" type="checkbox" />
                    Failure alerts
                  </label>
                  <label class="flex items-center gap-2">
                    <input [(ngModel)]="draft().notifications.nextPostReminder" type="checkbox" />
                    Next-post reminder
                  </label>
                </div>
              </div>

              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-3 flex items-center justify-between">
                  <h3 class="font-semibold text-slate-800">Templates</h3>
                  <button
                    type="button"
                    class="text-xs font-medium text-indigo-600 hover:underline"
                    (click)="saveTemplate()"
                  >
                    Save as Template
                  </button>
                </div>
                <div class="space-y-2">
                  @for (template of templates; track template.id) {
                    <div class="rounded-lg border border-slate-200 p-3">
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <p class="text-sm font-medium text-slate-800">{{ template.name }}</p>
                          <p class="text-xs text-slate-500">{{ template.description }}</p>
                        </div>
                        <span
                          class="mt-1 h-3 w-3 rounded-full"
                          [style.background]="template.color"
                        ></span>
                      </div>
                      <div class="mt-3 flex gap-2">
                        <button
                          type="button"
                          class="text-xs font-medium text-slate-600 hover:underline"
                          (click)="previewTemplate.set(template)"
                        >
                          Preview Template
                        </button>
                        <button
                          type="button"
                          class="text-xs font-medium text-indigo-600 hover:underline"
                          (click)="useTemplate(template)"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </aside>
          </div>
        </div>

        <footer class="border-t border-slate-200 bg-white px-6 py-4">
          <div class="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              (click)="cancel.emit()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              (click)="submit(true)"
            >
              Save Draft
            </button>
            <button
              type="button"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              (click)="submit(false)"
            >
              {{ editing() ? 'Save Schedule' : 'Create Schedule' }}
            </button>
          </div>
        </footer>
      </aside>

      @if (previewTemplate(); as template) {
        <div
          class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
          (click)="previewTemplate.set(null)"
        >
          <div
            class="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            (click)="$event.stopPropagation()"
          >
            <div class="mb-3 flex items-center justify-between">
              <h3 class="font-semibold text-slate-900">{{ template.name }}</h3>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-600"
                (click)="previewTemplate.set(null)"
              >
                ×
              </button>
            </div>
            <p class="text-sm text-slate-600">{{ template.description }}</p>
            <div class="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {{ title(template.scheduleType) }} · {{ template.daysOfWeek?.join(', ') }} ·
              {{ template.postingTime }}
            </div>
            <button
              type="button"
              class="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
              (click)="useTemplate(template); previewTemplate.set(null)"
            >
              Use Template
            </button>
          </div>
        </div>
      }
    }
  `,
})
export class ScheduleEditor {
  private readonly schedules = inject(SchedulesService);
  private readonly notifications = inject(NotificationService);

  readonly open = input(false);
  readonly schedule = input<Schedule | null>(null);
  readonly saved = output<Schedule>();
  readonly cancel = output<void>();

  protected readonly platforms = SCHEDULE_PLATFORMS;
  protected readonly statuses = SCHEDULE_STATUSES.filter((status) => status !== 'completed');
  protected readonly types = SCHEDULE_TYPES;
  protected readonly colors = SCHEDULE_COLORS;
  protected readonly days = DAYS_OF_WEEK;
  protected readonly platformMeta = PLATFORM_META;
  protected readonly templates = this.schedules.templates;
  protected readonly submitted = signal(false);
  protected readonly dragIndex = signal<number | null>(null);
  protected readonly previewTemplate = signal<ScheduleTemplate | null>(null);

  protected readonly draft = signal<ScheduleDraft>(this.schedules.emptyDraft());
  protected readonly editing = computed(() => !!this.schedule());
  protected readonly bestTimes = computed(() =>
    this.schedules.bestTimes({
      ...this.draft(),
      id: this.draft().id ?? 'draft',
      linkedPostIds: this.draft().posts.map((post) => post.id),
      totalPosts: this.draft().posts.length,
      postedCount: this.draft().posts.filter((post) => post.status === 'posted').length,
      pendingCount: this.draft().posts.filter(
        (post) => post.status !== 'posted' && post.status !== 'failed',
      ).length,
      failedCount: this.draft().posts.filter((post) => post.status === 'failed').length,
      nextPostAt: this.draft().posts[0]?.scheduledAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dailyPostLimit: this.draft().dailyPostLimit ?? undefined,
    }),
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const schedule = this.schedule();
      this.submitted.set(false);
      this.draft.set(
        schedule ? this.schedules.draftFromSchedule(schedule) : this.schedules.emptyDraft(),
      );
    });
  }

  protected update(partial: Partial<ScheduleDraft>): void {
    this.draft.update((draft) => ({ ...draft, ...partial }));
  }

  protected title(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected isPlatformSelected(platform: SchedulePlatform): boolean {
    return this.draft().platforms.includes(platform);
  }

  protected togglePlatform(platform: SchedulePlatform): void {
    this.draft.update((draft) => {
      const selected = draft.platforms.includes(platform)
        ? draft.platforms.filter((item) => item !== platform)
        : [...draft.platforms, platform];
      const fallback = selected[0] ?? platform;
      return {
        ...draft,
        platforms: selected,
        posts: draft.posts.map((post) => ({
          ...post,
          platform: selected.includes(post.platform) ? post.platform : fallback,
        })),
      };
    });
  }

  protected toggleDay(day: string): void {
    this.draft.update((draft) => ({
      ...draft,
      daysOfWeek: draft.daysOfWeek.includes(day)
        ? draft.daysOfWeek.filter((item) => item !== day)
        : [...draft.daysOfWeek, day],
    }));
  }

  protected addPost(): void {
    const draft = this.draft();
    const platform = draft.platforms[0] ?? 'FACEBOOK';
    const scheduledAt = new Date(`${draft.startDate}T${draft.postingTime}:00`).toISOString();
    this.draft.update((current) => ({
      ...current,
      posts: [
        ...current.posts,
        {
          id: crypto.randomUUID(),
          scheduleId: current.id ?? '',
          title: 'New post',
          caption: '',
          platform,
          scheduledAt,
          status: 'draft',
          hashtags: [],
          engagement: { likes: 0, comments: 0, shares: 0 },
          hasMedia: false,
          hasCaption: false,
        },
      ],
    }));
  }

  protected removePost(id: string): void {
    this.draft.update((draft) => ({
      ...draft,
      posts: draft.posts.filter((post) => post.id !== id),
    }));
  }

  protected dropPost(toIndex: number): void {
    const fromIndex = this.dragIndex();
    this.dragIndex.set(null);
    if (fromIndex == null || fromIndex === toIndex) {
      return;
    }
    this.draft.update((draft) => {
      const posts = [...draft.posts];
      const [post] = posts.splice(fromIndex, 1);
      posts.splice(toIndex, 0, post);
      return { ...draft, posts };
    });
  }

  protected applyBestTime(): void {
    const best = this.bestTimes()[0];
    if (!best) {
      return;
    }
    this.draft.update((draft) => ({ ...draft, postingTime: best.time }));
    this.notifications.info(`Applied ${best.window} as the default posting window.`);
  }

  protected useTemplate(template: ScheduleTemplate): void {
    this.draft.set(this.schedules.emptyDraft(template));
    this.notifications.info(`${template.name} template applied.`);
  }

  protected saveTemplate(): void {
    this.schedules.saveTemplate(this.draft());
    this.notifications.success('Custom template saved.');
  }

  protected submit(asDraft: boolean): void {
    this.submitted.set(true);
    const draft = this.draft();
    if (!draft.name.trim() || draft.platforms.length === 0 || !draft.startDate) {
      return;
    }
    const saved = this.schedules.save(draft, asDraft);
    this.notifications.success(asDraft ? 'Schedule draft saved' : 'Schedule saved');
    this.saved.emit(saved);
  }
}
