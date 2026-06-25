import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import {
  ConnectIntegrationRequest,
  CreatePostRequest,
  CreatePostResponse,
  FacebookCredentialStatus,
  FacebookExchangeResult,
  IntegrationPostPage,
  SocialIntegration,
} from '../../../shared/models/social-integration.model';
import { ProviderInfo } from '../../../shared/models/social-platform.model';

/**
 * Thin feature service for social integrations. Every call names an
 * {@link ApiEndpoint} and delegates to {@link ApiService} — no URLs, no HttpClient.
 */
@Injectable({ providedIn: 'root' })
export class SocialIntegrationsService {
  private readonly api = inject(ApiService);

  listProviders(): Observable<ProviderInfo[]> {
    return this.api.get<ProviderInfo[]>(ApiEndpoint.INTEGRATION_PROVIDERS);
  }

  list(): Observable<SocialIntegration[]> {
    return this.api.get<SocialIntegration[]>(ApiEndpoint.INTEGRATIONS);
  }

  connect(body: ConnectIntegrationRequest): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.INTEGRATIONS, body);
  }

  disconnect(id: number): Observable<void> {
    return this.api.delete<void>(ApiEndpoint.INTEGRATION_BY_ID, { pathParams: { id } });
  }

  getPosts(id: number, cursor?: string): Observable<IntegrationPostPage> {
    return this.api.get<IntegrationPostPage>(ApiEndpoint.INTEGRATION_POSTS, {
      pathParams: { id },
      params: cursor ? { cursor } : undefined,
    });
  }

  createPost(id: number, body: CreatePostRequest): Observable<CreatePostResponse> {
    return this.api.post<CreatePostResponse>(ApiEndpoint.INTEGRATION_POSTS, body, {
      pathParams: { id },
    });
  }

  // --- Facebook OAuth flow ---

  /** Per-org Facebook app credential status (configured? + masked hint). */
  facebookCredentialStatus(): Observable<FacebookCredentialStatus> {
    return this.api.get<FacebookCredentialStatus>(ApiEndpoint.FACEBOOK_CREDENTIALS);
  }

  /** Validate + store the org's Facebook app credentials. */
  saveFacebookCredentials(appId: string, appSecret: string): Observable<FacebookCredentialStatus> {
    return this.api.post<FacebookCredentialStatus>(ApiEndpoint.FACEBOOK_CREDENTIALS, {
      appId,
      appSecret,
    });
  }

  /** Send the short-lived FB user token; get back selectable pages. */
  facebookExchange(shortLivedToken: string): Observable<FacebookExchangeResult> {
    return this.api.post<FacebookExchangeResult>(ApiEndpoint.FACEBOOK_OAUTH_EXCHANGE, {
      shortLivedToken,
    });
  }

  /** Persist a chosen page from a prior exchange. */
  facebookConnect(exchangeId: string, pageId: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.FACEBOOK_OAUTH_CONNECT, {
      exchangeId,
      pageId,
    });
  }

  /** Replace an existing integration's token in place using a fresh exchange. */
  reauth(id: number, exchangeId: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.INTEGRATION_REAUTH, { exchangeId }, {
      pathParams: { id },
    });
  }
}
