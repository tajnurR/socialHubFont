/** Mirrors the backend `OrganizationResponse` DTO. */
export interface Organization {
  id: number;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}
