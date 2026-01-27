import { Command } from '#root/lib/sapphire/command/command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';

@ApplyOptions<Command.Options>({
  name: 'reset',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder.setName('reset').setDescription('Reset your channel to default settings'),
  },
})
export class VoiceResetCommand extends Command {
  private channelService!: TempChannelService;
  private configService!: TempVoiceConfigService;
  private permissionsService!: PermissionsService;

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
        ephemeral: true,
      });
    }

    if (!this.channelService) {
      this.configService = new TempVoiceConfigService(this.container.prisma, this.container.client);
      this.permissionsService = new PermissionsService();
      this.channelService = new TempChannelService(this.container.prisma, this.permissionsService);
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} You must be in a voice channel to use this command.`,
        ephemeral: true,
      });
    }

    const tempChannel = await this.channelService.getByChannelId(voiceChannel.id);
    if (!tempChannel) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This is not a temporary voice channel.`,
        ephemeral: true,
      });
    }

    const config = await this.configService.get(interaction.guild.id);
    const canManage = this.permissionsService.canManageChannel(
      member.id,
      tempChannel.ownerId,
      config.adminRoleIds || [],
      member.roles.cache.map((r) => r.id),
      member.permissions.has('Administrator'),
      (tempChannel.trustedUserIds as string[]) || []
    );

    if (!canManage) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} You do not have permission to manage this channel.`,
        ephemeral: true,
      });
    }

    if (!config.allowCustomization) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Channel customization is disabled in this server.`,
        ephemeral: true,
      });
    }

    try {
      await (voiceChannel as VoiceChannel).edit({
        userLimit: config.defaultUserLimit,
        bitrate: config.defaultBitrate ?? undefined,
        rtcRegion: config.defaultRegion || undefined,
      });

      await (voiceChannel as VoiceChannel).permissionOverwrites.set(
        this.permissionsService.buildOverwrites({
          ownerId: tempChannel.ownerId,
          guildId: voiceChannel.guildId,
          isLocked: config.defaultLocked,
          isHidden: config.defaultHidden,
          allowedUserIds: [],
          deniedUserIds: [],
          trustedUserIds: [],
        })
      );

      await this.channelService.update(tempChannel.channelId, {
        isLocked: config.defaultLocked,
        isHidden: config.defaultHidden,
        customUserLimit: config.defaultUserLimit,
        customBitrate: config.defaultBitrate ?? undefined,
        customRegion: config.defaultRegion || 'auto',
        allowedUserIds: [],
        deniedUserIds: [],
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel reset to default settings.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to reset channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to reset channel. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
