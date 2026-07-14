import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  GoogleDriveConnection,
  IntegrationStatus,
  SocialIntegration,
} from '../../../shared/models/social-integration.model';
import { SocialPlatform } from '../../../shared/models/social-platform.model';
import { FacebookAuthService } from './facebook-auth.service';
import { SocialIntegrationsService } from './social-integrations.service';

type IntegrationCategory = 'social' | 'storage' | 'ai';
type IntegrationKey =
  | SocialPlatform
  | 'GOOGLE_DRIVE'
  | 'ONEDRIVE'
  | 'CHATGPT'
  | 'CLAUDE'
  | 'GEMINI';
type IntegrationAction = 'facebook' | 'instagram' | 'linkedin' | 'google-drive' | 'planned';
const GOOGLE_DRIVE_GUIDE_URL = '/google_drive_oauth_2026_ui_guide.html';
const INSTAGRAM_GUIDE_URL = '/instagram_app_setup_instruction_simple.html';
const LINKEDIN_GUIDE_URL = '/linkedin_app_setup_instruction.html';

interface IntegrationDefinition {
  key: IntegrationKey;
  category: IntegrationCategory;
  name: string;
  icon: string;
  tone: string;
  description: string;
  action: IntegrationAction;
  instructions: string[];
}

interface IntegrationCard extends IntegrationDefinition {
  connected: boolean;
  status: IntegrationStatus | 'DISCONNECTED';
  connectedCount: number;
  detail: string;
}

