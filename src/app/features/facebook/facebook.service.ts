import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import {
  AnalyticsDashboard,
  AnalyticsFilter,
  ConnectedPage,
} from '../../shared/models/facebook-analytics.model';

/**
 * Thin feature service for the Facebook analytics module. Names an
 * {@link ApiEndpoint} and delegates to {@link ApiService}.
 */
@Injectable({ providedIn: 'root' })
export class FacebookService {
  private readonly api = inject(ApiService);

  /** Connected Facebook Pages for the current organization. */
  pages(): Observable<ConnectedPage[]> {
    return this.api.get<ConnectedPage[]>(ApiEndpoint.FACEBOOK_PAGES);
  }

  /** Full dashboard payload (page info + KPIs + series + filtered/sorted posts). */
  analytics(integrationId: number, filter: AnalyticsFilter = {}): Observable<AnalyticsDashboard> {
    const params: Record<string, string | number> = {};
    if (filter.from) params['from'] = filter.from;
    if (filter.to) params['to'] = filter.to;
    if (filter.minLikes != null) params['minLikes'] = filter.minLikes;
    if (filter.minComments != null) params['minComments'] = filter.minComments;
    if (filter.sortBy) params['sortBy'] = filter.sortBy;
    if (filter.order) params['order'] = filter.order;
    if (filter.granularity) params['granularity'] = filter.granularity;

    return this.api.get<AnalyticsDashboard>(ApiEndpoint.FACEBOOK_PAGE_ANALYTICS, {
      pathParams: { integrationId },
      params,
    });
  }
}
