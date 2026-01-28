import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';
import { Command } from '#command.js';

@ApplyOptions<Command.Options>({
  name: 'deny',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder
        .setName('deny')
        .setDescription('Deny a user from joining your channel')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to deny').setRequired(true)
        ),
  },
})
export class VoiceDenyCommand extends Command {
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
        content: `${EMOJI.STATUS.ERROR} You cannot deny the channel owner.`,
        ephemeral: true,
      });
    }

    try {
      await (voiceChannel as VoiceChannel).permissionOverwrites.edit(user.id, {
        Connect: false,
        ViewChannel: false,
      });

      const guildMember = voiceChannel.guild.members.cache.get(user.id);
      if (guildMember && guildMember.voice.channelId === voiceChannel.id) {
        await guildMember.voice.disconnect('Denied access to temporary voice channel');
      }

      const deniedUsers = (tempChannel.deniedUserIds as string[]) || [];
      if (!deniedUsers.includes(user.id)) {
        deniedUsers.push(user.id);
      }

      const allowedUsers = (tempChannel.allowedUserIds as string[]) || [];
      const filteredAllowed = allowedUsers.filter((id: string) => id !== user.id);

      const trustedUsers = (tempChannel.trustedUserIds as string[]) || [];
      const filteredTrusted = trustedUsers.filter((id: string) => id !== user.id);

      await this.channelService.update(tempChannel.channelId, {
        deniedUserIds: deniedUsers,
        allowedUserIds: filteredAllowed,
        trustedUserIds: filteredTrusted,
      });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} **${user.tag}** has been denied access to your channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to deny user:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to deny user. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