/** Lists available integrations grouped by category with connect/help actions. */
@Component({
  selector: 'app-integrations-list',
  imports: [RouterLink, PageHeader],
  template: `
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <app-page-header
          title="Social Integrations"
          subtitle="Connect social, storage, and AI platforms from one place"
        />
        <a
          routerLink="add"
          class="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          Add Facebook Page
        </a>
      </div>

      @if (loading()) {
        <section class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading integrations...
        </section>
      } @else if (error()) {
        <section class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {{ error() }}
        </section>
      }

      <section class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase text-slate-500">Connected</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ connectedTotal() }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase text-slate-500">Reconnect needed</p>
          <p class="mt-1 text-2xl font-semibold text-amber-700">{{ reconnectTotal() }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs font-medium uppercase text-slate-500">Available platforms</p>
          <p class="mt-1 text-2xl font-semibold text-slate-900">{{ definitions.length }}</p>
        </div>
      </section>

      @for (category of categories; track category.id) {
        <section class="space-y-3">
          <div class="flex items-end justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-slate-900">{{ category.title }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ category.description }}</p>
            </div>
            <span class="hidden text-xs font-medium uppercase text-slate-400 sm:inline">
              {{ cardsByCategory(category.id).length }} platforms
            </span>
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (card of cardsByCategory(category.id); track card.key) {
              <article class="flex min-h-64 flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        [class]="card.tone"
                      >
                        {{ card.icon }}
                      </div>
                      <div class="min-w-0">
                        <h3 class="truncate text-sm font-semibold text-slate-900">{{ card.name }}</h3>
                        <p class="mt-1 text-xs text-slate-500">{{ card.detail }}</p>
                      </div>
                    </div>
                    <span
                      class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
                      [class]="statusClass(card.status)"
                    >
                      {{ statusLabel(card) }}
                    </span>
                  </div>

                  <p class="mt-4 min-h-12 text-sm leading-6 text-slate-600">{{ card.description }}</p>

                  @if (card.status === 'REAUTH_REQUIRED') {
                    <p class="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      The stored token needs a fresh authorization.
                    </p>
                  }
                </div>

                <div class="mt-5 flex flex-wrap items-center gap-2">
                  @if (card.action === 'facebook') {
                    @if (card.status === 'REAUTH_REQUIRED') {
                      <button
                        type="button"
                        class="rounded-md bg-[#1877F2] px-3 py-2 text-xs font-semibold text-white hover:bg-[#166fe0] disabled:opacity-60"
                        [disabled]="busyKey() === card.key"
                        (click)="reconnectFirstFacebook()"
                      >
                        {{ busyKey() === card.key ? 'Reconnecting...' : 'Reconnect' }}
                      </button>
                    } @else {
                      <a
                        routerLink="add"
                        class="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        {{ card.connected ? 'Connect another' : 'Connect' }}
                      </a>
                    }
                    @if (card.connected) {
                      <button
                        type="button"
                        class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        [disabled]="busyKey() === card.key"
                        (click)="removePlatform('FACEBOOK')"
                      >
                        Remove
                      </button>
                    }
                  } @else if (card.action === 'instagram') {
                    <a
                      routerLink="instagram"
                      class="rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                    >
                      {{ card.connected ? 'Connect another' : 'Connect' }}
                    </a>
                    @if (card.connected) {
                      <button
                        type="button"
                        class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        [disabled]="busyKey() === card.key"
                        (click)="removePlatform('INSTAGRAM')"
                      >
                        Remove
                      </button>
                    }
                  } @else if (card.action === 'linkedin') {
                    <a
                      routerLink="linkedin"
                      class="rounded-md bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800"
                    >
                      {{ card.connected ? 'Connect another' : 'Connect' }}
                    </a>
                    @if (card.connected) {
                      <button
                        type="button"
                        class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        [disabled]="busyKey() === card.key"
                        (click)="removePlatform('LINKEDIN')"
                      >
                        Remove
                      </button>
                    }
                  } @else if (card.action === 'google-drive') {
                    <a
                      routerLink="storage-drive"
                      class="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      {{ card.connected ? 'Manage' : 'Connect' }}
                    </a>
                    @if (card.connected) {
                      <button
                        type="button"
                        class="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        [disabled]="busyKey() === card.key"
                        (click)="removeGoogleDrive()"
                      >
                        Remove
                      </button>
                    }
                  } @else {
                    <button
                      type="button"
                      disabled
                      class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                    >
                      Connect
                    </button>
                  }

                  <button
                    type="button"
                    class="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    (click)="openHelp(card)"
                  >
                    How to connect
                  </button>
                </div>
              </article>
            }
          </div>
        </section>
      }
    </div>

    @if (helpCard(); as card) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" (click)="closeHelp()">
        <section class="w-full max-w-xl rounded-lg bg-white shadow-2xl" (click)="$event.stopPropagation()">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <p class="text-xs font-semibold uppercase text-slate-500">How to connect</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-900">{{ card.name }}</h2>
            </div>
            <button
              type="button"
              class="rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              (click)="closeHelp()"
            >
              Close
            </button>
          </div>
          <div class="space-y-3 px-5 py-5">
            @for (step of card.instructions; track step; let index = $index) {
              <div class="flex gap-3">
                <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {{ index + 1 }}
                </span>
                <p class="text-sm leading-6 text-slate-600">{{ step }}</p>
              </div>
            }
          </div>
        </section>
      </div>
    }
  `,
})
export class IntegrationsList implements OnInit {
  private readonly service = inject(SocialIntegrationsService);
  private readonly facebookAuth = inject(FacebookAuthService);
  private readonly notifications = inject(NotificationService);
  private readonly confirm = inject(ConfirmService);

  protected readonly integrations = signal<SocialIntegration[]>([]);
  protected readonly driveConnection = signal<GoogleDriveConnection | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busyKey = signal<IntegrationKey | null>(null);
  protected readonly helpCard = signal<IntegrationCard | null>(null);

  protected readonly categories = [
    {
      id: 'social' as const,
      title: 'Social Media',
      description: 'Connect publishing and analytics channels.',
    },
    {
      id: 'storage' as const,
      title: 'Storage',
      description: 'Connect file storage for media assets.',
    },
    {
      id: 'ai' as const,
      title: 'AI Tools',
      description: 'Prepare AI assistants for content workflows.',
    },
  ];

