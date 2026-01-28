import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';

@ApplyOptions<Command.Options>({
  name: 'untrust',
  description: 'Remove trust from a user',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder
        .setName('untrust')
        .setDescription('Remove trust from a user')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to untrust').setRequired(true)
        ),
  },
})
export class VoiceUntrustCommand extends Command {
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

    const user = interaction.options.getUser('user', true);

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The channel owner cannot be untrusted.`,
        ephemeral: true,
      });
    }

    try {
      const currentTrusted = (tempChannel.trustedUserIds as string[]) || [];

      if (!currentTrusted.includes(user.id)) {
        return interaction.reply({
          content: `${EMOJI.STATUS.ERROR} **${user.tag}** is not trusted.`,
          ephemeral: true,
        });
      }

      const newTrusted = currentTrusted.filter((id: string) => id !== user.id);
      await this.channelService.update(tempChannel.channelId, {
        trustedUserIds: newTrusted,
      });

      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      const deniedUsers = (tempChannel.deniedUserIds as string[]) || [];

      if (!allowedUsers.includes(user.id) && !deniedUsers.includes(user.id)) {
        await (voiceChannel as VoiceChannel).permissionOverwrites.delete(user.id);
      } else if (allowedUsers.includes(user.id)) {
        await (voiceChannel as VoiceChannel).permissionOverwrites.edit(user.id, {
          Connect: true,
          ViewChannel: true,
        });
      }

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** is no longer trusted but can still access the channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to untrust user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to untrust user. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
