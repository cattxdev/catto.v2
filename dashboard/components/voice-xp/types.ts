import type { VoiceXPConfig } from '@/lib/services/voice-xp.service';

export type { VoiceXPConfig };

export type XpMode = 'PER_MINUTE' | 'PER_SESSION';
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

export interface VoiceXPFormProps {
  guildId: string;
  initialConfig: VoiceXPConfig;
}

export interface ConfigSectionProps {
  config: VoiceXPConfig;
  onChange: (updater: (prev: VoiceXPConfig) => VoiceXPConfig) => void;
}

export interface ChannelSectionProps extends ConfigSectionProps {
  voiceChannels: Channel[];
  textChannels: Channel[];
  loading: boolean;
}

export interface RoleSectionProps extends ConfigSectionProps {
  roles: Role[];
  loading: boolean;
}
