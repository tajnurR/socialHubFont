/** Mirrors the backend `SocialPlatform` enum. */
export type SocialPlatform =
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'WHATSAPP'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'LINKEDIN'
  | 'X'
  | 'PINTEREST';

/** Mirrors the backend `ProviderInfo` DTO (GET /integrations/providers). */
export interface ProviderInfo {
  platform: SocialPlatform;
  enabled: boolean;
}
