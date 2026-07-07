export type SchedulePlatform =
  'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'LINKEDIN' | 'X' | 'PINTEREST';

export type ScheduleStatus = 'active' | 'paused' | 'draft' | 'completed';
export type ScheduleType = 'one-time' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type SchedulePostStatus =
  'draft' | 'pending' | 'processing' | 'scheduled' | 'posted' | 'not_posted' | 'failed' | 'paused';
export type ScheduleSort = 'newest' | 'nextPost' | 'mostPosts' | 'completionRate';
export type ScheduleView = 'cards' | 'table' | 'calendar';

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  color?: string;
  platforms: SchedulePlatform[];
  targetPlatform: SchedulePlatform;
  socialIntegrationId?: number;
  targetAccountName?: string;
  status: ScheduleStatus;
  scheduleType: ScheduleType;
  daysOfWeek?: string[];
  postingTime: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  customIntervalHours?: number;
  linkedPostIds: string[];
  totalPosts: number;
  postedCount: number;
  pendingCount: number;
  failedCount: number;
  nextPostAt?: string;
  createdAt: string;
  updatedAt: string;
  dailyPostLimit?: number;
  notifications: ScheduleNotifications;
  posts: SchedulePost[];
}

export interface SchedulePost {
  id: string;
  scheduleId: string;
  title: string;
  caption: string;
  platform: SchedulePlatform;
  scheduledAt: string;
  status: SchedulePostStatus;
  publishedAt?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  link?: string;
  socialIntegrationId?: number;
  hashtags: string[];
  cta?: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
  hasMedia: boolean;
  hasCaption: boolean;
  timeOverride?: string;
  sortOrder?: number;
}

export interface ScheduleNotifications {
  publishSuccess: boolean;
  failure: boolean;
  nextPostReminder: boolean;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  scheduleType: ScheduleType;
  platforms: SchedulePlatform[];
  postingTime: string;
  daysOfWeek?: string[];
  color: string;
}

export interface BestTimeSuggestion {
  platform: SchedulePlatform;
  window: string;
  confidence: 'High engagement' | 'Medium engagement' | 'Learning';
  time: string;
}

export interface ConflictWarning {
  id: string;
  title: string;
  detail: string;
  severity: 'warning' | 'critical';
  postIds: string[];
}

export interface ScheduleInsight {
  id: string;
  text: string;
  tone: 'good' | 'warning' | 'critical' | 'info';
}

export interface ScheduleFilters {
  search: string;
  platform: 'all' | SchedulePlatform;
  status: 'all' | ScheduleStatus;
  frequency: 'all' | ScheduleType;
  from: string;
  to: string;
  sort: ScheduleSort;
}

export interface ScheduleDraft {
  id?: string;
  name: string;
  description?: string;
  status: ScheduleStatus;
  color: string;
  platforms: SchedulePlatform[];
  targetPlatform: SchedulePlatform;
  socialIntegrationId?: number | null;
  scheduleType: ScheduleType;
  daysOfWeek: string[];
  postingTime: string;
  timezone: string;
  startDate: string;
  endDate?: string;
  customIntervalHours?: number | null;
  dailyPostLimit?: number | null;
  linkedPostIds: string[];
  notifications: ScheduleNotifications;
  posts: SchedulePost[];
}

export const SCHEDULE_PLATFORMS: SchedulePlatform[] = [
  'FACEBOOK',
  'INSTAGRAM',
  'TIKTOK',
  'YOUTUBE',
  'LINKEDIN',
  'X',
  'PINTEREST',
];

export const SCHEDULE_STATUSES: ScheduleStatus[] = ['active', 'paused', 'draft', 'completed'];
export const SCHEDULE_TYPES: ScheduleType[] = ['one-time', 'daily', 'weekly', 'monthly', 'custom'];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const PLATFORM_META: Record<
  SchedulePlatform,
  { label: string; icon: string; tone: string }
> = {
  FACEBOOK: { label: 'Facebook', icon: 'f', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  INSTAGRAM: { label: 'Instagram', icon: '◎', tone: 'bg-pink-50 text-pink-700 border-pink-100' },
  TIKTOK: { label: 'TikTok', icon: '♪', tone: 'bg-slate-900 text-white border-slate-900' },
  YOUTUBE: { label: 'YouTube', icon: '▶', tone: 'bg-red-50 text-red-700 border-red-100' },
  LINKEDIN: { label: 'LinkedIn', icon: 'in', tone: 'bg-sky-50 text-sky-700 border-sky-100' },
  X: { label: 'X', icon: '𝕏', tone: 'bg-slate-100 text-slate-800 border-slate-200' },
  PINTEREST: { label: 'Pinterest', icon: 'P', tone: 'bg-rose-50 text-rose-700 border-rose-100' },
};

export const SCHEDULE_COLORS = [
  '#4f46e5',
  '#0f766e',
  '#f97316',
  '#7c3aed',
  '#0ea5e9',
  '#ec4899',
  '#64748b',
];
