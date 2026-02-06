/**
 * Bonk button interaction handler
 * Handles "Bonk Back" revenge button
 */

import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { AttachmentBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import {
  BonkImageService,
  type BonkStyle,
  type BonkVisualConfig,
} from '#lib/services/bonk-image-generator.js';

export class BonkButtonHandler extends InteractionHandler {
  private bonkImageService!: BonkImageService;

  public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith('bonk:')) return this.none();
    return this.some();
  }

  public async run(interaction: ButtonInteraction) {
    const parts = interaction.customId.split(':');
    const action = parts[1];

    if (action === 'back') {
      return this.handleBonkBack(interaction, parts);
    }

    return interaction.reply({
      content: 'Unknown bonk action.',
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleBonkBack(interaction: ButtonInteraction, parts: string[]) {
    const allowedUserId = parts[2];
    const originalBonkerId = parts[3];
    const styleStr = parts[4] ?? 'doge';
    const validStyles: BonkStyle[] = ['doge', 'cat', 'lions', 'rabbit'];
    const style: BonkStyle = validStyles.includes(styleStr as BonkStyle)
      ? (styleStr as BonkStyle)
      : 'doge';

    if (!allowedUserId || !originalBonkerId) {
      return interaction.reply({
        content: 'Invalid bonk data.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Only the bonked victim can use this button
    if (interaction.user.id !== allowedUserId) {
      return interaction.reply({
        content: 'Only the bonked victim can use this button.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();

    if (!this.bonkImageService) {
      this.bonkImageService = new BonkImageService();
    }

    try {
      const originalBonker = await this.container.client.users.fetch(originalBonkerId);

      const visuals: BonkVisualConfig = {
        bonkText: '*REVENGE!*',
        fontSize: 44,
        starCount: 0,
        showSpeedLines: false,
        showDamageNumber: false,
        textColor: '#FF4444',
        glowColor: 'rgba(255,0,0,0.4)',
        textStrokeWidth: 3,
      };

      const imageBuffer = await this.bonkImageService.generateBonkImage({
        bonkerAvatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
        bonkedAvatarUrl: originalBonker.displayAvatarURL({ extension: 'png', size: 256 }),
        style,
        visuals,
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'revenge-bonk.png' });

      // Track revenge bonk in Redis
      try {
        await this.container.redis.incr(
          `bonk:guild:${interaction.guildId}:bonked:${originalBonker.id}`
        );
        await this.container.redis.incr(
          `bonk:guild:${interaction.guildId}:bonker:${interaction.user.id}`
        );
      } catch {
        // Ignore Redis errors
      }

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(`${interaction.user} bonked ${originalBonker} back`)
        .setImage('attachment://revenge-bonk.png');

      return interaction.editReply({
        embeds: [embed],
        files: [attachment],
        allowedMentions: { users: [interaction.user.id, originalBonker.id] },
      });
    } catch (error) {
      this.container.logger.error('Failed to generate revenge bonk:', error);
      return interaction.editReply({
        content: `**${interaction.user.displayName}** bonked back! (image failed to generate)`,
        allowedMentions: { users: [interaction.user.id, originalBonkerId] },
      });
    }
  }
}
