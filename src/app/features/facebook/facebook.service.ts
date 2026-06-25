import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { Post } from '../../shared/models/post.model';

/**
 * Canonical example of a per-platform feature service (backend endpoints are
 * stubs for now). Shows the consumption pattern, including path params.
 *
 * Add a method here that names an {@link ApiEndpoint}; pass `:token` values via
 * `{ pathParams: { ... } }`. Do not build URLs or inject HttpClient.
 */
@Injectable({ providedIn: 'root' })
export class FacebookService {
  private readonly api = inject(ApiService);

  getPosts(): Observable<Post[]> {
    return this.api.get<Post[]>(ApiEndpoint.FACEBOOK_POSTS);
  }

  getPost(id: string): Observable<Post> {
    return this.api.get<Post>(ApiEndpoint.FACEBOOK_POST_BY_ID, { pathParams: { id } });
  }
}
