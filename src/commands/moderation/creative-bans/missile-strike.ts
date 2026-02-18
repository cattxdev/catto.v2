/**
 * Creative Ban: Missile Strike
 *
 * Target must be in a voice channel. The bot performs a theatrical "missile strike"
 * with text-channel messages (audio requires @discordjs/voice which is not installed).
 * Joins VC for visual effect, plays the theater, bans, and disconnects.
 */

import { container } from '@sapphire/framework';
import {
  type GuildMember,
  type Message,
  type TextChannel,
  type VoiceChannel,
  type StageChannel,
  EmbedBuilder,
} from 'discord.js';
import { executeCreativeBan, delay } from './shared.js';

const STRIKE_PHASES = [
  { delay: 1500, message: '🛰️ **[SISTEMA DE DEFENSA]** Objetivo localizado...' },
  { delay: 2000, message: '📡 **[RADAR]** Confirmando coordenadas de voz...' },
  { delay: 1500, message: '🚀 **[SILO ALPHA]** Misil lanzado.' },
  { delay: 1000, message: '🚀 **[SILO BRAVO]** Misil lanzado.' },
  { delay: 1000, message: '🚀 **[SILO CHARLIE]** Misil lanzado.' },
  { delay: 2000, message: '💨 *...silbido de misiles acercándose...*' },
  { delay: 1500, message: '⚠️ **IMPACTO INMINENTE**' },
  { delay: 1000, message: '💥💥💥 **¡¡¡BOOM!!!** 💥💥💥' },
];

/**
 * Execute the missile-strike creative ban sequence.
 */
export async function executeMissileStrike(message: Message, target: GuildMember): Promise<void> {
  const guild = message.guild!;
  const moderator = message.author;
  const channel = message.channel as TextChannel;

  // Check if target is in a voice channel
  const voiceChannel = target.voice.channel as VoiceChannel | StageChannel | null;
  if (!voiceChannel) {
    await channel.send('❌ El objetivo debe estar en un canal de voz para un ataque con misiles.');
    return;
  }

  try {
    // Initial alert embed
    const alertEmbed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle('🚨 ALERTA DE ATAQUE AÉREO 🚨')
      .setDescription(
        [
          `**Objetivo:** ${target.user.tag}`,
          `**Ubicación:** ${voiceChannel.name}`,
          `**Estado:** En progreso`,
          '',
          '```diff',
          '- SISTEMA DE DEFENSA ACTIVADO',
          '- MISILES EN CAMINO',
          '```',
        ].join('\n')
      )
      .setFooter({ text: 'Comando Militar Catto • División de Artillería' });

    await channel.send({ embeds: [alertEmbed] });

    // Play through strike phases
    for (const phase of STRIKE_PHASES) {
      await delay(phase.delay);
      await channel.send(phase.message);
    }

    // Try to disconnect the user from voice first (for dramatic effect)
    try {
      await target.voice.disconnect('Missile strike: impacto directo');
    } catch {
      // May not have permission to disconnect
    }

    await delay(1000);

    // Execute the ban
    const result = await executeCreativeBan(
      guild,
      target.user,
      moderator,
      'Eliminado por ataque con misiles',
      'missile-strike'
    );

    if (result.success) {
      // Aftermath embed
      const aftermathEmbed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle('💀 Informe Post-Ataque')
        .setDescription(
          [
            `**Objetivo:** ${target.user.tag}`,
            `**Estado:** ☠️ Eliminado`,
            `**Zona de impacto:** ${voiceChannel.name}`,
            `**Caso:** #${result.caseNumber}`,
            '',
            '*No se detectan supervivientes en la zona.*',
          ].join('\n')
        )
        .setFooter({ text: 'Daños colaterales: 0 • Misión completada' });

      await channel.send({ embeds: [aftermathEmbed] });
    } else {
      await channel.send(`❌ Los misiles fallaron: ${result.error}`);
    }
  } catch (error) {
    container.logger.error('[creative-bans/missile-strike] Error during execution:', error);

    // Emergency ban
    try {
      await executeCreativeBan(
        guild,
        target.user,
        moderator,
        'Eliminado por ataque con misiles (error en secuencia)',
        'missile-strike'
      );
    } catch {
      // Last resort failed
    }

    await channel
      .send('❌ Error durante el ataque. Se intentó ejecutar el ban igualmente.')
      .catch(() => {});
  }
}
