import { inject, Injectable, computed, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { SocialIntegration } from '../../shared/models/social-integration.model';
import {
  BestTimeSuggestion,
  ConflictWarning,
  DAYS_OF_WEEK,
  SCHEDULE_STATUSES,
  SCHEDULE_TYPES,
  Schedule,
  ScheduleDraft,
  ScheduleInsight,
  SchedulePlatform,
  SchedulePost,
  SchedulePostStatus,
  ScheduleStatus,
  ScheduleTemplate,
  ScheduleType,
} from './schedule.model';

@Injectable({ providedIn: 'root' })
export class SchedulesService {
  private readonly api = inject(ApiService);
  private backendAvailable = true;
  private readonly _schedules = signal<Schedule[]>(
    MOCK_SCHEDULES.map((schedule) => normalize(schedule)),
  );
  private readonly _accounts = signal<SocialIntegration[]>([]);

  readonly schedules = this._schedules.asReadonly();
  readonly accounts = this._accounts.asReadonly();
  readonly summary = computed(() => this.buildSummary(this._schedules()));

  readonly templates: ScheduleTemplate[] = [
    template(
      'daily-product',
      'Daily Product Post',
      'One product-led post every evening.',
      'daily',
      ['FACEBOOK', 'INSTAGRAM'],
      '20:00',
      '#4f46e5',
    ),
    template(
      'weekly-offer',
      'Weekly Offer Campaign',
      'Weekly promotional run with offer reminders.',
      'weekly',
      ['FACEBOOK', 'INSTAGRAM', 'X'],
      '19:30',
      '#f97316',
      ['Thu', 'Fri'],
    ),
    template(
      'new-arrival',
      'New Arrival Launch',
      'Launch sequence for fresh catalog drops.',
      'custom',
      ['INSTAGRAM', 'TIKTOK', 'PINTEREST'],
      '18:45',
      '#10b981',
      ['Mon', 'Wed', 'Sat'],
    ),
    template(
      'flash-sale',
      'Flash Sale',
      'Short high-urgency posting plan.',
      'one-time',
      ['FACEBOOK', 'INSTAGRAM', 'X'],
      '21:00',
      '#ef4444',
    ),
    template(
      'ramadan',
      'Ramadan Campaign',
      'Evening campaign cadence for Ramadan offers.',
      'daily',
      ['FACEBOOK', 'INSTAGRAM', 'YOUTUBE'],
      '20:15',
      '#7c3aed',
    ),
    template(
      'eid',
      'Eid Campaign',
      'Celebration, offer, and reminder posts.',
      'custom',
      ['FACEBOOK', 'INSTAGRAM', 'TIKTOK'],
      '19:45',
      '#0ea5e9',
      ['Fri', 'Sat', 'Sun'],
    ),
    template(
      'reviews',
      'Customer Review Post',
      'Recurring social proof schedule.',
      'weekly',
      ['LINKEDIN', 'FACEBOOK'],
      '11:30',
      '#14b8a6',
      ['Tue'],
    ),
    template(
      'weekend',
      'Weekend Engagement',
      'Polls, questions, and community posts.',
      'weekly',
      ['INSTAGRAM', 'X', 'FACEBOOK'],
      '20:30',
      '#ec4899',
      ['Fri', 'Sat'],
    ),
    template(
      'monthly-plan',
      'Monthly Content Plan',
      'Balanced monthly content planning starter.',
      'monthly',
      ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE'],
      '10:00',
      '#64748b',
    ),
  ];

  load(): void {
    this.api
      .get<ApiSchedule[]>(ApiEndpoint.SCHEDULES)
      .pipe(
        tap((items) => {
          this.backendAvailable = true;
          this._schedules.set(items.map(apiToSchedule));
        }),
        catchError(() => {
          this.backendAvailable = false;
          return of([]);
        }),
      )
      .subscribe();
    this.loadTemplates();
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.api
      .get<SocialIntegration[]>(ApiEndpoint.INTEGRATIONS)
      .pipe(
        tap((items) => this._accounts.set(items)),
        catchError(() => of([])),
      )
      .subscribe();
  }

  schedule(id: string): Schedule | undefined {
    return this._schedules().find((schedule) => schedule.id === id);
  }

  save(draft: ScheduleDraft, asDraft = false): Schedule {
    const now = new Date().toISOString();
    const id = draft.id ?? crypto.randomUUID();
    const existing = this.schedule(id);
    const schedule: Schedule = normalize({
      id,
      name: draft.name.trim(),
      description: draft.description?.trim(),
      color: draft.color,
      platforms: [draft.targetPlatform],
      targetPlatform: draft.targetPlatform,
      socialIntegrationId: draft.socialIntegrationId ?? undefined,
      status: asDraft ? 'draft' : draft.status,
      scheduleType: draft.scheduleType,
      daysOfWeek: draft.daysOfWeek,
      postingTime: draft.postingTime,
      timezone: draft.timezone,
      startDate: draft.startDate,
      endDate: draft.endDate || undefined,
      customIntervalHours: draft.customIntervalHours ?? 5,
      linkedPostIds: draft.posts.map((post) => post.id),
      totalPosts: 0,
      postedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      nextPostAt: undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      dailyPostLimit: draft.dailyPostLimit ?? undefined,
      notifications: draft.notifications,
      posts: draft.posts.map((post, index) => ({
        ...post,
        scheduleId: id,
        platform: draft.targetPlatform,
        socialIntegrationId: draft.socialIntegrationId ?? undefined,
        scheduledAt: post.scheduledAt || buildDateTime(draft.startDate, draft.postingTime, index),
        status:
          !asDraft && draft.status === 'active' && post.status === 'draft'
            ? 'scheduled'
            : asDraft
              ? 'draft'
              : post.status,
      })),
    });

    this._schedules.update((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) {
        return [schedule, ...items];
      }
      return items.map((item) => (item.id === id ? schedule : item));
    });
    if (this.backendAvailable) {
      const request = draftToApiRequest(schedule, asDraft);
      const numericId = numericIdOrNull(draft.id);
      const request$ = numericId
        ? this.api.put<ApiSchedule>(ApiEndpoint.SCHEDULE_BY_ID, request, { pathParams: { id: numericId } })
        : this.api.post<ApiSchedule>(ApiEndpoint.SCHEDULES, request);
      request$
        .pipe(
          tap((saved) => this.upsert(apiToSchedule(saved), id)),
          catchError(() => {
            this.backendAvailable = false;
            return of(null);
          }),
        )
        .subscribe();
    }
    return schedule;
  }

  delete(id: string): void {
    this._schedules.update((items) => items.filter((item) => item.id !== id));
    const numericId = numericIdOrNull(id);
    if (this.backendAvailable && numericId) {
      this.api
        .delete<void>(ApiEndpoint.SCHEDULE_BY_ID, { pathParams: { id: numericId } })
        .pipe(catchError(() => {
          this.backendAvailable = false;
          return of(undefined);
        }))
        .subscribe();
    }
  }

  duplicate(id: string): Schedule | undefined {
    const source = this.schedule(id);
    if (!source) {
      return undefined;
    }
    const copyId = crypto.randomUUID();
    const now = new Date().toISOString();
    const copied = normalize({
      ...source,
      id: copyId,
      name: `${source.name} Copy`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      posts: source.posts.map((post) => ({
        ...post,
        id: crypto.randomUUID(),
        scheduleId: copyId,
        status: 'draft',
      })),
    });
    this._schedules.update((items) => [copied, ...items]);
    const numericId = numericIdOrNull(id);
    if (this.backendAvailable && numericId) {
      this.api
        .post<ApiSchedule>(ApiEndpoint.SCHEDULE_DUPLICATE, undefined, { pathParams: { id: numericId } })
        .pipe(
          tap((saved) => this.upsert(apiToSchedule(saved), copied.id)),
          catchError(() => {
            this.backendAvailable = false;
            return of(null);
          }),
        )
        .subscribe();
    }
    return copied;
  }

  togglePause(id: string): Schedule | undefined {
    let updated: Schedule | undefined;
    this._schedules.update((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }
        updated = normalize({
          ...item,
          status: item.status === 'paused' ? 'active' : 'paused',
          updatedAt: new Date().toISOString(),
          posts: item.posts.map((post) =>
            post.status === 'scheduled' || post.status === 'paused'
              ? { ...post, status: item.status === 'paused' ? 'scheduled' : 'paused' }
              : post,
          ),
        });
        return updated;
      }),
    );
    const numericId = numericIdOrNull(id);
    if (this.backendAvailable && numericId) {
      this.api
        .post<ApiSchedule>(ApiEndpoint.SCHEDULE_TOGGLE_PAUSE, undefined, { pathParams: { id: numericId } })
        .pipe(
          tap((saved) => this.upsert(apiToSchedule(saved))),
          catchError(() => {
            this.backendAvailable = false;
            return of(null);
          }),
        )
        .subscribe();
    }
    return updated;
  }

  quickReschedule(
    scheduleId: string,
    postId: string,
    action: 'tonight' | 'tomorrow' | 'best' | 'retry' | 'skip',
  ): void {
    this._schedules.update((items) =>
      items.map((schedule) => {
        if (schedule.id !== scheduleId) {
          return schedule;
        }
        const posts = schedule.posts.map((post) => {
          if (post.id !== postId) {
            return post;
          }
          if (action === 'skip') {
            return { ...post, status: 'not_posted' as SchedulePostStatus };
          }
          if (action === 'retry') {
            return {
              ...post,
              status: 'scheduled' as SchedulePostStatus,
              scheduledAt: addHoursIso(2),
            };
          }
          const scheduledAt =
            action === 'tonight'
              ? todayAt('20:00')
              : action === 'tomorrow'
                ? tomorrowAt(schedule.postingTime)
                : nextBestTime(post.platform);
          return { ...post, scheduledAt, status: 'scheduled' as SchedulePostStatus };
        });
        return normalize({ ...schedule, posts, updatedAt: new Date().toISOString() });
      }),
    );
    this.persistQuickAction(scheduleId, postId, action);
  }

  reschedulePostToDate(scheduleId: string, postId: string, date: string): void {
    const schedule = this.schedule(scheduleId);
    const scheduledAt = schedule
      ? new Date(`${date}T${schedule.postingTime}:00`).toISOString()
      : new Date(`${date}T20:00:00`).toISOString();
    this._schedules.update((items) =>
      items.map((schedule) => {
        if (schedule.id !== scheduleId) {
          return schedule;
        }
        const posts = schedule.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                status: 'scheduled' as SchedulePostStatus,
                scheduledAt,
              }
            : post,
        );
        return normalize({ ...schedule, posts, updatedAt: new Date().toISOString() });
      }),
    );
    this.persistReschedule(scheduleId, postId, scheduledAt);
  }

  reorderPosts(scheduleId: string, fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }
    this._schedules.update((items) =>
      items.map((schedule) => {
        if (schedule.id !== scheduleId) {
          return schedule;
        }
        const posts = [...schedule.posts];
        const [item] = posts.splice(fromIndex, 1);
        posts.splice(toIndex, 0, item);
        return normalize({ ...schedule, posts, linkedPostIds: posts.map((post) => post.id) });
      }),
    );
  }

  applyBestTime(id: string): void {
    let next: Schedule | undefined;
    this._schedules.update((items) =>
      items.map((schedule) => {
        if (schedule.id !== id || schedule.platforms.length === 0) {
          return schedule;
        }
        const first = this.bestTimes(schedule)[0];
        next = normalize({
          ...schedule,
          postingTime: first.time,
          updatedAt: new Date().toISOString(),
        });
        return next;
      }),
    );
    if (next) {
      this.persistSchedule(next);
    }
  }

  saveTemplate(draft: ScheduleDraft): void {
    if (!draft.name.trim()) {
      return;
    }
    const local = template(
      `custom-${crypto.randomUUID()}`,
      draft.name.trim(),
      draft.description?.trim() || 'Custom reusable content plan.',
      draft.scheduleType,
      [...draft.platforms],
      draft.postingTime,
      draft.color,
      [...draft.daysOfWeek],
    );
    this.templates.unshift(local);
    if (!this.backendAvailable) {
      return;
    }
    this.api
      .post<ApiScheduleTemplate>(ApiEndpoint.SCHEDULE_TEMPLATES, templateToApiRequest(local, draft))
      .pipe(
        tap((saved) => {
          const mapped = apiToTemplate(saved);
          const index = this.templates.findIndex((item) => item.id === local.id);
          if (index >= 0) {
            this.templates[index] = mapped;
          } else {
            this.templates.unshift(mapped);
          }
        }),
        catchError(() => {
          this.backendAvailable = false;
          return of(null);
        }),
      )
      .subscribe();
  }

  completion(schedule: Schedule): number {
    return schedule.totalPosts === 0
      ? 0
      : Math.round((schedule.postedCount / schedule.totalPosts) * 100);
  }

  healthScore(schedule: Schedule): number {
    if (schedule.totalPosts === 0) {
      return 58;
    }
    const success = (schedule.postedCount / schedule.totalPosts) * 45;
    const readiness =
      (schedule.posts.filter((post) => post.hasCaption && post.hasMedia).length /
        schedule.totalPosts) *
      25;
    const failurePenalty = Math.min(25, schedule.failedCount * 7);
    const overduePenalty = Math.min(20, this.overduePosts(schedule).length * 6);
    const consistency = schedule.status === 'active' ? 20 : schedule.status === 'paused' ? 10 : 6;
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(success + readiness + consistency - failurePenalty - overduePenalty),
      ),
    );
  }

  healthLabel(score: number): 'Excellent' | 'Good' | 'Needs Attention' | 'Critical' {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Needs Attention';
    return 'Critical';
  }

  healthSuggestions(schedule: Schedule): string[] {
    const suggestions: string[] = [];
    if (this.overduePosts(schedule).length) suggestions.push('Reschedule overdue posts.');
    if (schedule.failedCount) suggestions.push('Fix failed posts and retry publishing.');
    if (schedule.posts.some((post) => !post.hasCaption || !post.hasMedia))
      suggestions.push('Add missing captions or media.');
    if (!schedule.endDate && schedule.scheduleType !== 'one-time')
      suggestions.push('Review schedules without end dates.');
    if (schedule.pendingCount === 0 && schedule.status === 'active')
      suggestions.push('Add upcoming posts to keep the schedule active.');
    return suggestions.length ? suggestions : ['Schedule is ready and consistent.'];
  }

  bestTimes(schedule: Schedule): BestTimeSuggestion[] {
    if (schedule.platforms.length === 0 || schedule.totalPosts === 0) {
      return [];
    }
    return schedule.platforms.map((platform) => {
      const time = BEST_TIME_BY_PLATFORM[platform] ?? '19:30';
      return {
        platform,
        time,
        window: `${to12h(time)}-${to12h(addMinutes(time, 60))}`,
        confidence:
          platform === 'INSTAGRAM' || platform === 'FACEBOOK'
            ? 'High engagement'
            : 'Medium engagement',
      };
    });
  }

  conflicts(schedule: Schedule): ConflictWarning[] {
    const warnings: ConflictWarning[] = [];
    const bySlot = new Map<string, SchedulePost[]>();
    for (const post of schedule.posts) {
      const key = `${post.platform}|${post.scheduledAt.slice(0, 16)}`;
      bySlot.set(key, [...(bySlot.get(key) ?? []), post]);
    }
    for (const posts of bySlot.values()) {
      if (posts.length > 1) {
        warnings.push({
          id: `slot-${posts[0].id}`,
          title: 'Simultaneous platform posts',
          detail: `${posts.length} posts target ${labelPlatform(posts[0].platform)} at the same time.`,
          severity: 'warning',
          postIds: posts.map((post) => post.id),
        });
      }
    }
    if (schedule.dailyPostLimit) {
      const byDay = new Map<string, SchedulePost[]>();
      for (const post of schedule.posts) {
        const day = post.scheduledAt.slice(0, 10);
        byDay.set(day, [...(byDay.get(day) ?? []), post]);
      }
      for (const [day, posts] of byDay.entries()) {
        if (posts.length > schedule.dailyPostLimit) {
          warnings.push({
            id: `limit-${day}`,
            title: 'Daily post limit exceeded',
            detail: `${posts.length} posts are planned on ${day}; limit is ${schedule.dailyPostLimit}.`,
            severity: 'critical',
            postIds: posts.map((post) => post.id),
          });
        }
      }
    }
    return warnings;
  }

  insights(schedule: Schedule): ScheduleInsight[] {
    const score = this.healthScore(schedule);
    const next = schedule.nextPostAt
      ? `Your next post is ${formatShortDateTime(schedule.nextPostAt)}.`
      : 'No upcoming posts are scheduled.';
    return [
      {
        id: 'best-platform',
        text: `${labelPlatform(this.bestPlatform(schedule))} is your best-performing platform.`,
        tone: 'good',
      },
      {
        id: 'best-time',
        text: `${to12h(BEST_TIME_BY_PLATFORM.INSTAGRAM)} posts get stronger engagement on visual channels.`,
        tone: 'info',
      },
      {
        id: 'attention',
        text: `${schedule.failedCount + this.overduePosts(schedule).length} posts need attention.`,
        tone: schedule.failedCount ? 'warning' : 'good',
      },
      { id: 'next', text: next, tone: schedule.nextPostAt ? 'info' : 'warning' },
      {
        id: 'health',
        text: `Schedule health is ${this.healthLabel(score).toLowerCase()} at ${score}/100.`,
        tone: score >= 75 ? 'good' : 'warning',
      },
    ];
  }

  emptyDraft(template?: ScheduleTemplate): ScheduleDraft {
    const start = todayDate();
    return {
      name: template?.name ?? '',
      description: template?.description ?? '',
      status: 'draft',
      color: template?.color ?? '#4f46e5',
      platforms: [template?.platforms?.[0] ?? 'FACEBOOK'],
      targetPlatform: template?.platforms?.[0] ?? 'FACEBOOK',
      socialIntegrationId: undefined,
      scheduleType: template?.scheduleType ?? 'weekly',
      daysOfWeek: template?.daysOfWeek ?? ['Mon', 'Wed', 'Fri'],
      postingTime: template?.postingTime ?? '20:00',
      timezone: 'Asia/Dhaka',
      startDate: start,
      endDate: '',
      customIntervalHours: 5,
      dailyPostLimit: 2,
      linkedPostIds: [],
      notifications: { publishSuccess: true, failure: true, nextPostReminder: true },
      posts: [
        draftPost(
          'Product highlight',
          'Showcase the main offer with a clear CTA.',
          template?.platforms?.[0] ?? 'FACEBOOK',
          buildDateTime(start, template?.postingTime ?? '20:00', 0),
        ),
        draftPost(
          'Customer proof',
          'Share a review and invite comments.',
          template?.platforms?.[1] ?? 'INSTAGRAM',
          buildDateTime(start, template?.postingTime ?? '20:00', 1),
        ),
      ],
    };
  }

  draftFromSchedule(schedule: Schedule): ScheduleDraft {
    return {
      id: schedule.id,
      name: schedule.name,
      description: schedule.description,
      status: schedule.status === 'completed' ? 'draft' : schedule.status,
      color: schedule.color ?? '#4f46e5',
      platforms: [...schedule.platforms],
      targetPlatform: schedule.targetPlatform ?? schedule.platforms[0] ?? 'FACEBOOK',
      socialIntegrationId: schedule.socialIntegrationId,
      scheduleType: schedule.scheduleType,
      daysOfWeek: [...(schedule.daysOfWeek ?? [])],
      postingTime: schedule.postingTime,
      timezone: schedule.timezone,
      startDate: schedule.startDate,
      endDate: schedule.endDate ?? '',
      customIntervalHours: schedule.customIntervalHours ?? 5,
      dailyPostLimit: schedule.dailyPostLimit,
      linkedPostIds: [...schedule.linkedPostIds],
      notifications: { ...schedule.notifications },
      posts: schedule.posts.map((post) => ({ ...post })),
    };
  }

  private buildSummary(schedules: Schedule[]) {
    const weekStart = startOfWeek(new Date());
    return {
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter((schedule) => schedule.status === 'active').length,
      totalLinkedPosts: schedules.reduce((sum, schedule) => sum + schedule.totalPosts, 0),
      postedThisWeek: schedules
        .flatMap((schedule) => schedule.posts)
        .filter(
          (post) =>
            post.status === 'posted' && post.publishedAt && new Date(post.publishedAt) >= weekStart,
        ).length,
      pendingNotPosted: schedules.reduce((sum, schedule) => sum + schedule.pendingCount, 0),
      failedPosts: schedules.reduce((sum, schedule) => sum + schedule.failedCount, 0),
    };
  }

  private overduePosts(schedule: Schedule): SchedulePost[] {
    const now = Date.now();
    return schedule.posts.filter(
      (post) =>
        (post.status === 'scheduled' || post.status === 'not_posted') &&
        new Date(post.scheduledAt).getTime() < now,
    );
  }

  private bestPlatform(schedule: Schedule): SchedulePlatform {
    const totals = new Map<SchedulePlatform, number>();
    for (const post of schedule.posts) {
      totals.set(
        post.platform,
        (totals.get(post.platform) ?? 0) +
          post.engagement.likes +
          post.engagement.comments +
          post.engagement.shares,
      );
    }
    return (
      [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      schedule.platforms[0] ??
      'FACEBOOK'
    );
  }

  private loadTemplates(): void {
    if (!this.backendAvailable) {
      return;
    }
    this.api
      .get<ApiScheduleTemplate[]>(ApiEndpoint.SCHEDULE_TEMPLATES)
      .pipe(
        tap((items) => {
          this.templates.splice(0, this.templates.length, ...items.map(apiToTemplate));
        }),
        catchError(() => of([])),
      )
      .subscribe();
  }

  private upsert(schedule: Schedule, replaceId?: string): void {
    this._schedules.update((items) => {
      const ids = new Set([schedule.id, replaceId].filter(Boolean));
      const existingIndex = items.findIndex((item) => ids.has(item.id));
      if (existingIndex === -1) {
        return [schedule, ...items];
      }
      return items.map((item, index) => (index === existingIndex ? schedule : item));
    });
  }

  private persistSchedule(schedule: Schedule): void {
    const numericId = numericIdOrNull(schedule.id);
    if (!this.backendAvailable || !numericId) {
      return;
    }
    this.api
      .put<ApiSchedule>(ApiEndpoint.SCHEDULE_BY_ID, scheduleToApiRequest(schedule), {
        pathParams: { id: numericId },
      })
      .pipe(
        tap((saved) => this.upsert(apiToSchedule(saved))),
        catchError(() => {
          this.backendAvailable = false;
          return of(null);
        }),
      )
      .subscribe();
  }

  private persistQuickAction(
    scheduleId: string,
    postId: string,
    action: 'tonight' | 'tomorrow' | 'best' | 'retry' | 'skip',
  ): void {
    const numericScheduleId = numericIdOrNull(scheduleId);
    const numericPostId = numericIdOrNull(postId);
    if (!this.backendAvailable || !numericScheduleId || !numericPostId) {
      return;
    }
    this.api
      .post<ApiSchedule>(
        ApiEndpoint.SCHEDULE_POST_QUICK_ACTION,
        { action },
        { pathParams: { scheduleId: numericScheduleId, postId: numericPostId } },
      )
      .pipe(
        tap((saved) => this.upsert(apiToSchedule(saved))),
        catchError(() => {
          this.backendAvailable = false;
          return of(null);
        }),
      )
      .subscribe();
  }

  private persistReschedule(scheduleId: string, postId: string, scheduledAt: string): void {
    const numericScheduleId = numericIdOrNull(scheduleId);
    const numericPostId = numericIdOrNull(postId);
    if (!this.backendAvailable || !numericScheduleId || !numericPostId) {
      return;
    }
    this.api
      .post<ApiSchedule>(
        ApiEndpoint.SCHEDULE_POST_RESCHEDULE,
        { scheduledAt },
        { pathParams: { scheduleId: numericScheduleId, postId: numericPostId } },
      )
      .pipe(
        tap((saved) => this.upsert(apiToSchedule(saved))),
        catchError(() => {
          this.backendAvailable = false;
          return of(null);
        }),
      )
      .subscribe();
  }
}

