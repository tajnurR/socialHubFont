import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../../core/constants/api-endpoints';
import { ApiService } from '../../../core/services/api.service';
import {
  ConnectIntegrationRequest,
  CreatePostRequest,
  CreatePostResponse,
  FacebookCredentialConfig,
  FacebookCredentialConfigRequest,
  FacebookCredentialConfigUpdateRequest,
  FacebookCredentialStatus,
  FacebookExchangeResult,
  GoogleDriveAuthorizationUrl,
  GoogleDriveConnection,
  GoogleDriveCredentialConfig,
  GoogleDriveCredentialConfigRequest,
  GoogleDriveFile,
  GoogleDriveFiles,
  GoogleDriveTestResult,
  InstagramAuthorizationUrl,
  InstagramExchangeResult,
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

  createPost(id: number, body: CreatePostRequest): Observable<CreatePostResponse> {
    return this.api.post<CreatePostResponse>(ApiEndpoint.INTEGRATION_POSTS, body, {
      pathParams: { id },
    });
  }

  // --- Facebook OAuth flow ---

  /** Primary Facebook app credential status (configured? + masked hint). */
  facebookCredentialStatus(): Observable<FacebookCredentialStatus> {
    return this.api.get<FacebookCredentialStatus>(ApiEndpoint.FACEBOOK_CREDENTIALS);
  }

  /** Validate + store the user's primary Facebook app credentials. */
  saveFacebookCredentials(appId: string, appSecret: string): Observable<FacebookCredentialStatus> {
    return this.api.post<FacebookCredentialStatus>(ApiEndpoint.FACEBOOK_CREDENTIALS, {
      appId,
      appSecret,
    });
  }

  /** List the current user's Facebook app configs. */
  facebookCredentialConfigs(): Observable<FacebookCredentialConfig[]> {
    return this.api.get<FacebookCredentialConfig[]>(ApiEndpoint.FACEBOOK_CREDENTIAL_CONFIGS);
  }

  /** Add another Facebook app config for the current user. */
  createFacebookCredentialConfig(
    body: FacebookCredentialConfigRequest,
  ): Observable<FacebookCredentialConfig> {
    return this.api.post<FacebookCredentialConfig>(ApiEndpoint.FACEBOOK_CREDENTIAL_CONFIGS, body);
  }

  updateFacebookCredentialConfig(
    id: number,
    body: FacebookCredentialConfigUpdateRequest,
  ): Observable<FacebookCredentialConfig> {
    return this.api.put<FacebookCredentialConfig>(ApiEndpoint.FACEBOOK_CREDENTIAL_CONFIG_BY_ID, body, {
      pathParams: { id },
    });
  }

  deleteFacebookCredentialConfig(id: number): Observable<void> {
    return this.api.delete<void>(ApiEndpoint.FACEBOOK_CREDENTIAL_CONFIG_BY_ID, {
      pathParams: { id },
    });
  }

  /** Send the short-lived FB user token; get back selectable pages. */
  facebookExchange(shortLivedToken: string, configId?: number): Observable<FacebookExchangeResult> {
    return this.api.post<FacebookExchangeResult>(ApiEndpoint.FACEBOOK_OAUTH_EXCHANGE, {
      shortLivedToken,
      configId,
    });
  }

  /** Persist a chosen page from a prior exchange. */
  facebookConnect(exchangeId: string, pageId: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.FACEBOOK_OAUTH_CONNECT, {
      exchangeId,
      pageId,
    });
  }

  /** Persist selected pages from a prior exchange. */
  facebookConnectPages(exchangeId: string, pageIds: string[]): Observable<SocialIntegration[]> {
    return this.api.post<SocialIntegration[]>(ApiEndpoint.FACEBOOK_OAUTH_CONNECT_PAGES, {
      exchangeId,
      pageIds,
    });
  }

  instagramExchange(shortLivedToken: string, configId?: number): Observable<InstagramExchangeResult> {
    return this.api.post<InstagramExchangeResult>(ApiEndpoint.INSTAGRAM_OAUTH_EXCHANGE, {
      shortLivedToken,
      configId,
    });
  }

  instagramAuthorizationUrl(
    redirectUri: string,
    configId?: number,
  ): Observable<InstagramAuthorizationUrl> {
    return this.api.post<InstagramAuthorizationUrl>(ApiEndpoint.INSTAGRAM_AUTHORIZATION_URL, {
      redirectUri,
      configId,
    });
  }

  instagramOAuthCallback(code: string, state: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.INSTAGRAM_OAUTH_CALLBACK, {
      code,
      state,
    });
  }

  instagramConnect(exchangeId: string, accountId: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(ApiEndpoint.INSTAGRAM_OAUTH_CONNECT, {
      exchangeId,
      accountId,
    });
  }

  instagramConnectAccounts(exchangeId: string, accountIds: string[]): Observable<SocialIntegration[]> {
    return this.api.post<SocialIntegration[]>(ApiEndpoint.INSTAGRAM_OAUTH_CONNECT_ACCOUNTS, {
      exchangeId,
      accountIds,
    });
  }

  instagramCredentialConfigs(): Observable<FacebookCredentialConfig[]> {
    return this.api.get<FacebookCredentialConfig[]>(ApiEndpoint.INSTAGRAM_CREDENTIAL_CONFIGS);
  }

  createInstagramCredentialConfig(
    body: FacebookCredentialConfigRequest,
  ): Observable<FacebookCredentialConfig> {
    return this.api.post<FacebookCredentialConfig>(ApiEndpoint.INSTAGRAM_CREDENTIAL_CONFIGS, body);
  }

  /** Replace an existing integration's token in place using a fresh exchange. */
  reauth(id: number, exchangeId: string): Observable<SocialIntegration> {
    return this.api.post<SocialIntegration>(
      ApiEndpoint.INTEGRATION_REAUTH,
      { exchangeId },
      {
        pathParams: { id },
      },
    );
  }

  // --- Google Drive storage integration ---

  googleDriveStatus(): Observable<GoogleDriveConnection> {
    return this.api.get<GoogleDriveConnection>(ApiEndpoint.GOOGLE_DRIVE);
  }

  googleDriveAuthorizationUrl(
    redirectUri: string,
    configId?: number,
  ): Observable<GoogleDriveAuthorizationUrl> {
    return this.api.post<GoogleDriveAuthorizationUrl>(ApiEndpoint.GOOGLE_DRIVE_AUTHORIZATION_URL, {
      redirectUri,
      configId,
    });
  }

  googleDriveOAuthCallback(code: string, state: string): Observable<GoogleDriveConnection> {
    return this.api.post<GoogleDriveConnection>(ApiEndpoint.GOOGLE_DRIVE_OAUTH_CALLBACK, {
      code,
      state,
    });
  }

  disconnectGoogleDrive(): Observable<GoogleDriveConnection> {
    return this.api.post<GoogleDriveConnection>(ApiEndpoint.GOOGLE_DRIVE_DISCONNECT);
  }

  testGoogleDrive(): Observable<GoogleDriveTestResult> {
    return this.api.post<GoogleDriveTestResult>(ApiEndpoint.GOOGLE_DRIVE_TEST);
  }

  listGoogleDriveFiles(): Observable<GoogleDriveFiles> {
    return this.api.get<GoogleDriveFiles>(ApiEndpoint.GOOGLE_DRIVE_FILES);
  }

  uploadGoogleDriveFile(file: File): Observable<GoogleDriveFile> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<GoogleDriveFile>(ApiEndpoint.GOOGLE_DRIVE_FILES, form);
  }

  googleDriveCredentialConfigs(): Observable<GoogleDriveCredentialConfig[]> {
    return this.api.get<GoogleDriveCredentialConfig[]>(ApiEndpoint.GOOGLE_DRIVE_CREDENTIAL_CONFIGS);
  }

  createGoogleDriveCredentialConfig(
    body: GoogleDriveCredentialConfigRequest,
  ): Observable<GoogleDriveCredentialConfig> {
    return this.api.post<GoogleDriveCredentialConfig>(
      ApiEndpoint.GOOGLE_DRIVE_CREDENTIAL_CONFIGS,
      body,
    );
  }
}
