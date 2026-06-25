import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiEndpoint } from '../../core/constants/api-endpoints';
import { ApiService } from '../../core/services/api.service';
import { ProviderInfo } from '../../shared/models/social-platform.model';

/**
 * Thin feature service: references endpoints via {@link ApiEndpoint} and delegates
 * to {@link ApiService}. Never builds URLs or touches HttpClient.
 */
@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly api = inject(ApiService);

  listProviders(): Observable<ProviderInfo[]> {
    return this.api.get<ProviderInfo[]>(ApiEndpoint.INTEGRATION_PROVIDERS);
  }
}