function normalize(schedule: Schedule): Schedule {
  const posts = [...schedule.posts].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const pendingStatuses: SchedulePostStatus[] = [
    'draft',
    'pending',
    'processing',
    'scheduled',
    'not_posted',
    'paused',
  ];
  const postedCount = posts.filter((post) => post.status === 'posted').length;
  const failedCount = posts.filter((post) => post.status === 'failed').length;
  const pendingCount = posts.filter((post) => pendingStatuses.includes(post.status)).length;
  const nextPostAt = posts.find(
    (post) =>
      (post.status === 'pending' || post.status === 'scheduled') &&
      new Date(post.scheduledAt).getTime() >= Date.now(),
  )?.scheduledAt;
  return {
    ...schedule,
    platforms: [schedule.targetPlatform ?? schedule.platforms[0] ?? 'FACEBOOK'],
    targetPlatform: schedule.targetPlatform ?? schedule.platforms[0] ?? 'FACEBOOK',
    customIntervalHours: schedule.customIntervalHours ?? 5,
    posts,
    linkedPostIds: posts.map((post) => post.id),
    totalPosts: posts.length,
    postedCount,
    pendingCount,
    failedCount,
    nextPostAt,
  };
}

function template(
  id: string,
  name: string,
  description: string,
  scheduleType: ScheduleType,
  platforms: SchedulePlatform[],
  postingTime: string,
  color: string,
  daysOfWeek: string[] = DAYS_OF_WEEK,
): ScheduleTemplate {
  return { id, name, description, scheduleType, platforms, postingTime, color, daysOfWeek };
}

