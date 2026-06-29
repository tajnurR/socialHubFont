import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService, QueryParamValue } from '../../core/services/api.service';
import {
  AttachPostsRequest,
  BulkUploadResult,
  CreatePostRequest,
  CreateScheduleEventRequest,
  PostFilter,
  PostResponse,
  Product,
  ProductRequest,
  ScheduleEvent,
  UpdatePostRequest,
} from '../../shared/models/publishing.model';
import { SocialIntegration } from '../../shared/models/social-integration.model';
import { SocialPlatform } from '../../shared/models/social-platform.model';

/**
 * Feature service for bulk posting, scheduling, and the product catalog.
 * Names {@link ApiEndpoint}s and delegates to {@link ApiService}.
 */
@Injectable({ providedIn: 'root' })
export class PublishingService {
  private readonly api = inject(ApiService);

  // --- Posts ---------------------------------------------------------------

  listPosts(filter: PostFilter = {}): Observable<PostResponse[]> {
    const params: Record<string, QueryParamValue> = {};
    if (filter.keyword) params['keyword'] = filter.keyword;
    if (filter.status) params['status'] = filter.status;
    if (filter.platform) params['platform'] = filter.platform;
    if (filter.pageId != null) params['pageId'] = filter.pageId;
    if (filter.productId != null) params['productId'] = filter.productId;
    if (filter.scheduleId != null) params['scheduleId'] = filter.scheduleId;
    if (filter.from) params['from'] = filter.from;
    if (filter.to) params['to'] = filter.to;
    return this.api.get<PostResponse[]>(ApiEndpoint.POSTS, { params });
  }

  listAccounts(): Observable<SocialIntegration[]> {
    return this.api.get<SocialIntegration[]>(ApiEndpoint.INTEGRATIONS);
  }

  getPost(id: number): Observable<PostResponse> {
    return this.api.get<PostResponse>(ApiEndpoint.POST_BY_ID, { pathParams: { id } });
  }

  createPost(body: CreatePostRequest): Observable<PostResponse> {
    return this.api.post<PostResponse>(ApiEndpoint.POSTS, body);
  }

  updatePost(id: number, body: UpdatePostRequest): Observable<PostResponse> {
    return this.api.put<PostResponse>(ApiEndpoint.POST_BY_ID, body, { pathParams: { id } });
  }

  deletePost(id: number): Observable<void> {
    return this.api.delete<void>(ApiEndpoint.POST_BY_ID, { pathParams: { id } });
  }

  publishPost(id: number): Observable<PostResponse> {
    return this.api.post<PostResponse>(ApiEndpoint.POST_PUBLISH, undefined, { pathParams: { id } });
  }

  /** Downloads the bulk-upload Excel template as a blob. */
  downloadTemplate(platform: SocialPlatform): Observable<Blob> {
    return this.api.get<Blob>(ApiEndpoint.POSTS_TEMPLATE, {
      params: { platform },
      responseType: 'blob',
    });
  }

  /** Uploads a filled template; the backend imports valid rows as DRAFT posts. */
  bulkUpload(platform: SocialPlatform, file: File): Observable<BulkUploadResult> {
    const form = new FormData();
    form.append('platform', platform);
    form.append('file', file);
    return this.api.post<BulkUploadResult>(ApiEndpoint.POSTS_BULK_UPLOAD, form);
  }

  // --- Products ------------------------------------------------------------

  listProducts(): Observable<Product[]> {
    return this.api.get<Product[]>(ApiEndpoint.PRODUCTS);
  }

  createProduct(body: ProductRequest): Observable<Product> {
    return this.api.post<Product>(ApiEndpoint.PRODUCTS, body);
  }

  updateProduct(id: number, body: ProductRequest): Observable<Product> {
    return this.api.put<Product>(ApiEndpoint.PRODUCT_BY_ID, body, { pathParams: { id } });
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(ApiEndpoint.PRODUCT_BY_ID, { pathParams: { id } });
  }

  // --- Schedule events -----------------------------------------------------

  listScheduleEvents(): Observable<ScheduleEvent[]> {
    return this.api.get<ScheduleEvent[]>(ApiEndpoint.SCHEDULE_EVENTS);
  }

  createScheduleEvent(body: CreateScheduleEventRequest): Observable<ScheduleEvent> {
    return this.api.post<ScheduleEvent>(ApiEndpoint.SCHEDULE_EVENTS, body);
  }

  attachPosts(eventId: number, body: AttachPostsRequest): Observable<ScheduleEvent> {
    return this.api.post<ScheduleEvent>(ApiEndpoint.SCHEDULE_EVENT_POSTS, body, {
      pathParams: { id: eventId },
    });
  }
}
