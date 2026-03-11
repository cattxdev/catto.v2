import type { XPConfig } from '@/lib/services/text-xp.service';

export type { XPConfig };

export type XpMode = 'RANDOM' | 'FIXED';
export type LevelCurveType = 'FORMULA' | 'TABLE';

export interface Role {
  id: string;
  name: string;
  color?: number;
}

export interface Channel {
  id: string;
  name: string;
  type?: string | number;
}

export interface TextXPFormProps {
  guildId: string;
  initialConfig: XPConfig;
}

export interface ConfigSectionProps {
  config: XPConfig;
  onChange: (updater: (prev: XPConfig) => XPConfig) => void;
}

export interface FilterSectionProps extends ConfigSectionProps {
  channels: Channel[];
  roles: Role[];
  loading: boolean;
}

export interface AnnouncementSectionProps extends ConfigSectionProps {
  textChannels: Channel[];
  loading: boolean;
}