function draftPost(
  title: string,
  caption: string,
  platform: SchedulePlatform,
  scheduledAt: string,
): SchedulePost {
  return {
    id: crypto.randomUUID(),
    scheduleId: '',
    title,
    caption,
    platform,
    scheduledAt,
    status: 'draft',
    hashtags: ['#social', '#campaign'],
    cta: 'Shop now',
    engagement: { likes: 0, comments: 0, shares: 0 },
    hasMedia: true,
    hasCaption: true,
  };
}

function mockPost(
  id: string,
  scheduleId: string,
  title: string,
  caption: string,
  platform: SchedulePlatform,
  scheduledAt: string,
  status: SchedulePostStatus,
  engagement: { likes: number; comments: number; shares: number; views?: number },
  missing: Partial<Pick<SchedulePost, 'hasMedia' | 'hasCaption'>> = {},
): SchedulePost {
  return {
    id,
    scheduleId,
    title,
    caption,
    platform,
    scheduledAt,
    status,
    publishedAt: status === 'posted' ? scheduledAt : undefined,
    thumbnailUrl: `https://picsum.photos/seed/${id}/240/160`,
    hashtags: ['#newarrivals', '#socialhub', '#shoplocal'],
    cta: platform === 'LINKEDIN' ? 'Learn more' : 'Shop now',
    engagement,
    hasMedia: missing.hasMedia ?? true,
    hasCaption: missing.hasCaption ?? true,
  };
}

