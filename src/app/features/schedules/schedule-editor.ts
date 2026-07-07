import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../core/services/notification.service';
import { SocialIntegration } from '../../shared/models/social-integration.model';
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

type EditorStep = 'basic' | 'time' | 'posts' | 'account' | 'review';

interface EditorStepConfig {
  id: EditorStep;
  title: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'app-schedule-editor',
  imports: [FormsModule],
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
              <p class="mt-1 text-sm text-slate-500">
                Step {{ activeStepIndex() + 1 }} of {{ steps.length }}:
                {{ activeStepConfig().title }}. {{ activeStepConfig().description }}.
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              (click)="cancel.emit()"
            >
              Close
            </button>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-2 md:grid-cols-5">
            @for (step of steps; track step.id; let i = $index) {
              <button
                type="button"
                class="flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition"
                [class.border-indigo-200]="stepState(step.id) === 'active'"
                [class.bg-indigo-50]="stepState(step.id) === 'active'"
                [class.border-emerald-200]="stepState(step.id) === 'done'"
                [class.bg-emerald-50]="stepState(step.id) === 'done'"
                [class.border-slate-200]="stepState(step.id) === 'upcoming'"
                [class.bg-white]="stepState(step.id) === 'upcoming'"
                (click)="goToStep(step.id)"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  [class.bg-indigo-600]="stepState(step.id) === 'active'"
                  [class.text-white]="stepState(step.id) === 'active'"
                  [class.bg-emerald-600]="stepState(step.id) === 'done'"
                  [class.bg-slate-100]="stepState(step.id) === 'upcoming'"
                  [class.text-slate-500]="stepState(step.id) === 'upcoming'"
                >
                  {{ stepState(step.id) === 'done' ? '✓' : step.icon }}
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-slate-900">
                    {{ step.title }}
                  </span>
                  <span class="block truncate text-xs text-slate-500">{{ step.description }}</span>
                </span>
              </button>
            }
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section class="space-y-5">
              @if (activeStep() === 'basic') {
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-5">
                  <h3 class="text-lg font-semibold text-slate-900">Basic Schedule Information</h3>
                  <p class="mt-1 text-sm text-slate-500">
                    Set the identity and lifecycle state of this schedule.
                  </p>
                </div>
                <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label class="md:col-span-2">
                    <span class="text-sm font-medium text-slate-700">Schedule name</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Give this schedule a clear name so you can identify it later.
                    </span>
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
                    <span class="mt-1 block text-xs text-slate-500">
                      Choose whether this schedule should publish, pause, or stay as a draft.
                    </span>
                    <select
                      [(ngModel)]="draft().status"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      @for (status of statuses; track status) {
                        <option [value]="status">{{ title(status) }}</option>
                      }
                    </select>
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Schedule type</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Choose how often this schedule should publish posts.
                    </span>
                    <select
                      [(ngModel)]="draft().scheduleType"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      @for (type of types; track type) {
                        <option [value]="type">{{ title(type) }}</option>
                      }
                    </select>
                  </label>
                  <label class="md:col-span-3">
                    <span class="text-sm font-medium text-slate-700">Description</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Add context for the campaign, product, or publishing plan.
                    </span>
                    <textarea
                      [(ngModel)]="draft().description"
                      rows="3"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    ></textarea>
                  </label>
                </div>
                <div class="mt-5">
                  <p class="mb-2 text-sm font-medium text-slate-700">Schedule color</p>
                  <p class="mb-3 text-xs text-slate-500">
                    Pick a color that makes this schedule easier to scan in lists and details.
                  </p>
                  <div class="flex flex-wrap gap-2">
                    @for (color of colors; track color) {
                      <button
                        type="button"
                        class="h-8 w-8 rounded-full border border-white shadow ring-1"
                        [style.background]="color"
                        [class.ring-slate-900]="draft().color === color"
                        [class.ring-slate-200]="draft().color !== color"
                        [attr.aria-label]="'Use color ' + color"
                        (click)="update({ color })"
                      ></button>
                    }
                  </div>
                </div>
              </div>
              }

