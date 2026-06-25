import { SocialPlatform } from '../../../shared/models/social-platform.model';

/** One credential input rendered in the Add Integration form. */
export interface CredentialField {
  /** Maps to the backend credentials map key (e.g. `pageId`). */
  key: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  helpText?: string;
  required: boolean;
}

/** Per-platform connect configuration — drives the selector and credential form. */
export interface PlatformConfig {
  platform: SocialPlatform;
  label: string;
  /** Whether the platform can be connected yet (others show as "coming soon"). */
  enabled: boolean;
  description?: string;
  docsUrl?: string;
  fields: CredentialField[];
}

/**
 * Single source of truth for the platform selector + credential fields.
 *
 * To add a platform later: add an entry here with its `fields`, and implement the
 * matching backend provider. No component code changes — the form is data-driven.
 */
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    platform: 'FACEBOOK',
    label: 'Facebook Page',
    enabled: true,
    description: 'Connect a Facebook Page to view and publish posts.',
    docsUrl: 'https://developers.facebook.com/docs/pages-api/getting-started',
    fields: [
      {
        key: 'pageId',
        label: 'Page ID',
        type: 'text',
        placeholder: 'e.g. 1234567890',
        helpText: 'Your Facebook Page → About → Page transparency, or via the Graph API Explorer.',
        required: true,
      },
      {
        key: 'accessToken',
        label: 'Page Access Token',
        type: 'password',
        placeholder: 'EAAB...',
        helpText:
          'Generate a Page access token in Meta for Developers (Graph API Explorer or your app settings). Needs pages_read_engagement and pages_manage_posts.',
        required: true,
      },
    ],
  },
  { platform: 'INSTAGRAM', label: 'Instagram', enabled: false, fields: [] },
  { platform: 'WHATSAPP', label: 'WhatsApp', enabled: false, fields: [] },
];