  protected readonly definitions: IntegrationDefinition[] = [
    {
      key: 'FACEBOOK',
      category: 'social',
      name: 'Facebook',
      icon: 'f',
      tone: 'bg-[#1877F2]',
      action: 'facebook',
      description: 'Connect Facebook Pages for publishing, analytics, and page insights.',
      instructions: [
        'Create or select your Meta app credentials in the Add Integration flow.',
        'Open the Facebook popup and approve Page permissions for the selected app.',
        'Choose one or more Pages returned by Facebook and connect them.',
      ],
    },
    {
      key: 'INSTAGRAM',
      category: 'social',
      name: 'Instagram',
      icon: 'IG',
      tone: 'bg-rose-600',
      action: 'instagram',
      description: 'Connect Instagram professional accounts for media publishing and scheduling.',
      instructions: [
        'Use a saved Meta app that has Instagram Basic and Content Publishing permissions.',
        'Approve Meta Login for a Facebook Page linked to an Instagram Business or Creator account.',
        'Select one or more returned Instagram accounts to connect.',
      ],
    },
    {
      key: 'X',
      category: 'social',
      name: 'X.com',
      icon: 'X',
      tone: 'bg-slate-950',
      action: 'planned',
      description: 'Prepare X.com publishing and account analytics integration.',
      instructions: [
        'Create an X developer app and enable OAuth access.',
        'Prepare the API key, secret, and callback URL.',
        'Connect from this page when the X provider is enabled.',
      ],
    },
    {
      key: 'LINKEDIN',
      category: 'social',
      name: 'LinkedIn',
      icon: 'in',
      tone: 'bg-sky-700',
      action: 'linkedin',
      description: 'Connect your personal LinkedIn profile for professional content publishing.',
      instructions: [
        'Create a LinkedIn developer app and add the SocialHub redirect URL under Auth.',
        'Enable Sign in with LinkedIn using OpenID Connect and Share on LinkedIn.',
        'Connect with openid, profile, email, and w_member_social to publish to your profile.',
      ],
    },
    {
      key: 'YOUTUBE',
      category: 'social',
      name: 'YouTube',
      icon: 'YT',
      tone: 'bg-red-600',
      action: 'planned',
      description: 'Plan YouTube publishing and channel media workflows.',
      instructions: [
        'Create a Google Cloud OAuth app with YouTube scopes.',
        'Approve the channel account that will own uploaded content.',
        'Connect from this page when YouTube support is enabled.',
      ],
    },
    {
      key: 'TIKTOK',
      category: 'social',
      name: 'TikTok',
      icon: 'TT',
      tone: 'bg-cyan-700',
      action: 'planned',
      description: 'Prepare TikTok account connection for short-form video campaigns.',
      instructions: [
        'Create a TikTok developer app and configure the redirect URL.',
        'Request the scopes needed for account and publishing access.',
        'Connect from this page when TikTok support is enabled.',
      ],
    },
    {
      key: 'GOOGLE_DRIVE',
      category: 'storage',
      name: 'Google Drive',
      icon: 'GD',
      tone: 'bg-emerald-600',
      action: 'google-drive',
      description: 'Store uploaded images and videos in the user-owned Google Drive account.',
      instructions: [
        'Add a Google OAuth client ID and client secret in the Drive management screen.',
        'Start the OAuth flow and approve Drive file access for your account.',
        'Use the Media Library to upload files into your connected Drive.',
      ],
    },
    {
      key: 'ONEDRIVE',
      category: 'storage',
      name: 'OneDrive',
      icon: 'OD',
      tone: 'bg-blue-700',
      action: 'planned',
      description: 'Prepare Microsoft OneDrive storage for future media library support.',
      instructions: [
        'Create an Azure app registration for OneDrive access.',
        'Prepare delegated file permissions and redirect URL.',
        'Connect from this page when OneDrive support is enabled.',
      ],
    },
    {
      key: 'CHATGPT',
      category: 'ai',
      name: 'ChatGPT',
      icon: 'AI',
      tone: 'bg-teal-700',
      action: 'planned',
      description: 'Plan AI-assisted captions, drafts, and campaign ideas with ChatGPT.',
      instructions: [
        'Create an OpenAI project and API key for the organization.',
        'Store the key in the AI tools credential screen when it is available.',
        'Use AI drafting features after ChatGPT support is enabled.',
      ],
    },
    {
      key: 'CLAUDE',
      category: 'ai',
      name: 'Claude',
      icon: 'C',
      tone: 'bg-orange-700',
      action: 'planned',
      description: 'Prepare Claude support for long-form drafting and campaign review.',
      instructions: [
        'Create an Anthropic API key for your workspace.',
        'Confirm which team members can use the AI integration.',
        'Connect from this page when Claude support is enabled.',
      ],
    },
    {
      key: 'GEMINI',
      category: 'ai',
      name: 'Gemini',
      icon: 'G',
      tone: 'bg-indigo-700',
      action: 'planned',
      description: 'Prepare Gemini support for content ideation and media workflows.',
      instructions: [
        'Create a Google AI or Vertex AI credential for the workspace.',
        'Confirm the model and billing project for the integration.',
        'Connect from this page when Gemini support is enabled.',
      ],
    },
  ];

