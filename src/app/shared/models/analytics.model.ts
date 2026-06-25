import { SocialPlatform } from './social-platform.model';

/** Mirrors the backend `AnalyticsSummary` DTO (GET /analytics/summary). */
export interface AnalyticsSummary {
  totalAccounts: number;
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  postsByPlatform: Partial<Record<SocialPlatform, number>>;
}
