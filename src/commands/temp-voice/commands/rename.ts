import { Command } from '#command.js';
import { ApplyOptions } from '@sapphire/decorators';
import { ChannelType, VoiceChannel, type GuildMember } from 'discord.js';
import { EMOJI } from '#lib/discord/design/index.js';
import { TempChannelService } from '#modules/temp-voice/services/temp-channel.service.js';
import { TempVoiceConfigService } from '#modules/temp-voice/services/config.service.js';
import { PermissionsService } from '#modules/temp-voice/services/permissions.service.js';

@ApplyOptions<Command.Options>({
  name: 'rename',
  description: 'Rename your temporary voice channel',
  preconditions: ['GuildOnly'],
  registerSubCommand: {
    parentCommandName: 'voice',
    slashSubcommand: (builder) =>
      builder
        .setName('rename')
        .setDescription('Rename your temporary voice channel')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('New channel name')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(100)
        ),
  },
})
export class VoiceRenameCommand extends Command {
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

    // Initialize services lazily
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

    const newName = interaction.options.getString('name', true);

    try {
      await (voiceChannel as VoiceChannel).setName(newName);
      await this.channelService.update(tempChannel.channelId, { customName: newName });

      return interaction.reply({
        content: `${EMOJI.STATUS.SUCCESS} Channel renamed to **${newName}**`,
        ephemeral: true,
      });
    } catch (error) {
      this.container.logger.error('Failed to rename temp voice channel:', error);
      return interaction.reply({
        content: `${EMOJI.STATUS.ERROR} Failed to rename channel. Please try again.`,
        ephemeral: true,
      });
    }
  }
}