  protected readonly cards = computed<IntegrationCard[]>(() =>
    this.definitions.map((definition) => this.toCard(definition)),
  );
  protected readonly connectedTotal = computed(
    () => this.cards().filter((card) => card.connected).length,
  );
  protected readonly reconnectTotal = computed(
    () => this.cards().filter((card) => card.status === 'REAUTH_REQUIRED').length,
  );

  ngOnInit(): void {
    this.load();
  }

  protected cardsByCategory(category: IntegrationCategory): IntegrationCard[] {
    return this.cards().filter((card) => card.category === category);
  }

  protected statusClass(status: IntegrationCard['status']): string {
    switch (status) {
      case 'CONNECTED':
        return 'bg-emerald-50 text-emerald-700';
      case 'REAUTH_REQUIRED':
        return 'bg-amber-50 text-amber-700';
      case 'ERROR':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  }

  protected statusLabel(card: IntegrationCard): string {
    if (card.status === 'REAUTH_REQUIRED') {
      return 'Reconnect';
    }
    if (card.connected) {
      return card.connectedCount > 1 ? `${card.connectedCount} connected` : 'Connected';
    }
    return card.action === 'planned' ? 'Available soon' : 'Not connected';
  }

  protected openHelp(card: IntegrationCard): void {
    if (card.key === 'GOOGLE_DRIVE') {
      const guideWindow = window.open(GOOGLE_DRIVE_GUIDE_URL, '_blank', 'noopener,noreferrer');
      if (!guideWindow) {
        this.notifications.error('Allow popups for this site to open the Google Drive guide.');
      }
      return;
    }
    if (card.key === 'INSTAGRAM') {
      const guideWindow = window.open(INSTAGRAM_GUIDE_URL, '_blank', 'noopener,noreferrer');
      if (!guideWindow) {
        this.notifications.error('Allow popups for this site to open the Instagram guide.');
      }
      return;
    }
    if (card.key === 'LINKEDIN') {
      const guideWindow = window.open(LINKEDIN_GUIDE_URL, '_blank', 'noopener,noreferrer');
      if (!guideWindow) {
        this.notifications.error('Allow popups for this site to open the LinkedIn guide.');
      }
      return;
    }

    this.helpCard.set(card);
  }

  protected closeHelp(): void {
    this.helpCard.set(null);
  }

  protected async reconnectFirstFacebook(): Promise<void> {
    const integration = this.integrations().find(
      (item) => item.platform === 'FACEBOOK' && item.status === 'REAUTH_REQUIRED',
    );
    if (!integration) {
      return;
    }
    await this.reconnect(integration);
  }

  protected async removePlatform(platform: SocialPlatform): Promise<void> {
    const owned = this.integrations().filter((item) => item.platform === platform);
    if (!owned.length) {
      return;
    }
    const ok = await this.confirm.ask(
      `Remove ${owned.length} ${this.platformName(platform)} connection${owned.length === 1 ? '' : 's'}?`,
      'Remove integration',
      'Remove',
    );
    if (!ok) {
      return;
    }
    this.busyKey.set(platform);
    try {
      await Promise.all(owned.map((item) => firstValueFrom(this.service.disconnect(item.id))));
      this.notifications.success('Integration removed');
      this.load();
    } catch {
      this.notifications.error('Failed to remove integration');
    } finally {
      this.busyKey.set(null);
    }
  }

  protected async removeGoogleDrive(): Promise<void> {
    const ok = await this.confirm.ask(
      'Disconnect Google Drive? Uploaded media metadata remains, but Drive access is removed.',
      'Remove Google Drive',
      'Remove',
    );
    if (!ok) {
      return;
    }
    this.busyKey.set('GOOGLE_DRIVE');
    this.service.disconnectGoogleDrive().subscribe({
      next: (connection) => {
        this.driveConnection.set(connection);
        this.notifications.success('Google Drive disconnected');
        this.busyKey.set(null);
      },
      error: () => {
        this.notifications.error('Failed to disconnect Google Drive');
        this.busyKey.set(null);
      },
    });
  }

  /** Re-runs the Facebook OAuth popup and replaces the stored token in place. */
  private async reconnect(integration: SocialIntegration): Promise<void> {
    this.busyKey.set('FACEBOOK');
    try {
      const configs = await firstValueFrom(this.service.facebookCredentialConfigs());
      const config =
        configs.find((item) => item.id === integration.appCredentialId) ?? configs[0] ?? null;
      if (!config) {
        throw new Error('Add Facebook app credentials before reconnecting.');
      }
      const shortLivedToken = await this.facebookAuth.login(config.appId);
      const exchange = await firstValueFrom(
        this.service.facebookExchange(shortLivedToken, config.id),
      );
      await firstValueFrom(this.service.reauth(integration.id, exchange.exchangeId));
      this.notifications.success('Integration reconnected');
      this.load();
    } catch (err) {
      this.notifications.error(this.errorMessage(err));
    } finally {
      this.busyKey.set(null);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().subscribe({
      next: (items) => {
        this.integrations.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load social integrations. Check that the backend is running.');
        this.loading.set(false);
      },
    });
    this.service.googleDriveStatus().subscribe({
      next: (connection) => this.driveConnection.set(connection),
      error: () => this.driveConnection.set(null),
    });
  }

  private toCard(definition: IntegrationDefinition): IntegrationCard {
    if (definition.key === 'GOOGLE_DRIVE') {
      const connection = this.driveConnection();
      const connected = connection?.connected === true;
      return {
        ...definition,
        connected,
        connectedCount: connected ? 1 : 0,
        status: connected ? connection.status : 'DISCONNECTED',
        detail: connected
          ? connection?.googleAccountEmail || connection?.googleAccountName || 'Drive connected'
          : 'Storage account not connected',
      };
    }

    if (this.isSocialPlatform(definition.key)) {
      const items = this.integrations().filter((item) => item.platform === definition.key);
      const status = this.aggregateStatus(items);
      return {
        ...definition,
        connected: items.length > 0,
        connectedCount: items.length,
        status,
        detail: items.length ? this.connectedDetail(items) : 'No account connected',
      };
    }

    return {
      ...definition,
      connected: false,
      connectedCount: 0,
      status: 'DISCONNECTED',
      detail: 'Provider support is planned',
    };
  }

  private aggregateStatus(items: SocialIntegration[]): IntegrationCard['status'] {
    if (!items.length) {
      return 'DISCONNECTED';
    }
    if (items.some((item) => item.status === 'REAUTH_REQUIRED')) {
      return 'REAUTH_REQUIRED';
    }
    if (items.some((item) => item.status === 'ERROR')) {
      return 'ERROR';
    }
    return 'CONNECTED';
  }

  private connectedDetail(items: SocialIntegration[]): string {
    if (items.length === 1) {
      return items[0].displayName || items[0].externalAccountId;
    }
    return `${items.length} accounts connected`;
  }

  private platformName(platform: SocialPlatform): string {
    return this.definitions.find((item) => item.key === platform)?.name ?? platform;
  }

  private isSocialPlatform(value: IntegrationKey): value is SocialPlatform {
    return ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'X'].includes(value);
  }

  private errorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      return err.error?.message ?? 'Could not reconnect the integration';
    }
    if (err instanceof Error) {
      return err.message;
    }
    return 'Could not reconnect the integration';
  }
}