function buildDateTime(date: string, time: string, addDays: number): string {
  const d = new Date(`${date}T${time}:00`);
  d.setDate(d.getDate() + addDays);
  return d.toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function relativeIso(days: number, time: string): string {
  const d = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function todayAt(time: string): string {
  return relativeIso(0, time);
}

function tomorrowAt(time: string): string {
  return relativeIso(1, time);
}

function addHoursIso(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function nextBestTime(platform: SchedulePlatform): string {
  return tomorrowAt(BEST_TIME_BY_PLATFORM[platform] ?? '19:30');
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function to12h(time: string): string {
  const [rawHours, minutes] = time.split(':').map(Number);
  const suffix = rawHours >= 12 ? 'PM' : 'AM';
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatShortDateTime(value: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function labelPlatform(platform: SchedulePlatform): string {
  return platform === 'X' ? 'X' : platform.charAt(0) + platform.slice(1).toLowerCase();
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

interface ApiSchedule {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  platforms: SchedulePlatform[];
  targetPlatform?: SchedulePlatform | null;
  socialIntegrationId?: number | null;
  targetAccountName?: string | null;
  status: string;
  scheduleType: string;
  daysOfWeek?: string[] | null;
  postingTime: string;
  timezone: string;
  startDate: string;
  endDate?: string | null;
  customIntervalHours?: number | null;
  dailyPostLimit?: number | null;
  notifications?: Schedule['notifications'] | null;
  linkedPostIds?: number[] | null;
  totalPosts?: number;
  postedCount?: number;
  pendingCount?: number;
  failedCount?: number;
  nextPostAt?: string | null;
  createdAt: string;
  updatedAt: string;
  posts?: ApiSchedulePost[] | null;
}

interface ApiSchedulePost {
  id: number;
  title?: string | null;
  caption?: string | null;
  platform: SchedulePlatform;
  scheduledAt?: string | null;
  status?: string | null;
  socialIntegrationId?: number | null;
  mediaUrl?: string | null;
  link?: string | null;
  hashtags?: string[] | null;
  cta?: string | null;
  timeOverride?: string | null;
  publishedAt?: string | null;
  sortOrder?: number;
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
  } | null;
}

interface ApiScheduleRequest {
  name: string;
  description?: string;
  color?: string;
  platforms: SchedulePlatform[];
  targetPlatform: SchedulePlatform;
  socialIntegrationId: number;
  status: ScheduleStatus;
  scheduleType: ScheduleType;
  daysOfWeek?: string[];
  postingTime: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  customIntervalHours?: number | null;
  dailyPostLimit?: number | null;
  notifications: Schedule['notifications'];
  posts: ApiSchedulePostRequest[];
}

interface ApiSchedulePostRequest {
  id?: number | null;
  title: string;
  caption: string;
  platform: SchedulePlatform;
  scheduledAt: string;
  status: string;
  socialIntegrationId?: number | null;
  mediaUrl?: string | null;
  link?: string | null;
  hashtags: string[];
  cta?: string | null;
  timeOverride?: string | null;
  sortOrder: number;
}

interface ApiScheduleTemplate {
  id: number;
  name: string;
  description?: string | null;
  color?: string | null;
  platforms: SchedulePlatform[];
  scheduleType: string;
  daysOfWeek?: string[] | null;
  postingTime: string;
  timezone?: string | null;
  dailyPostLimit?: number | null;
  notifications?: Schedule['notifications'] | null;
}

function apiToSchedule(api: ApiSchedule): Schedule {
  const posts = (api.posts ?? []).map((post) => apiToPost(post, String(api.id)));
  return normalize({
    id: String(api.id),
    name: api.name,
    description: api.description ?? undefined,
    color: api.color ?? '#4f46e5',
    platforms: [api.targetPlatform ?? api.platforms?.[0] ?? 'FACEBOOK'],
    targetPlatform: api.targetPlatform ?? api.platforms?.[0] ?? 'FACEBOOK',
    socialIntegrationId: api.socialIntegrationId ?? undefined,
    targetAccountName: api.targetAccountName ?? undefined,
    status: toScheduleStatus(api.status),
    scheduleType: toScheduleType(api.scheduleType),
    daysOfWeek: api.daysOfWeek ?? [],
    postingTime: trimTime(api.postingTime),
    timezone: api.timezone,
    startDate: api.startDate,
    endDate: api.endDate ?? undefined,
    customIntervalHours: api.customIntervalHours ?? 5,
    linkedPostIds: (api.linkedPostIds ?? posts.map((post) => Number(post.id)))
      .filter((id) => Number.isFinite(id))
      .map(String),
    totalPosts: api.totalPosts ?? posts.length,
    postedCount: api.postedCount ?? 0,
    pendingCount: api.pendingCount ?? 0,
    failedCount: api.failedCount ?? 0,
    nextPostAt: api.nextPostAt ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    dailyPostLimit: api.dailyPostLimit ?? undefined,
    notifications: api.notifications ?? {
      publishSuccess: true,
      failure: true,
      nextPostReminder: true,
    },
    posts,
  });
}

function apiToPost(api: ApiSchedulePost, scheduleId: string): SchedulePost {
  const caption = api.caption ?? '';
  const mediaUrl = api.mediaUrl ?? undefined;
  return {
    id: String(api.id),
    scheduleId,
    title: api.title ?? 'Untitled post',
    caption,
    platform: api.platform,
    scheduledAt: api.scheduledAt ?? new Date().toISOString(),
    status: postStatusFromApi(api.status),
    publishedAt: api.publishedAt ?? undefined,
    thumbnailUrl: mediaUrl,
    mediaUrl,
    link: api.link ?? undefined,
    socialIntegrationId: api.socialIntegrationId ?? undefined,
    hashtags: api.hashtags ?? [],
    cta: api.cta ?? undefined,
    engagement: {
      likes: api.engagement?.likes ?? 0,
      comments: api.engagement?.comments ?? 0,
      shares: api.engagement?.shares ?? 0,
      views: api.engagement?.views,
    },
    hasMedia: Boolean(mediaUrl),
    hasCaption: caption.trim().length > 0,
    timeOverride: api.timeOverride ? trimTime(api.timeOverride) : undefined,
  };
}

function draftToApiRequest(schedule: Schedule, asDraft: boolean): ApiScheduleRequest {
  return scheduleToApiRequest({ ...schedule, status: asDraft ? 'draft' : schedule.status });
}

function scheduleToApiRequest(schedule: Schedule): ApiScheduleRequest {
  return {
    name: schedule.name,
    description: schedule.description,
    color: schedule.color,
    platforms: [schedule.targetPlatform],
    targetPlatform: schedule.targetPlatform,
    socialIntegrationId: schedule.socialIntegrationId!,
    status: schedule.status,
    scheduleType: schedule.scheduleType,
    daysOfWeek: schedule.daysOfWeek ?? [],
    postingTime: schedule.postingTime,
    timezone: schedule.timezone,
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    customIntervalHours: schedule.customIntervalHours ?? 5,
    dailyPostLimit: schedule.dailyPostLimit ?? null,
    notifications: schedule.notifications,
    posts: schedule.posts.map((post, index) => ({
      id: numericIdOrNull(post.id),
      title: post.title,
      caption: post.caption,
      platform: post.platform,
      scheduledAt: post.scheduledAt,
      status: postStatusToApi(post.status),
      socialIntegrationId: post.socialIntegrationId ?? null,
      mediaUrl: post.mediaUrl ?? post.thumbnailUrl ?? null,
      link: post.link ?? null,
      hashtags: post.hashtags ?? [],
      cta: post.cta ?? null,
      timeOverride: post.timeOverride ?? null,
      sortOrder: index,
    })),
  };
}

function apiToTemplate(api: ApiScheduleTemplate): ScheduleTemplate {
  return template(
    String(api.id),
    api.name,
    api.description ?? 'Reusable schedule template.',
    toScheduleType(api.scheduleType),
    api.platforms ?? ['FACEBOOK'],
    trimTime(api.postingTime),
    api.color ?? '#4f46e5',
    api.daysOfWeek ?? DAYS_OF_WEEK,
  );
}

function templateToApiRequest(template: ScheduleTemplate, draft: ScheduleDraft) {
  return {
    name: template.name,
    description: template.description,
    color: template.color,
    platforms: template.platforms,
    scheduleType: template.scheduleType,
    daysOfWeek: template.daysOfWeek ?? [],
    postingTime: template.postingTime,
    timezone: draft.timezone,
    dailyPostLimit: draft.dailyPostLimit ?? null,
    notifications: draft.notifications,
  };
}

function postStatusFromApi(status?: string | null): SchedulePostStatus {
  const normalized = (status ?? 'DRAFT').toLowerCase() as SchedulePostStatus;
  return normalized === 'not_posted' ||
    normalized === 'draft' ||
    normalized === 'pending' ||
    normalized === 'processing' ||
    normalized === 'scheduled' ||
    normalized === 'posted' ||
    normalized === 'failed' ||
    normalized === 'paused'
    ? normalized
    : 'draft';
}

function postStatusToApi(status: SchedulePostStatus): string {
  return status.toUpperCase();
}

function toScheduleStatus(status: string): ScheduleStatus {
  const normalized = status.toLowerCase() as ScheduleStatus;
  return SCHEDULE_STATUSES.includes(normalized) ? normalized : 'draft';
}

function toScheduleType(type: string): ScheduleType {
  const normalized = type.toLowerCase() as ScheduleType;
  return SCHEDULE_TYPES.includes(normalized) ? normalized : 'custom';
}

function trimTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function numericIdOrNull(id?: string): number | null {
  if (!id || !/^\d+$/.test(id)) {
    return null;
  }
  return Number(id);
}

const BEST_TIME_BY_PLATFORM: Record<SchedulePlatform, string> = {
  FACEBOOK: '19:30',
  INSTAGRAM: '20:00',
  TIKTOK: '21:00',
  YOUTUBE: '18:30',
  LINKEDIN: '10:30',
  X: '12:15',
  PINTEREST: '20:30',
};

const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'sch-new-arrivals',
    name: 'New Arrival Launch',
    description: 'A two-week content plan for catalog drops across visual channels.',
    color: '#4f46e5',
    platforms: ['FACEBOOK'],
    targetPlatform: 'FACEBOOK',
    customIntervalHours: 5,
    status: 'active',
    scheduleType: 'weekly',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    postingTime: '20:00',
    timezone: 'Asia/Dhaka',
    startDate: relativeIso(-10, '09:00').slice(0, 10),
    endDate: relativeIso(16, '09:00').slice(0, 10),
    linkedPostIds: [],
    totalPosts: 0,
    postedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    createdAt: relativeIso(-14, '10:00'),
    updatedAt: relativeIso(-1, '11:00'),
    dailyPostLimit: 3,
    notifications: { publishSuccess: true, failure: true, nextPostReminder: true },
    posts: [
      mockPost(
        'p-arr-1',
        'sch-new-arrivals',
        'Hero product reveal',
        'Meet the new summer collection with lightweight everyday pieces.',
        'INSTAGRAM',
        relativeIso(-6, '20:00'),
        'posted',
        { likes: 420, comments: 38, shares: 21, views: 9800 },
      ),
      mockPost(
        'p-arr-2',
        'sch-new-arrivals',
        'Behind the scenes reel',
        'A quick look at the launch shoot and styling notes.',
        'TIKTOK',
        relativeIso(-3, '21:00'),
        'posted',
        { likes: 810, comments: 64, shares: 58, views: 18400 },
      ),
      mockPost(
        'p-arr-3',
        'sch-new-arrivals',
        'Facebook carousel',
        'Swipe through the new arrivals and pick your favorite color.',
        'FACEBOOK',
        relativeIso(0, '19:30'),
        'scheduled',
        { likes: 0, comments: 0, shares: 0 },
      ),
      mockPost(
        'p-arr-4',
        'sch-new-arrivals',
        'Styling ideas',
        'Three ways to style the hero item this week.',
        'INSTAGRAM',
        relativeIso(2, '20:00'),
        'scheduled',
        { likes: 0, comments: 0, shares: 0 },
      ),
      mockPost(
        'p-arr-5',
        'sch-new-arrivals',
        'Creator cutdown',
        'Fast cuts for launch week momentum.',
        'TIKTOK',
        relativeIso(4, '21:00'),
        'draft',
        { likes: 0, comments: 0, shares: 0 },
        { hasCaption: false },
      ),
    ],
  },
  {
    id: 'sch-weekly-offer',
    name: 'Weekly Offer Campaign',
    description: 'Discount reminders, urgency posts, and weekend conversion pushes.',
    color: '#f97316',
    platforms: ['FACEBOOK'],
    targetPlatform: 'FACEBOOK',
    customIntervalHours: 5,
    status: 'paused',
    scheduleType: 'weekly',
    daysOfWeek: ['Thu', 'Fri', 'Sat'],
    postingTime: '19:30',
    timezone: 'Asia/Dhaka',
    startDate: relativeIso(-20, '09:00').slice(0, 10),
    linkedPostIds: [],
    totalPosts: 0,
    postedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    createdAt: relativeIso(-28, '14:00'),
    updatedAt: relativeIso(-2, '10:00'),
    dailyPostLimit: 2,
    notifications: { publishSuccess: true, failure: true, nextPostReminder: false },
    posts: [
      mockPost(
        'p-offer-1',
        'sch-weekly-offer',
        'Offer teaser',
        'This week’s offer opens tomorrow.',
        'FACEBOOK',
        relativeIso(-9, '19:30'),
        'posted',
        { likes: 190, comments: 14, shares: 11 },
      ),
      mockPost(
        'p-offer-2',
        'sch-weekly-offer',
        'Promo story reminder',
        'Last call for this week’s deal.',
        'INSTAGRAM',
        relativeIso(-5, '20:15'),
        'failed',
        { likes: 0, comments: 0, shares: 0 },
      ),
      mockPost(
        'p-offer-3',
        'sch-weekly-offer',
        'Weekend urgency',
        'Only 24 hours left to claim the offer.',
        'X',
        relativeIso(-1, '12:15'),
        'paused',
        { likes: 0, comments: 0, shares: 0 },
      ),
      mockPost(
        'p-offer-4',
        'sch-weekly-offer',
        'Final reminder',
        'Offer closes tonight.',
        'FACEBOOK',
        relativeIso(3, '19:30'),
        'paused',
        { likes: 0, comments: 0, shares: 0 },
      ),
    ],
  },
  {
    id: 'sch-b2b-monthly',
    name: 'Monthly B2B Content Plan',
    description: 'Thought leadership and product education for professional audiences.',
    color: '#0f766e',
    platforms: ['LINKEDIN'],
    targetPlatform: 'LINKEDIN',
    customIntervalHours: 5,
    status: 'active',
    scheduleType: 'monthly',
    daysOfWeek: ['Tue'],
    postingTime: '10:30',
    timezone: 'Asia/Dhaka',
    startDate: relativeIso(-45, '09:00').slice(0, 10),
    linkedPostIds: [],
    totalPosts: 0,
    postedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    createdAt: relativeIso(-50, '09:00'),
    updatedAt: relativeIso(-4, '09:00'),
    dailyPostLimit: 1,
    notifications: { publishSuccess: true, failure: true, nextPostReminder: true },
    posts: [
      mockPost(
        'p-b2b-1',
        'sch-b2b-monthly',
        'Market insight',
        'Three shifts we are seeing in social commerce operations.',
        'LINKEDIN',
        relativeIso(-21, '10:30'),
        'posted',
        { likes: 92, comments: 18, shares: 15 },
      ),
      mockPost(
        'p-b2b-2',
        'sch-b2b-monthly',
        'Product walkthrough',
        'A short workflow demo for campaign planning.',
        'YOUTUBE',
        relativeIso(5, '18:30'),
        'scheduled',
        { likes: 0, comments: 0, shares: 0 },
      ),
      mockPost(
        'p-b2b-3',
        'sch-b2b-monthly',
        'Founder note',
        'What we learned from customer scheduling patterns.',
        'LINKEDIN',
        relativeIso(18, '10:30'),
        'scheduled',
        { likes: 0, comments: 0, shares: 0 },
      ),
    ],
  },
  {
    id: 'sch-eid',
    name: 'Eid Campaign',
    description: 'A completed holiday plan with celebration posts and last-minute offers.',
    color: '#7c3aed',
    platforms: ['FACEBOOK'],
    targetPlatform: 'FACEBOOK',
    customIntervalHours: 5,
    status: 'completed',
    scheduleType: 'custom',
    daysOfWeek: ['Fri', 'Sat', 'Sun'],
    postingTime: '20:30',
    timezone: 'Asia/Dhaka',
    startDate: relativeIso(-60, '09:00').slice(0, 10),
    endDate: relativeIso(-32, '09:00').slice(0, 10),
    linkedPostIds: [],
    totalPosts: 0,
    postedCount: 0,
    pendingCount: 0,
    failedCount: 0,
    createdAt: relativeIso(-70, '09:00'),
    updatedAt: relativeIso(-30, '09:00'),
    notifications: { publishSuccess: false, failure: true, nextPostReminder: false },
    posts: [
      mockPost(
        'p-eid-1',
        'sch-eid',
        'Greeting post',
        'Eid Mubarak from our team.',
        'FACEBOOK',
        relativeIso(-45, '20:30'),
        'posted',
        { likes: 660, comments: 72, shares: 44 },
      ),
      mockPost(
        'p-eid-2',
        'sch-eid',
        'Gift guide',
        'Last-minute gift ideas for the long weekend.',
        'INSTAGRAM',
        relativeIso(-42, '20:30'),
        'posted',
        { likes: 740, comments: 49, shares: 63 },
      ),
      mockPost(
        'p-eid-3',
        'sch-eid',
        'Decor board',
        'Save these Eid celebration ideas.',
        'PINTEREST',
        relativeIso(-39, '20:30'),
        'posted',
        { likes: 380, comments: 21, shares: 112 },
      ),
    ],
  },
];