              @if (activeStep() === 'time' || activeStep() === 'account') {
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">
                      {{ activeStep() === 'time' ? 'Posting Time Settings' : 'Social Media & Account Selection' }}
                    </h3>
                    <p class="mt-1 text-sm text-slate-500">
                      {{
                        activeStep() === 'time'
                          ? 'Define when posts should publish. Multiple posts are always published one by one.'
                          : 'Choose where these posts will be published and which account will publish them.'
                      }}
                    </p>
                  </div>
                </div>

                @if (activeStep() === 'account') {
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label>
                    <span class="text-sm font-medium text-slate-700">Social media platform</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Choose where these posts will be published.
                    </span>
                    <select
                      [(ngModel)]="draft().targetPlatform"
                      (ngModelChange)="onTargetPlatformChange($event)"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      [class.border-red-300]="submitted() && !draft().targetPlatform"
                      [class.border-slate-300]="!(submitted() && !draft().targetPlatform)"
                    >
                      @for (platform of platforms; track platform) {
                        <option [value]="platform">{{ platformMeta[platform].label }}</option>
                      }
                    </select>
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Posting account</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Select the account that will publish the scheduled posts.
                    </span>
                    <select
                      [(ngModel)]="draft().socialIntegrationId"
                      (ngModelChange)="applyScheduleTargetToPosts()"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      [class.border-red-300]="submitted() && !draft().socialIntegrationId"
                      [class.border-slate-300]="!(submitted() && !draft().socialIntegrationId)"
                    >
                      <option [ngValue]="undefined">Select connected account</option>
                      @for (account of accountsFor(draft().targetPlatform); track account.id) {
                        <option [ngValue]="account.id">{{ accountName(account) }}</option>
                      }
                    </select>
                    @if (submitted() && !draft().socialIntegrationId) {
                      <p class="mt-1 text-xs text-red-600">Posting account is required.</p>
                    }
                  </label>
                </div>
                <div class="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm font-semibold text-slate-800">Selected publishing target</p>
                  <div class="mt-3 flex items-center gap-3">
                    <span
                      class="flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold"
                      [class.bg-blue-50]="draft().targetPlatform === 'FACEBOOK'"
                      [class.text-blue-700]="draft().targetPlatform === 'FACEBOOK'"
                    >
                      {{ platformMeta[draft().targetPlatform].icon }}
                    </span>
                    <div>
                      <p class="font-medium text-slate-900">{{ selectedPlatformLabel() }}</p>
                      <p class="text-sm text-slate-500">{{ selectedAccountName() }}</p>
                    </div>
                  </div>
                </div>
                }

                @if (activeStep() === 'time') {
                <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label>
                    <span class="text-sm font-medium text-slate-700">Posting time</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Choose the first time of day this schedule should publish.
                    </span>
                    <input
                      [(ngModel)]="draft().postingTime"
                      type="time"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label>
                    <span class="text-sm font-medium text-slate-700">Timezone</span>
                    <span class="mt-1 block text-xs text-slate-500">
                      Times are interpreted in this timezone before being saved.
                    </span>
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
                    <span class="mt-1 block text-xs text-slate-500">
                      Optional guardrail for how many posts should appear on one day.
                    </span>
                    <input
                      [(ngModel)]="draft().dailyPostLimit"
                      type="number"
                      min="1"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  @if (draft().scheduleType === 'custom') {
                    <label>
                      <span class="text-sm font-medium text-slate-700">Custom interval (hours)</span>
                      <span class="mt-1 block text-xs text-slate-500">
                        Set how many hours should pass before publishing the next post.
                      </span>
                      <input
                        [(ngModel)]="draft().customIntervalHours"
                        type="number"
                        min="1"
                        max="24"
                        class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                        [class.border-red-300]="submitted() && !validCustomInterval()"
                        [class.border-slate-300]="!(submitted() && !validCustomInterval())"
                      />
                      @if (submitted() && !validCustomInterval()) {
                        <p class="mt-1 text-xs text-red-600">Use 1 to 24 hours.</p>
                      }
                    </label>
                  }
                </div>
                <p class="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                  {{ scheduleTypeInstruction() }}
                </p>

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
                }
              </div>
              }

