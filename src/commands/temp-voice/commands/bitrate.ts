import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';
import { Command } from '#command.js';

@ApplyOptions<Command.Options>({
  name: 'bitrate',
  description: 'Set the bitrate for your channel',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder
        .setName('bitrate')
        .setDescription('Set the bitrate for your channel')
        .addIntegerOption((option) =>
          option
            .setName('bitrate')
            .setDescription('Bitrate in kbps (8-384)')
            .setRequired(true)
            .setMinValue(8)
            .setMaxValue(384)
        ),
  },
})
export class VoiceBitrateCommand extends Command {
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

    const bitrate = interaction.options.getInteger('bitrate', true) * 1000;

    const bitrateValidation = this.permissionsService.validateBitrate(
      bitrate,
      voiceChannel.guild.premiumTier
    );
    if (!bitrateValidation.valid) {
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Maximum bitrate for this server is **${bitrateValidation.maxAllowed / 1000}kbps** based on boost level.`,
        ephemeral: true,
      });
    }

    try {
      await (voiceChannel as VoiceChannel).setBitrate(bitrate);
      await this.channelService.update(tempChannel.channelId, { customBitrate: bitrate });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Bitrate set to **${bitrate / 1000}kbps**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to set bitrate:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to set bitrate. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
