/** Mirrors the backend Facebook analytics DTOs (`FacebookAnalyticsDtos`). */
import { IntegrationStatus } from './social-integration.model';

export interface ConnectedPage {
  integrationId: number;
  pageId: string;
  name?: string | null;
  status: IntegrationStatus;
}

export interface PageInfo {
  pageId: string;
  name?: string | null;
  category?: string | null;
  pictureUrl?: string | null;
  fanCount?: number | null;
  tokenHealthy: boolean;
}

export interface BestPost {
  id: string;
  message?: string | null;
  engagement: number;
  permalinkUrl?: string | null;
}

export interface KpiSummary {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReactions: number;
  totalEngagement: number;
  avgEngagementPerPost: number;
  bestPost?: BestPost | null;
}

/** % change vs the previous equal-length period; field is null when undefined. */
export interface PeriodComparison {
  posts?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  reactions?: number | null;
  engagement?: number | null;
}

export interface TimeSeriesPoint {
  date: string;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  engagement: number;
}

export interface PostRow {
  id: string;
  message?: string | null;
  fullPicture?: string | null;
  permalinkUrl?: string | null;
  createdTime?: string | null;
  likes: number;
  comments: number;
  shares: number;
  reactions: number;
  engagement: number;
}

export interface AnalyticsDashboard {
  page: PageInfo;
  summary: KpiSummary;
  comparison?: PeriodComparison | null;
  series: TimeSeriesPoint[];
  posts: PostRow[];
}

export type AnalyticsSortBy = 'DATE' | 'LIKES' | 'COMMENTS' | 'SHARES' | 'ENGAGEMENT';
export type AnalyticsSortOrder = 'ASC' | 'DESC';
export type AnalyticsGranularity = 'DAY' | 'WEEK';

/** Combinable filter/sort params for the analytics endpoint. */
export interface AnalyticsFilter {
  from?: string;
  to?: string;
  minLikes?: number;
  minComments?: number;
  sortBy?: AnalyticsSortBy;
  order?: AnalyticsSortOrder;
  granularity?: AnalyticsGranularity;
}
