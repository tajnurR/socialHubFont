import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmService } from '../../core/services/confirm.service';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import {
  BulkUploadResult,
  CreatePostRequest,
  PostResponse,
  PostStatus,
  Product,
  ScheduleEvent,
  UpdatePostRequest,
} from '../../shared/models/publishing.model';
import { SocialIntegration } from '../../shared/models/social-integration.model';
import { SocialPlatform } from '../../shared/models/social-platform.model';
import { PublishingService } from './publishing.service';

type PostFormMode = 'create' | 'edit';

interface PlatformConfig {
  platform: SocialPlatform;
  label: string;
  accountLabel: string;
  contentLabel: string;
  titleLabel: string;
  mediaRequired: boolean;
}

interface PostForm {
  id?: number;
  title: string;
  content: string;
  socialIntegrationId: number | null;
  mediaUrl: string;
  link: string;
  productId: number | null;
}

@Component({
  selector: 'app-post-management',
  imports: [DatePipe, FormsModule, NgClass, PageHeader, RouterLink],
  template: `
    <div class="space-y-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Add Post"
          subtitle="Create, upload, review, schedule, and manage your social media posts."
        />
        <button
          type="button"
          routerLink="/posts/new"
          class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 sm:w-auto"
        >
          + Add New
        </button>
      </div>

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div
          class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_150px_150px_190px_180px_140px_140px]"
        >
          <label>
            <span class="text-xs font-medium text-slate-500">Keyword</span>
            <input
              [(ngModel)]="filters.keyword"
              (ngModelChange)="loadPosts()"
              type="search"
              placeholder="Search title or content"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Status</span>
            <select
              [(ngModel)]="filters.status"
              (ngModelChange)="loadPosts()"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              @for (status of postStatuses; track status) {
                <option [value]="status">{{ statusLabel(status) }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Platform</span>
            <select
              [(ngModel)]="filters.platform"
              (ngModelChange)="loadPosts()"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">All</option>
              @for (config of platformConfigs; track config.platform) {
                <option [value]="config.platform">{{ config.label }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Page / Account</span>
            <select
              [(ngModel)]="filters.pageId"
              (ngModelChange)="loadPosts()"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option [ngValue]="null">All</option>
              @for (account of accounts(); track account.id) {
                <option [ngValue]="account.id">{{ accountName(account) }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">Schedule</span>
            <select
              [(ngModel)]="filters.scheduleId"
              (ngModelChange)="loadPosts()"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option [ngValue]="null">All</option>
              @for (schedule of schedules(); track schedule.id) {
                <option [ngValue]="schedule.id">{{ schedule.name }}</option>
              }
            </select>
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">From</span>
            <input
              [(ngModel)]="filters.from"
              (ngModelChange)="loadPosts()"
              type="date"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span class="text-xs font-medium text-slate-500">To</span>
            <input
              [(ngModel)]="filters.to"
              (ngModelChange)="loadPosts()"
              type="date"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-800">Add selected posts to a schedule</p>
            <p class="mt-1 text-xs text-slate-500">
              {{ selectedCount() }} draft post(s) selected. Only unscheduled Draft posts can be scheduled.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto] xl:min-w-[720px]">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              [disabled]="draftPosts().length === 0 || selectedCount() === draftPosts().length"
              (click)="selectAllFiltered()"
            >
              Select All Drafts
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              [disabled]="selectedCount() === 0"
              (click)="clearSelection()"
            >
              Clear
            </button>
            <select
              [(ngModel)]="selectedScheduleId"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option [ngValue]="null">Choose schedule</option>
              @for (schedule of schedules(); track schedule.id) {
                <option [ngValue]="schedule.id">{{ schedule.name }}</option>
              }
            </select>
            <button
              type="button"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              [disabled]="selectedCount() === 0 || !selectedScheduleId || assigningToSchedule()"
              (click)="assignSelectedToSchedule()"
            >
              {{ assigningToSchedule() ? 'Adding...' : 'Add to Schedule' }}
            </button>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div class="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm font-medium text-slate-700">{{ posts().length }} post(s)</p>
          <div class="flex items-center justify-between gap-2 text-sm text-slate-500 sm:justify-start">
            <span>Rows</span>
            <select
              [(ngModel)]="pageSize"
              (ngModelChange)="page.set(1)"
              class="rounded-lg border border-slate-300 px-2 py-1 text-sm"
            >
              <option [ngValue]="10">10</option>
              <option [ngValue]="25">25</option>
              <option [ngValue]="50">50</option>
            </select>
          </div>
        </div>

        @if (loading()) {
          <p class="px-4 py-8 text-center text-sm text-slate-400">Loading posts...</p>
        } @else {
          <div class="divide-y divide-slate-100 xl:hidden">
            @for (post of pagedPosts(); track post.id) {
              <article class="space-y-3 px-4 py-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      class="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                      [checked]="isSelected(post.id)"
                      [disabled]="!canSchedule(post)"
                      (change)="togglePostSelection(post.id, $event)"
                      [attr.aria-label]="canSchedule(post) ? 'Select draft post' : 'Only draft posts can be scheduled'"
                    />
                    <div class="min-w-0">
                    <p class="font-mono text-xs text-slate-400">#{{ post.id }}</p>
                    <h3 class="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                      {{ post.title || preview(post) }}
                    </h3>
                    </div>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                    [ngClass]="statusClass(post.status)"
                  >
                    {{ statusLabel(post.status) }}
                  </span>
                </div>

                <p class="line-clamp-3 text-sm text-slate-600">{{ post.content || '(no content)' }}</p>

                <dl class="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Platform</dt>
                    <dd class="mt-1 flex items-center gap-2 text-slate-700">
                      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                        {{ platformIcon(post.platform) }}
                      </span>
                      <span>{{ platformLabel(post.platform) }}</span>
                    </dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Account</dt>
                    <dd class="mt-0.5 truncate text-slate-700">
                      {{ post.targetAccountName || accountLabel(post.socialIntegrationId) }}
                    </dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Schedule</dt>
                    <dd class="mt-0.5 text-slate-700">{{ post.scheduleName || 'None' }}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Scheduled</dt>
                    <dd class="mt-0.5 text-slate-700">
                      {{ post.scheduledAt ? (post.scheduledAt | date: 'medium') : 'Not scheduled' }}
                    </dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Created</dt>
                    <dd class="mt-0.5 text-slate-700">{{ post.createdAt | date: 'mediumDate' }}</dd>
                  </div>
                  <div class="rounded-lg bg-slate-50 p-2">
                    <dt class="font-medium text-slate-400">Updated</dt>
                    <dd class="mt-0.5 text-slate-700">{{ post.updatedAt | date: 'mediumDate' }}</dd>
                  </div>
                </dl>

                <div class="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                    (click)="view(post)"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-indigo-100 px-3 py-2 text-xs font-medium text-indigo-700"
                    (click)="openEdit(post)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600"
                    (click)="remove(post)"
                  >
                    Delete
                  </button>
                </div>
                @if (post.status === 'POSTED') {
                  <button
                    type="button"
                    class="w-full rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700"
                    (click)="clone(post)"
                  >
                    Clone as Draft
                  </button>
                }
                @if (post.status === 'FAILED') {
                  <button
                    type="button"
                    class="w-full rounded-lg border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700"
                    (click)="retry(post)"
                  >
                    Retry Now
                  </button>
                }
              </article>
            } @empty {
              <p class="px-4 py-10 text-center text-sm text-slate-400">No posts found.</p>
            }
          </div>

          <div class="hidden overflow-x-auto xl:block">
            <table class="w-full min-w-[980px] text-left text-sm">
              <thead class="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th class="px-4 py-3">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-slate-300 text-indigo-600"
                      [checked]="allVisibleSelected()"
                      [indeterminate]="someVisibleSelected()"
                      (change)="toggleVisibleSelection($event)"
                      aria-label="Select visible posts"
                    />
                  </th>
                  <th class="px-4 py-3">Post ID</th>
                  <th class="px-4 py-3">Post Title / Preview</th>
                  <th class="px-4 py-3">Platform</th>
                  <th class="px-4 py-3">Target Page / Account</th>
                  <th class="px-4 py-3">Schedule</th>
                  <th class="px-4 py-3">Created Date</th>
                  <th class="px-4 py-3">Scheduled Date</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3">Last Updated</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (post of pagedPosts(); track post.id) {
                  <tr class="hover:bg-slate-50">
                    <td class="px-4 py-3">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        [checked]="isSelected(post.id)"
                        [disabled]="!canSchedule(post)"
                        (change)="togglePostSelection(post.id, $event)"
                        [attr.aria-label]="canSchedule(post) ? 'Select draft post' : 'Only draft posts can be scheduled'"
                      />
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-slate-500">#{{ post.id }}</td>
                    <td class="max-w-xs px-4 py-3">
                      <p class="truncate font-medium text-slate-800">
                        {{ post.title || preview(post) }}
                      </p>
                      <p class="mt-1 line-clamp-2 text-xs text-slate-500">{{ post.content }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
                          {{ platformIcon(post.platform) }}
                        </span>
                        <span>{{ platformLabel(post.platform) }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-slate-600">
                      {{ post.targetAccountName || accountLabel(post.socialIntegrationId) }}
                    </td>
                    <td class="px-4 py-3 text-slate-600">{{ post.scheduleName || 'None' }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ post.createdAt | date: 'mediumDate' }}</td>
                    <td class="px-4 py-3 text-slate-600">
                      {{ post.scheduledAt ? (post.scheduledAt | date: 'medium') : 'Not scheduled' }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="rounded-full px-2.5 py-1 text-xs font-medium"
                        [ngClass]="statusClass(post.status)"
                      >
                        {{ statusLabel(post.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-600">{{ post.updatedAt | date: 'mediumDate' }}</td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex flex-wrap justify-end gap-1.5">
                        <button type="button" class="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700" (click)="view(post)">View</button>
                        <button type="button" class="rounded-md border border-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700" (click)="openEdit(post)">Edit</button>
                        <button type="button" class="rounded-md border border-red-100 px-2 py-1 text-xs font-medium text-red-600" (click)="remove(post)">Delete</button>
                        @if (post.status === 'POSTED') {
                          <button type="button" class="rounded-md border border-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700" (click)="clone(post)">Clone</button>
                        }
                        @if (post.status === 'FAILED') {
                          <button type="button" class="rounded-md border border-amber-100 px-2 py-1 text-xs font-medium text-amber-700" (click)="retry(post)">Retry</button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="11" class="px-4 py-10 text-center text-sm text-slate-400">
                      No posts found.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span class="text-slate-500">Page {{ page() }} of {{ totalPages() }}</span>
          <div class="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:opacity-40"
              [disabled]="page() <= 1"
              (click)="page.update((value) => value - 1)"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 disabled:opacity-40"
              [disabled]="page() >= totalPages()"
              (click)="page.update((value) => value + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>

    @if (drawerOpen()) {
      <div class="fixed inset-0 z-40 bg-slate-900/30" (click)="closeDrawer()"></div>
      <aside
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-4xl flex-col overflow-hidden bg-slate-50 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Edit post"
      >
        <header class="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Edit Post
              </p>
              <h2 class="mt-1 text-xl font-bold text-slate-900">
                {{ selectedConfig()?.label || 'Select platform' }}
              </h2>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              (click)="closeDrawer()"
            >
              Close
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          @if (!selectedPlatform()) {
            <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              @for (config of platformConfigs; track config.platform) {
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-indigo-200 hover:bg-indigo-50"
                  (click)="selectPlatform(config.platform)"
                >
                  <p class="font-semibold text-slate-900">{{ config.label }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ config.accountLabel }}</p>
                  <p class="mt-3 text-xs font-medium text-indigo-600">
                    {{ platformAccounts(config.platform).length }} connected
                  </p>
                </button>
              }
            </section>
          } @else {
            <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section class="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 class="font-semibold text-slate-900">Single post</h3>
                  @if (mode() === 'create') {
                    <button
                      type="button"
                      class="text-sm font-medium text-slate-500 hover:text-indigo-600"
                      (click)="selectedPlatform.set(null)"
                    >
                      Change platform
                    </button>
                  }
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label class="sm:col-span-2">
                    <span class="text-sm font-medium text-slate-700">
                      {{ selectedConfig()?.accountLabel }}
                    </span>
                    <select
                      [(ngModel)]="form.socialIntegrationId"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      [class.border-red-300]="submitted() && !form.socialIntegrationId"
                      [class.border-slate-300]="!(submitted() && !form.socialIntegrationId)"
                    >
                      <option [ngValue]="null">Select account</option>
                      @for (account of selectedAccounts(); track account.id) {
                        <option [ngValue]="account.id">{{ accountName(account) }}</option>
                      }
                    </select>
                    @if (submitted() && !form.socialIntegrationId) {
                      <p class="mt-1 text-xs text-red-600">Target page/account is required.</p>
                    }
                  </label>

                  <label>
                    <span class="text-sm font-medium text-slate-700">
                      {{ selectedConfig()?.titleLabel }}
                    </span>
                    <input
                      [(ngModel)]="form.title"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      [class.border-red-300]="submitted() && !form.title.trim()"
                      [class.border-slate-300]="!(submitted() && !form.title.trim())"
                    />
                    @if (submitted() && !form.title.trim()) {
                      <p class="mt-1 text-xs text-red-600">Post title is required.</p>
                    }
                  </label>

                  <label class="sm:col-span-2">
                    <span class="text-sm font-medium text-slate-700">
                      {{ selectedConfig()?.contentLabel }}
                    </span>
                    <textarea
                      [(ngModel)]="form.content"
                      rows="5"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                      [class.border-red-300]="submitted() && !form.content.trim()"
                      [class.border-slate-300]="!(submitted() && !form.content.trim())"
                    ></textarea>
                    @if (submitted() && !form.content.trim()) {
                      <p class="mt-1 text-xs text-red-600">Post content is required.</p>
                    }
                  </label>

                  <label>
                    <span class="text-sm font-medium text-slate-700">Image / Video URL</span>
                    <input
                      [(ngModel)]="form.mediaUrl"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      [class.border-red-300]="submitted() && mediaMissing()"
                      [class.border-slate-300]="!(submitted() && mediaMissing())"
                    />
                    @if (submitted() && mediaMissing()) {
                      <p class="mt-1 text-xs text-red-600">Media is required for this platform.</p>
                    }
                  </label>

                  <label>
                    <span class="text-sm font-medium text-slate-700">Link</span>
                    <input
                      [(ngModel)]="form.link"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <label>
                    <span class="text-sm font-medium text-slate-700">Product</span>
                    <select
                      [(ngModel)]="form.productId"
                      class="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                      [class.border-red-300]="submitted() && !form.productId"
                      [class.border-slate-300]="!(submitted() && !form.productId)"
                    >
                      <option [ngValue]="null">Select product</option>
                      @for (product of products(); track product.id) {
                        <option [ngValue]="product.id">{{ product.name }}</option>
                      }
                    </select>
                    @if (submitted() && !form.productId) {
                      <p class="mt-1 text-xs text-red-600">Product is required.</p>
                    }
                  </label>
                </div>

                <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 sm:w-auto"
                    (click)="closeDrawer()"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    class="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                    [disabled]="saving()"
                    (click)="savePost()"
                  >
                    {{ saving() ? 'Saving...' : mode() === 'edit' ? 'Save Changes' : 'Save Post' }}
                  </button>
                </div>
              </section>

              @if (mode() === 'create') {
                <section class="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 class="font-semibold text-slate-900">Bulk upload</h3>
                  <p class="mt-1 text-sm text-slate-500">
                    Platform: {{ selectedConfig()?.label }}. Valid rows import as drafts.
                  </p>

                  <button
                    type="button"
                    class="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    [disabled]="downloading()"
                    (click)="downloadTemplate()"
                  >
                    {{ downloading() ? 'Preparing...' : 'Download template' }}
                  </button>

                  <input
                    type="file"
                    accept=".xlsx"
                    class="mt-4 w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
                    (change)="onFileSelected($event)"
                  />

                  <button
                    type="button"
                    class="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    [disabled]="!selectedFile() || uploading()"
                    (click)="upload()"
                  >
                    {{ uploading() ? 'Uploading...' : 'Upload Excel' }}
                  </button>

                  @if (uploadResult(); as result) {
                    <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p class="text-sm font-medium text-emerald-700">
                        {{ result.importedCount }} post(s) imported as drafts.
                      </p>
                      @if (result.errors.length) {
                        <ul class="mt-2 max-h-44 space-y-1 overflow-y-auto text-xs text-amber-700">
                          @for (error of result.errors; track error.row) {
                            <li>Row {{ error.row }}: {{ error.message }}</li>
                          }
                        </ul>
                      }
                    </div>
                  }
                </section>
              }
            </div>
          }
        </div>
      </aside>
    }

    @if (viewing(); as post) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                {{ platformLabel(post.platform) }} Post #{{ post.id }}
              </p>
              <h3 class="mt-1 text-xl font-bold text-slate-900">{{ post.title || preview(post) }}</h3>
            </div>
            <button
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              (click)="viewing.set(null)"
            >
              Close
            </button>
          </div>
          <div class="mt-5 space-y-3 text-sm">
            <p class="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-slate-700">{{ post.content }}</p>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <p><span class="text-slate-400">Account:</span> {{ post.targetAccountName || accountLabel(post.socialIntegrationId) }}</p>
              <p><span class="text-slate-400">Status:</span> {{ statusLabel(post.status) }}</p>
              <p><span class="text-slate-400">Schedule:</span> {{ post.scheduleName || 'None' }}</p>
              <p><span class="text-slate-400">Scheduled:</span> {{ post.scheduledAt ? (post.scheduledAt | date: 'medium') : 'Not scheduled' }}</p>
              <p><span class="text-slate-400">Published:</span> {{ post.publishedAt ? (post.publishedAt | date: 'medium') : '—' }}</p>
              <p><span class="text-slate-400">Facebook Post ID:</span> {{ post.externalPostId || '—' }}</p>
              <p><span class="text-slate-400">Retry Count:</span> {{ post.retryCount }}</p>
              <p><span class="text-slate-400">Last Retry:</span> {{ post.lastRetryAt ? (post.lastRetryAt | date: 'medium') : '—' }}</p>
              <p><span class="text-slate-400">Created:</span> {{ post.createdAt | date: 'medium' }}</p>
              <p><span class="text-slate-400">Updated:</span> {{ post.updatedAt | date: 'medium' }}</p>
            </div>
            @if (post.errorMessage) {
              <p class="rounded-lg border border-red-100 bg-red-50 p-3 text-red-700">
                {{ post.errorMessage }}
              </p>
            }
            @if (post.publishResponseSummary) {
              <p class="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                {{ post.publishResponseSummary }}
              </p>
            }
            @if (post.status === 'FAILED') {
              <button
                type="button"
                class="rounded-lg border border-amber-200 px-4 py-2 text-sm font-medium text-amber-700"
                (click)="retry(post)"
              >
                Retry Now
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class PostManagement implements OnInit {
  private readonly publishing = inject(PublishingService);
  private readonly notify = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly platformConfigs: PlatformConfig[] = [
    {
      platform: 'FACEBOOK',
      label: 'Facebook',
      accountLabel: 'Select Facebook Page',
      contentLabel: 'Post Content',
      titleLabel: 'Post Title',
      mediaRequired: false,
    },
    {
      platform: 'INSTAGRAM',
      label: 'Instagram',
      accountLabel: 'Select Instagram Account',
      contentLabel: 'Caption',
      titleLabel: 'Internal Title',
      mediaRequired: true,
    },
    {
      platform: 'LINKEDIN',
      label: 'LinkedIn',
      accountLabel: 'Select Company Page or Profile',
      contentLabel: 'Post Content',
      titleLabel: 'Post Title',
      mediaRequired: false,
    },
    {
      platform: 'X',
      label: 'X',
      accountLabel: 'Select X Account',
      contentLabel: 'Post Content',
      titleLabel: 'Internal Title',
      mediaRequired: false,
    },
  ];
  protected readonly postStatuses: PostStatus[] = [
    'DRAFT',
    'PENDING',
    'PROCESSING',
    'SCHEDULED',
    'POSTED',
    'FAILED',
    'NOT_POSTED',
    'PAUSED',
    'CANCELLED',
  ];

  protected readonly posts = signal<PostResponse[]>([]);
  protected readonly accounts = signal<SocialIntegration[]>([]);
  protected readonly schedules = signal<ScheduleEvent[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(true);
  protected readonly selectedPostIds = signal<Set<number>>(new Set());
  protected readonly assigningToSchedule = signal(false);
  protected readonly page = signal(1);
  protected pageSize = 10;
  protected selectedScheduleId: number | null = null;

  protected readonly drawerOpen = signal(false);
  protected readonly selectedPlatform = signal<SocialPlatform | null>(null);
  protected readonly mode = signal<PostFormMode>('create');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly viewing = signal<PostResponse | null>(null);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly downloading = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadResult = signal<BulkUploadResult | null>(null);

  protected filters: {
    keyword: string;
    status: '' | PostStatus;
    platform: '' | SocialPlatform;
    pageId: number | null;
    scheduleId: number | null;
    from: string;
    to: string;
  } = {
    keyword: '',
    status: '',
    platform: '',
    pageId: null,
    scheduleId: null,
    from: '',
    to: '',
  };

  protected form: PostForm = this.emptyForm();

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.posts().length / this.pageSize)),
  );
  protected readonly selectedCount = computed(() => this.selectedPostIds().size);
  protected readonly draftPosts = computed(() => this.posts().filter((post) => this.canSchedule(post)));
  protected readonly pagedPosts = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.posts().slice(start, start + this.pageSize);
  });
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.pagedPosts().filter((post) => this.canSchedule(post));
    return visible.length > 0 && visible.every((post) => this.selectedPostIds().has(post.id));
  });
  protected readonly someVisibleSelected = computed(() => {
    const visible = this.pagedPosts().filter((post) => this.canSchedule(post));
    return !this.allVisibleSelected() && visible.some((post) => this.selectedPostIds().has(post.id));
  });
  protected readonly selectedConfig = computed(() =>
    this.platformConfigs.find((config) => config.platform === this.selectedPlatform()),
  );
  protected readonly selectedAccounts = computed(() =>
    this.platformAccounts(this.selectedPlatform()),
  );

  ngOnInit(): void {
    this.loadOptions();
    this.loadPosts();
  }

  protected loadPosts(): void {
    this.loading.set(true);
    this.publishing
      .listPosts({
        keyword: this.filters.keyword || undefined,
        status: this.filters.status || undefined,
        platform: this.filters.platform || undefined,
        pageId: this.filters.pageId ?? undefined,
        scheduleId: this.filters.scheduleId ?? undefined,
        from: this.filters.from ? startOfDayIso(this.filters.from) : undefined,
        to: this.filters.to ? endOfDayIso(this.filters.to) : undefined,
      })
      .subscribe({
        next: (items) => {
          this.posts.set(items);
          this.clearSelection();
          this.page.set(1);
          this.loading.set(false);
        },
        error: () => {
          this.notify.error('Could not load posts.');
          this.loading.set(false);
        },
      });
  }

  protected openCreate(): void {
    this.mode.set('create');
    this.selectedPlatform.set(null);
    this.form = this.emptyForm();
    this.submitted.set(false);
    this.uploadResult.set(null);
    this.selectedFile.set(null);
    this.drawerOpen.set(true);
  }

  protected openEdit(post: PostResponse): void {
    this.mode.set('edit');
    this.selectedPlatform.set(post.platform);
    this.form = {
      id: post.id,
      title: post.title ?? '',
      content: post.content ?? '',
      socialIntegrationId: post.socialIntegrationId,
      mediaUrl: post.mediaUrl ?? '',
      link: post.link ?? '',
      productId: post.productId ?? null,
    };
    this.submitted.set(false);
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedPlatform.set(null);
    this.submitted.set(false);
  }

  protected selectPlatform(platform: SocialPlatform): void {
    this.selectedPlatform.set(platform);
    this.form = this.emptyForm();
    this.form.socialIntegrationId = this.platformAccounts(platform)[0]?.id ?? null;
  }

  protected savePost(): void {
    this.submitted.set(true);
    if (
      !this.selectedPlatform() ||
      !this.form.socialIntegrationId ||
      !this.form.content.trim() ||
      !this.form.title.trim() ||
      !this.form.productId
    ) {
      return;
    }
    if (this.mediaMissing()) {
      return;
    }
    const body = this.formBody();
    this.saving.set(true);
    const request$ =
      this.mode() === 'edit' && this.form.id
        ? this.publishing.updatePost(this.form.id, body as UpdatePostRequest)
        : this.publishing.createPost(body as CreatePostRequest);
    request$.subscribe({
      next: () => {
        this.notify.success(this.mode() === 'edit' ? 'Post updated.' : 'Post saved.');
        this.saving.set(false);
        this.loadPosts();
        if (this.mode() === 'edit') {
          this.closeDrawer();
        } else {
          const platform = this.selectedPlatform();
          this.form = this.emptyForm();
          this.form.socialIntegrationId = platform ? this.platformAccounts(platform)[0]?.id ?? null : null;
          this.submitted.set(false);
        }
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not save post.');
        this.saving.set(false);
      },
    });
  }

  protected view(post: PostResponse): void {
    this.viewing.set(post);
  }

  protected async remove(post: PostResponse): Promise<void> {
    const ok = await this.confirm.ask(`Delete post #${post.id}?`, 'Delete post', 'Delete');
    if (!ok) {
      return;
    }
    this.publishing.deletePost(post.id).subscribe({
      next: () => {
        this.notify.success('Post deleted.');
        this.loadPosts();
      },
      error: () => this.notify.error('Could not delete post.'),
    });
  }

  protected retry(post: PostResponse): void {
    this.publishing.retryPost(post.id).subscribe({
      next: (updated) => {
        const message =
          updated.status === 'POSTED'
            ? 'Post published.'
            : updated.status === 'PENDING'
              ? 'Retry scheduled.'
              : updated.status === 'PROCESSING'
                ? 'Retry started.'
                : 'Retry finished with an error.';
        this.notify.success(message);
        this.viewing.set(updated);
        this.loadPosts();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not retry the post.'),
    });
  }

  protected clone(post: PostResponse): void {
    this.publishing.clonePost(post.id).subscribe({
      next: (cloned) => {
        this.notify.success(`Post #${post.id} cloned as draft #${cloned.id}.`);
        this.loadPosts();
      },
      error: (err) => this.notify.error(err?.error?.message ?? 'Could not clone the post.'),
    });
  }

  protected canSchedule(post: PostResponse): boolean {
    return post.status === 'DRAFT' && !post.scheduleEventId;
  }

  protected isSelected(postId: number): boolean {
    return this.selectedPostIds().has(postId);
  }

  protected togglePostSelection(postId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const post = this.posts().find((item) => item.id === postId);
    if (!post || !this.canSchedule(post)) {
      this.selectedPostIds.update((current) => {
        const next = new Set(current);
        next.delete(postId);
        return next;
      });
      return;
    }
    this.selectedPostIds.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(postId);
      } else {
        next.delete(postId);
      }
      return next;
    });
  }

  protected toggleVisibleSelection(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const visibleIds = this.pagedPosts().filter((post) => this.canSchedule(post)).map((post) => post.id);
    this.selectedPostIds.update((current) => {
      const next = new Set(current);
      for (const id of visibleIds) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }

  protected selectAllFiltered(): void {
    this.selectedPostIds.set(new Set(this.draftPosts().map((post) => post.id)));
  }

  protected clearSelection(): void {
    this.selectedPostIds.set(new Set());
  }

  protected assignSelectedToSchedule(): void {
    if (!this.selectedScheduleId || this.selectedCount() === 0) {
      return;
    }
    const postIds = [...this.selectedPostIds()];
    const invalid = postIds.some((id) => {
      const post = this.posts().find((item) => item.id === id);
      return !post || !this.canSchedule(post);
    });
    if (invalid) {
      this.notify.error('Only draft posts can be added to a schedule.');
      return;
    }
    this.assigningToSchedule.set(true);
    this.publishing.attachPostsToSchedule(this.selectedScheduleId, postIds).subscribe({
      next: () => {
        this.notify.success(`${postIds.length} post(s) added to schedule.`);
        this.assigningToSchedule.set(false);
        this.clearSelection();
        this.loadOptions();
        this.loadPosts();
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Could not add posts to the schedule.');
        this.assigningToSchedule.set(false);
      },
    });
  }

  protected downloadTemplate(): void {
    const platform = this.selectedPlatform();
    if (!platform) {
      return;
    }
    this.downloading.set(true);
    this.publishing.downloadTemplate(platform).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${platform.toLowerCase()}-posts-template.xlsx`;
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

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  protected upload(): void {
    const platform = this.selectedPlatform();
    const file = this.selectedFile();
    if (!platform || !file) {
      return;
    }
    this.uploading.set(true);
    this.uploadResult.set(null);
    this.publishing.bulkUpload(platform, file).subscribe({
      next: (result) => {
        this.uploadResult.set(result);
        this.uploading.set(false);
        this.notify.success(`Imported ${result.importedCount} post(s).`);
        this.loadPosts();
      },
      error: (err) => {
        this.notify.error(err?.error?.message ?? 'Upload failed.');
        this.uploading.set(false);
      },
    });
  }

  protected platformAccounts(platform: SocialPlatform | null): SocialIntegration[] {
    if (!platform) {
      return [];
    }
    return this.accounts().filter((account) => account.platform === platform);
  }

  protected accountName(account: SocialIntegration): string {
    return account.displayName || account.externalAccountId || `#${account.id}`;
  }

  protected accountLabel(id: number | null | undefined): string {
    const account = this.accounts().find((item) => item.id === id);
    return account ? this.accountName(account) : id ? `#${id}` : 'None';
  }

  protected platformLabel(platform: SocialPlatform): string {
    return this.platformConfigs.find((config) => config.platform === platform)?.label ?? platform;
  }

  protected platformIcon(platform: SocialPlatform): string {
    switch (platform) {
      case 'FACEBOOK':
        return 'f';
      case 'INSTAGRAM':
        return 'IG';
      case 'LINKEDIN':
        return 'in';
      case 'X':
        return 'X';
      default:
        return platform.slice(0, 2).toUpperCase();
    }
  }

  protected statusLabel(status: PostStatus): string {
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  protected statusClass(status: PostStatus): string {
    if (status === 'POSTED') return 'bg-emerald-50 text-emerald-700';
    if (status === 'PENDING' || status === 'SCHEDULED') return 'bg-amber-50 text-amber-700';
    if (status === 'PROCESSING') return 'bg-sky-50 text-sky-700';
    if (status === 'FAILED' || status === 'NOT_POSTED' || status === 'CANCELLED')
      return 'bg-red-50 text-red-700';
    if (status === 'PAUSED') return 'bg-slate-100 text-slate-600';
    return 'bg-slate-50 text-slate-700';
  }

  protected preview(post: PostResponse): string {
    return post.content?.slice(0, 80) || '(no content)';
  }

  protected mediaMissing(): boolean {
    return Boolean(this.selectedConfig()?.mediaRequired && !this.form.mediaUrl.trim());
  }

  private loadOptions(): void {
    this.publishing.listAccounts().subscribe({ next: (items) => this.accounts.set(items) });
    this.publishing.listScheduleEvents().subscribe({ next: (items) => this.schedules.set(items) });
    this.publishing.listProducts().subscribe({ next: (items) => this.products.set(items) });
  }

  private formBody(): CreatePostRequest | UpdatePostRequest {
    return {
      platform: this.selectedPlatform()!,
      socialIntegrationId: this.form.socialIntegrationId!,
      title: this.form.title.trim(),
      content: this.form.content.trim(),
      link: this.form.link.trim() || null,
      mediaUrl: this.form.mediaUrl.trim() || null,
      productId: this.form.productId!,
    };
  }

  private emptyForm(): PostForm {
    return {
      title: '',
      content: '',
      socialIntegrationId: null,
      mediaUrl: '',
      link: '',
      productId: null,
    };
  }
}

function startOfDayIso(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function endOfDayIso(date: string): string {
  return new Date(`${date}T23:59:59`).toISOString();
}
