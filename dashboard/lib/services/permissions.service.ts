import { botApi } from '@/lib/api';

// Types
export type PermissionSubjectType = 'USER' | 'ROLE';
export type PermissionResourceType = 'COMMAND' | 'CATEGORY';
export type PermissionEffect = 'ALLOW' | 'DENY';

export interface PermissionCategory {
  key: string;
  displayName: string;
  description: string;
  parentCategory: string | null;
}

export interface PermissionCommand {
  key: string;
  displayName: string;
  categories: string[];
}

export interface PermissionRegistry {
  categories: PermissionCategory[];
  commands: PermissionCommand[];
}

export interface PermissionGrant {
  id: string;
  guildId: string;
  subjectType: PermissionSubjectType;
  subjectId: string;
  resourceType: PermissionResourceType;
  resourceKey: string;
  effect: PermissionEffect;
  createdById: string | null;
  createdAt: string;
}

export interface PermissionGrantsResponse {
  total: number;
  grants: PermissionGrant[];
}

export interface PermissionGrantsQuery {
  subjectType?: PermissionSubjectType;
  subjectId?: string;
  resourceType?: PermissionResourceType;
  resourceKey?: string;
}

export interface CreatePermissionGrant {
  subjectType: PermissionSubjectType;
  subjectId: string;
  resourceType: PermissionResourceType;
  resourceKey: string;
  effect: PermissionEffect;
  createdById?: string;
}

export const permissionsService = {
  /**
   * Get the permission registry (available categories and commands)
   */
  async getRegistry(guildId: string): Promise<PermissionRegistry> {
    const response = await botApi.get(`/api/guilds/${guildId}/permissions/registry`);
    return response.data;
  },

  /**
   * Get permission grants for a guild
   */
  async getGrants(
    guildId: string,
    query?: PermissionGrantsQuery
  ): Promise<PermissionGrantsResponse> {
    const params = new URLSearchParams();
    if (query?.subjectType) params.append('subjectType', query.subjectType);
    if (query?.subjectId) params.append('subjectId', query.subjectId);
    if (query?.resourceType) params.append('resourceType', query.resourceType);
    if (query?.resourceKey) params.append('resourceKey', query.resourceKey);
    const queryString = params.toString();
    const response = await botApi.get(
      `/api/guilds/${guildId}/permissions/grants${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  /**
   * Create a permission grant
   */
  async createGrant(guildId: string, grant: CreatePermissionGrant): Promise<PermissionGrant> {
    const response = await botApi.post(`/api/guilds/${guildId}/permissions/grants`, grant);
    return response.data;
  },

  /**
   * Get a specific permission grant
   */
  async getGrant(guildId: string, grantId: string): Promise<PermissionGrant> {
    const response = await botApi.get(`/api/guilds/${guildId}/permissions/grants/${grantId}`);
    return response.data;
  },

  /**
   * Delete a permission grant
   */
  async deleteGrant(guildId: string, grantId: string): Promise<void> {
    await botApi.delete(`/api/guilds/${guildId}/permissions/grants/${grantId}`);
  },
};
