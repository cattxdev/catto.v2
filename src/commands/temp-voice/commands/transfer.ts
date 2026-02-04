import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';

@ApplyOptions<Command.Options>({
  name: 'transfer',
  description: 'Transfer ownership of your channel to another user',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder
        .setName('transfer')
        .setDescription('Transfer ownership of your channel to another user')
        .addUserOption((option) =>
          option.setName('user').setDescription('New owner').setRequired(true)
        ),
  },
})
export class VoiceTransferCommand extends Command {
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

    const user = interaction.options.getUser('user', true);
    const targetMember = voiceChannel.guild.members.cache.get(user.id);

    if (!targetMember) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} User not found in the server.`,
        ephemeral: true,
      });
    }

    if (user.id === tempChannel.ownerId) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This user is already the owner.`,
        ephemeral: true,
      });
    }

    if (targetMember.voice.channelId !== voiceChannel.id) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The new owner must be in your channel.`,
        ephemeral: true,
      });
    }

    try {
      const oldOwnerId = tempChannel.ownerId;
      await (voiceChannel as VoiceChannel).permissionOverwrites.edit(user.id, {
        Connect: true,
        Speak: true,
        MoveMembers: true,
        ManageChannels: true,
      });

      await (voiceChannel as VoiceChannel).permissionOverwrites.delete(oldOwnerId);
      await this.channelService.update(tempChannel.channelId, { ownerId: user.id });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel ownership transferred to **${user.tag}**.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to transfer ownership:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to transfer ownership. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