              @if (activeStep() === 'posts') {
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold text-slate-900">Post Selection</h3>
                    <p class="mt-1 text-sm text-slate-500">
                      These posts will be published one by one based on your schedule timing.
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
                <p class="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  Drag posts to change the publishing order. Use the optional time override only
                  when one post needs a different time of day.
                </p>

                <div class="space-y-2">
                  @for (post of draft().posts; track post.id; let i = $index) {
                    <div
                      draggable="true"
                      class="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[32px_minmax(0,1fr)_180px_130px_40px]"
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
                      <div class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                        <span class="font-medium">{{ platformMeta[draft().targetPlatform].label }}</span>
                        <span class="block truncate text-xs text-slate-500">
                          {{ selectedAccountName() }}
                        </span>
                      </div>
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
              }

              @if (activeStep() === 'review') {
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <div class="mb-5">
                  <h3 class="text-lg font-semibold text-slate-900">Review & Save</h3>
                  <p class="mt-1 text-sm text-slate-500">
                    Review the schedule before saving. Posts will publish one by one in the order shown.
                  </p>
                </div>
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Basic information</p>
                    <h4 class="mt-2 text-base font-semibold text-slate-900">
                      {{ draft().name || 'Untitled schedule' }}
                    </h4>
                    <p class="mt-1 text-sm text-slate-600">{{ draft().description || 'No description' }}</p>
                    <p class="mt-3 text-sm text-slate-600">
                      {{ title(draft().scheduleType) }} · {{ title(draft().status) }}
                    </p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Posting time</p>
                    <p class="mt-2 text-sm font-medium text-slate-900">{{ timingSummary() }}</p>
                    <p class="mt-2 text-sm text-slate-600">{{ scheduleTypeInstruction() }}</p>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Publishing account</p>
                    <div class="mt-3 flex items-center gap-3">
                      <span class="flex h-10 w-10 items-center justify-center rounded-full border bg-white text-sm font-bold">
                        {{ platformMeta[draft().targetPlatform].icon }}
                      </span>
                      <div>
                        <p class="font-medium text-slate-900">{{ selectedPlatformLabel() }}</p>
                        <p class="text-sm text-slate-600">{{ selectedAccountName() }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p class="text-xs font-semibold uppercase text-slate-500">Selected posts</p>
                    <p class="mt-2 text-sm font-medium text-slate-900">
                      {{ draft().posts.length }} post(s) selected
                    </p>
                    <p class="mt-2 text-sm text-slate-600">
                      These posts will be published sequentially, not all at once.
                    </p>
                  </div>
                </div>
                <div class="mt-5 overflow-hidden rounded-lg border border-slate-200">
                  <div class="grid grid-cols-[56px_minmax(0,1fr)_160px] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                    <span>Order</span>
                    <span>Post</span>
                    <span>Override</span>
                  </div>
                  @for (post of draft().posts; track post.id; let i = $index) {
                    <div class="grid grid-cols-[56px_minmax(0,1fr)_160px] items-center border-t border-slate-100 px-3 py-3 text-sm">
                      <span class="font-mono text-xs text-slate-400">#{{ i + 1 }}</span>
                      <span class="truncate text-slate-800">{{ post.caption || post.title }}</span>
                      <span class="text-slate-500">{{ post.timeOverride || 'Schedule default' }}</span>
                    </div>
                  } @empty {
                    <p class="border-t border-slate-100 px-3 py-6 text-center text-sm text-slate-400">
                      No posts selected.
                    </p>
                  }
                </div>
              </div>
              }
            </section>

            <aside class="space-y-5">
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <p class="text-xs font-semibold uppercase text-slate-500">Current plan</p>
                <h3 class="mt-2 font-semibold text-slate-900">
                  {{ draft().name || 'Untitled schedule' }}
                </h3>
                <div class="mt-4 space-y-3 text-sm">
                  <div>
                    <p class="text-xs text-slate-400">Timing</p>
                    <p class="text-slate-700">{{ timingSummary() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-400">Publishing target</p>
                    <p class="text-slate-700">{{ selectedPlatformLabel() }} · {{ selectedAccountName() }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-slate-400">Posts</p>
                    <p class="text-slate-700">{{ draft().posts.length }} post(s), published one by one</p>
                  </div>
                </div>
              </div>
              @if (activeStep() === 'time') {
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
              }

              @if (activeStep() === 'time' || activeStep() === 'review') {
              <div class="rounded-lg border border-slate-200 bg-white p-5">
                <h3 class="font-semibold text-slate-800">Notifications</h3>
                <p class="mt-1 text-xs text-slate-500">
                  Decide which schedule events should alert the user.
                </p>
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
              }

              @if (activeStep() === 'basic' || activeStep() === 'review') {
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
              }
            </aside>
          </div>
        </div>

        <footer class="border-t border-slate-200 bg-white px-6 py-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-slate-500">
              {{ isLastStep() ? 'Review everything before saving changes.' : 'Complete this step, then continue.' }}
            </p>
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
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              [disabled]="isFirstStep()"
              (click)="previousStep()"
            >
              Back
            </button>
            @if (!isLastStep()) {
              <button
                type="button"
                class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                (click)="nextStep()"
              >
                Next
              </button>
            } @else {
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
                {{ editing() ? 'Save Changes' : 'Create Schedule' }}
              </button>
            }
            </div>
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
  protected readonly steps: EditorStepConfig[] = [
    {
      id: 'basic',
      title: 'Basic info',
      description: 'Name, type, and status',
      icon: '1',
    },
    {
      id: 'time',
      title: 'Posting time',
      description: 'Cadence and timing',
      icon: '2',
    },
    {
      id: 'posts',
      title: 'Posts',
      description: 'Order and captions',
      icon: '3',
    },
    {
      id: 'account',
      title: 'Account',
      description: 'Platform and page',
      icon: '4',
    },
    {
      id: 'review',
      title: 'Review',
      description: 'Confirm and save',
      icon: '5',
    },
  ];
  protected readonly submitted = signal(false);
  protected readonly dragIndex = signal<number | null>(null);
  protected readonly previewTemplate = signal<ScheduleTemplate | null>(null);
  protected readonly activeStep = signal<EditorStep>('basic');

  protected readonly draft = signal<ScheduleDraft>(this.schedules.emptyDraft());
  protected readonly editing = computed(() => !!this.schedule());
  protected readonly activeStepIndex = computed(() =>
    this.steps.findIndex((step) => step.id === this.activeStep()),
  );
  protected readonly activeStepConfig = computed(
    () => this.steps[this.activeStepIndex()] ?? this.steps[0],
  );
  protected readonly isFirstStep = computed(() => this.activeStepIndex() === 0);
  protected readonly isLastStep = computed(() => this.activeStepIndex() === this.steps.length - 1);
  protected readonly bestTimes = computed(() =>
    this.schedules.bestTimes({
      ...this.draft(),
      socialIntegrationId: this.draft().socialIntegrationId ?? undefined,
      customIntervalHours: this.draft().customIntervalHours ?? undefined,
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
      this.activeStep.set('basic');
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

  protected stepState(step: EditorStep): 'done' | 'active' | 'upcoming' {
    const index = this.steps.findIndex((item) => item.id === step);
    if (index < this.activeStepIndex()) return 'done';
    if (index === this.activeStepIndex()) return 'active';
    return 'upcoming';
  }

  protected goToStep(step: EditorStep): void {
    const targetIndex = this.steps.findIndex((item) => item.id === step);
    if (targetIndex <= this.activeStepIndex()) {
      this.activeStep.set(step);
      return;
    }
    while (this.activeStepIndex() < targetIndex) {
      if (!this.validateActiveStep()) {
        return;
      }
      this.activeStep.set(this.steps[this.activeStepIndex() + 1].id);
    }
  }

  protected previousStep(): void {
    if (this.isFirstStep()) {
      return;
    }
    this.submitted.set(false);
    this.activeStep.set(this.steps[this.activeStepIndex() - 1].id);
  }

  protected nextStep(): void {
    if (this.isLastStep()) {
      return;
    }
    if (!this.validateActiveStep()) {
      return;
    }
    this.submitted.set(false);
    this.activeStep.set(this.steps[this.activeStepIndex() + 1].id);
  }

  private validateActiveStep(): boolean {
    this.submitted.set(true);
    const message = this.stepValidationMessage(this.activeStep());
    if (message) {
      this.notifications.error(message);
      return false;
    }
    return true;
  }

  private stepValidationMessage(step: EditorStep): string | null {
    const draft = this.draft();
    if (step === 'basic') {
      if (!draft.name.trim()) return 'Schedule name is required.';
      if (!draft.scheduleType) return 'Choose a schedule type.';
      if (!draft.status) return 'Choose a schedule status.';
    }
    if (step === 'time') {
      if (!draft.startDate) return 'Start date is required.';
      if (!draft.postingTime) return 'Posting time is required.';
      if (!this.validCustomInterval()) return 'Custom interval must be between 1 and 24 hours.';
    }
    if (step === 'posts' && draft.status === 'active') {
      if (draft.posts.some((post) => !post.caption.trim())) {
        return 'Every active scheduled post needs a caption.';
      }
    }
    if (step === 'account') {
      if (!draft.targetPlatform) return 'Choose a social media platform.';
      if (!draft.socialIntegrationId) return 'Choose a connected posting account.';
    }
    return null;
  }

  protected scheduleTypeInstruction(): string {
    const type = this.draft().scheduleType;
    if (type === 'one-time') return 'Posts publish one by one on the start date, spaced one hour apart.';
    if (type === 'daily') return 'Posts publish one by one on consecutive days at the selected time.';
    if (type === 'weekly') return 'Posts publish one by one across the selected weekdays.';
    if (type === 'monthly') return 'Posts publish one by one each month from the start date.';
    return 'Posts publish one by one every selected number of hours.';
  }

  protected timingSummary(): string {
    const draft = this.draft();
    if (draft.scheduleType === 'custom') {
      return `Every ${draft.customIntervalHours || 1} hour(s), starting ${draft.startDate || 'not set'} at ${draft.postingTime}.`;
    }
    if (draft.scheduleType === 'weekly') {
      return `${draft.daysOfWeek.join(', ') || 'Selected weekdays'} at ${draft.postingTime}.`;
    }
    return `${this.title(draft.scheduleType)} at ${draft.postingTime}, starting ${draft.startDate || 'not set'}.`;
  }

  protected selectedPlatformLabel(): string {
    return this.platformMeta[this.draft().targetPlatform].label;
  }

  protected isPlatformSelected(platform: SchedulePlatform): boolean {
    return this.draft().platforms.includes(platform);
  }

  protected togglePlatform(platform: SchedulePlatform): void {
    this.onTargetPlatformChange(platform);
  }

  protected onTargetPlatformChange(platform: SchedulePlatform): void {
    const account = this.accountsFor(platform)[0];
    this.draft.update((draft) => ({
      ...draft,
      targetPlatform: platform,
      platforms: [platform],
      socialIntegrationId: account?.id,
      posts: draft.posts.map((post) => ({
        ...post,
        platform,
        socialIntegrationId: account?.id,
      })),
    }));
  }

  protected applyScheduleTargetToPosts(): void {
    this.draft.update((draft) => ({
      ...draft,
      platforms: [draft.targetPlatform],
      posts: draft.posts.map((post) => ({
        ...post,
        platform: draft.targetPlatform,
        socialIntegrationId: draft.socialIntegrationId ?? undefined,
      })),
    }));
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
    const platform = draft.targetPlatform;
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
          status: current.status === 'active' ? 'scheduled' : current.status === 'paused' ? 'paused' : 'draft',
          socialIntegrationId: current.socialIntegrationId ?? undefined,
          hashtags: [],
          engagement: { likes: 0, comments: 0, shares: 0 },
          hasMedia: false,
          hasCaption: false,
        },
      ],
    }));
  }

  protected onPostPlatformChange(post: SchedulePost): void {
    const accounts = this.accountsFor(post.platform);
    if (!accounts.some((account) => account.id === post.socialIntegrationId)) {
      post.socialIntegrationId = accounts[0]?.id;
    }
  }

  protected accountsFor(platform: SchedulePlatform): SocialIntegration[] {
    return this.schedules.accounts().filter((account) => account.platform === platform);
  }

  protected selectedAccountName(): string {
    const id = this.draft().socialIntegrationId;
    const account = this.schedules.accounts().find((account) => account.id === id);
    return account ? this.accountName(account) : 'No account selected';
  }

  protected validCustomInterval(): boolean {
    if (this.draft().scheduleType !== 'custom') {
      return true;
    }
    const value = Number(this.draft().customIntervalHours);
    return Number.isInteger(value) && value >= 1 && value <= 24;
  }

  protected accountName(account: SocialIntegration): string {
    return account.displayName || account.externalAccountId || `#${account.id}`;
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
    if (
      !draft.name.trim() ||
      !draft.targetPlatform ||
      !draft.socialIntegrationId ||
      !draft.startDate ||
      !this.validCustomInterval()
    ) {
      return;
    }
    if (!asDraft && draft.status === 'active') {
      if (draft.posts.some((post) => !post.caption.trim())) {
        this.notifications.error('Add a caption before scheduling posts for publishing.');
        return;
      }
    }
    this.applyScheduleTargetToPosts();
    const saved = this.schedules.save(this.draft(), asDraft);
    this.notifications.success(asDraft ? 'Schedule draft saved' : 'Schedule saved');
    this.saved.emit(saved);
  }
}
