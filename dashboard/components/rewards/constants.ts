import type { RewardType } from './types';

export interface RewardTypeOption {
  value: RewardType;
  label: string;
  description: string;
}

export const SUPPORTED_REWARD_TYPES: RewardTypeOption[] = [
  { value: 'ROLE_ADD', label: 'Add Role', description: 'Give a role when level is reached' },
  {
    value: 'ROLE_REMOVE',
    label: 'Remove Role',
    description: 'Remove a role when level is reached',
  },
  {
    value: 'ROLE_STACK',
    label: 'Stack Role',
    description: 'Add role while keeping previous roles',
  },
  {
    value: 'ROLE_REPLACE',
    label: 'Replace Role',
    description: 'Add new role and remove specified old roles',
  },
  {
    value: 'PERMISSION_GRANT',
    label: 'Grant Permissions',
    description: 'Grant Discord permissions to the user',
  },
  {
    value: 'CHANNEL_ACCESS',
    label: 'Channel Access',
    description: 'Grant access to specific channels',
  },
  {
    value: 'ANNOUNCEMENT',
    label: 'Announcement',
    description: 'Send an announcement when reward is claimed',
  },
];

export interface DiscordPermission {
  value: string;
  label: string;
}

export const DISCORD_PERMISSIONS: DiscordPermission[] = [
  { value: 'VIEW_CHANNEL', label: 'View Channels' },
  { value: 'SEND_MESSAGES', label: 'Send Messages' },
  { value: 'EMBED_LINKS', label: 'Embed Links' },
  { value: 'ATTACH_FILES', label: 'Attach Files' },
  { value: 'ADD_REACTIONS', label: 'Add Reactions' },
  { value: 'USE_EXTERNAL_EMOJIS', label: 'Use External Emojis' },
  { value: 'READ_MESSAGE_HISTORY', label: 'Read Message History' },
  { value: 'CONNECT', label: 'Connect to Voice' },
  { value: 'SPEAK', label: 'Speak in Voice' },
  { value: 'STREAM', label: 'Video/Stream' },
  { value: 'PRIORITY_SPEAKER', label: 'Priority Speaker' },
  { value: 'CREATE_INSTANT_INVITE', label: 'Create Invites' },
  { value: 'CHANGE_NICKNAME', label: 'Change Nickname' },
];

export const ROLE_REWARD_TYPES: RewardType[] = [
  'ROLE_ADD',
  'ROLE_REMOVE',
  'ROLE_STACK',
  'ROLE_REPLACE',
];
