import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';

@ApplyOptions<Command.Options>({
  name: 'claim',
  description: 'Claim ownership of an abandoned temporary channel',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder.setName('claim').setDescription('Claim ownership of an abandoned temporary channel'),
  },
})
export class VoiceClaimCommand extends Command {
  private channelService!: TempChannelService;
  private permissionsService!: PermissionsService;

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} This command can only be used in a server.`,
        ephemeral: true,
      });
    }

    if (!this.channelService) {
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

    const owner = (voiceChannel as VoiceChannel).members.get(tempChannel.ownerId);
    if (owner) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} The channel owner is still present. You cannot claim this channel.`,
        ephemeral: true,
      });
    }

    try {
      const oldOwnerId = tempChannel.ownerId;

      await (voiceChannel as VoiceChannel).permissionOverwrites.delete(oldOwnerId);

      await (voiceChannel as VoiceChannel).permissionOverwrites.edit(member.id, {
        Connect: true,
        ViewChannel: true,
        Speak: true,
        Stream: true,
        MoveMembers: true,
        ManageChannels: true,
      });

      await this.channelService.update(tempChannel.channelId, { ownerId: member.id });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} You are now the owner of this channel.`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to claim channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to claim channel. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
