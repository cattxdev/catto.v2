import { Subcommand } from '@sapphire/plugin-subcommands';
import { container } from '@sapphire/framework';
import {
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  ComponentType,
  EmbedBuilder,
  type TextChannel,
} from 'discord.js';
import { asGuildId } from '../../modules/moderation/domain/types.js';

/**
 * Handle /mod setup command - Interactive setup wizard
 */
export async function handleSetup(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check for admin permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: '❌ You need Administrator permissions to configure moderation settings.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const guildId = asGuildId(interaction.guild.id);

  // Get or create config
  let config = await container.prisma.modConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    config = await container.prisma.modConfig.create({
      data: { guildId },
    });
  }

  // Show overview with current settings
  await showSetupOverview(interaction, config);
}

/**
 * Build setup embed
 */
function buildSetupEmbed(
  config: {
    modLogChannelId: string | null;
    mutedTextRole: string | null;
    mutedVoiceRole: string | null;
    warningEscalation: unknown;
  },
  modLogChannel: { id: string } | null,
  textMuteRole: { id: string } | null,
  voiceMuteRole: { id: string } | null
): EmbedBuilder {
  const settingsLines = [
    `**Mod Log Channel:** ${modLogChannel ? `<#${modLogChannel.id}>` : '`Not set`'}`,
    `**Muted Text Role:** ${textMuteRole ? `<@&${textMuteRole.id}>` : '`Not set`'}`,
    `**Muted Voice Role:** ${voiceMuteRole ? `<@&${voiceMuteRole.id}>` : '`Not set (using server mute)`'}`,
    `**Warning Escalation:** ${(config.warningEscalation as { enabled?: boolean })?.enabled !== false ? '`Enabled`' : '`Disabled`'}`,
  ];

  const stepsContent = [
    '**1.** Set mod log channel (where actions are logged)',
    '**2.** Configure muted text role',
    '**3.** Configure muted voice role (optional)',
    '**4.** Set up warning escalation rules',
  ];

  return new EmbedBuilder()
    .setTitle('Moderation Setup')
    .setColor(0x5865f2)
    .addFields(
      { name: 'Current Settings', value: settingsLines.join('\n'), inline: false },
      { name: 'Configuration Steps', value: stepsContent.join('\n'), inline: false }
    )
    .setFooter({ text: 'Use the buttons below or /mod config commands' });
}

/**
 * Show setup overview
 */
async function showSetupOverview(
  interaction: Subcommand.ChatInputCommandInteraction,
  config: {
    modLogChannelId: string | null;
    mutedTextRole: string | null;
    mutedVoiceRole: string | null;
    muteSettings: unknown;
    warningEscalation: unknown;
    autoModEnabled: boolean;
  }
) {
  const guild = interaction.guild!;

  // Resolve current settings
  const modLogChannel = config.modLogChannelId
    ? await guild.channels.fetch(config.modLogChannelId).catch(() => null)
    : null;
  const textMuteRole = config.mutedTextRole
    ? await guild.roles.fetch(config.mutedTextRole).catch(() => null)
    : null;
  const voiceMuteRole = config.mutedVoiceRole
    ? await guild.roles.fetch(config.mutedVoiceRole).catch(() => null)
    : null;

  const embed = buildSetupEmbed(config, modLogChannel, textMuteRole, voiceMuteRole);

  // Action buttons
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('mod_setup:mod_log')
      .setLabel('Set Mod Log')
      .setStyle(modLogChannel ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('📋'),
    new ButtonBuilder()
      .setCustomId('mod_setup:text_role')
      .setLabel('Text Mute Role')
      .setStyle(textMuteRole ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('💬'),
    new ButtonBuilder()
      .setCustomId('mod_setup:voice_role')
      .setLabel('Voice Mute Role')
      .setStyle(voiceMuteRole ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔇')
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('mod_setup:warning_escalation')
      .setLabel('Warning Escalation')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚠️'),
    new ButtonBuilder()
      .setCustomId('mod_setup:create_roles')
      .setLabel('Auto-Create Roles')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✨'),
    new ButtonBuilder()
      .setCustomId('mod_setup:done')
      .setLabel('Done')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row1, row2],
  });

  // Wait for button interactions
  await handleSetupInteractions(interaction);
}

/**
 * Handle button interactions during setup
 */
async function handleSetupInteractions(interaction: Subcommand.ChatInputCommandInteraction) {
  const message = await interaction.fetchReply();
  const guild = interaction.guild!;
  const guildId = asGuildId(guild.id);

  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    time: 300_000, // 5 minutes
  });

  collector.on('collect', async (buttonInteraction) => {
    const customId = buttonInteraction.customId;

    try {
      if (customId === 'mod_setup:done') {
        const doneEmbed = new EmbedBuilder()
          .setTitle('Setup Complete')
          .setDescription('Your moderation settings have been saved.')
          .setColor(0x00ff00);

        await buttonInteraction.update({
          embeds: [doneEmbed],
          components: [],
        });
        collector.stop();
        return;
      }

      if (customId === 'mod_setup:mod_log') {
        const selectRow = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId('mod_setup:select_mod_log')
            .setPlaceholder('Select mod log channel')
            .setChannelTypes(ChannelType.GuildText)
        );

        await buttonInteraction.reply({
          content: '📋 **Select the channel for moderation logs:**',
          components: [selectRow],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const selectInteraction = await buttonInteraction.channel?.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id && i.customId === 'mod_setup:select_mod_log',
            componentType: ComponentType.ChannelSelect,
            time: 60_000,
          });

          if (selectInteraction) {
            const channelId = selectInteraction.values[0];
            if (channelId) {
              await container.prisma.modConfig.update({
                where: { guildId },
                data: { modLogChannelId: channelId },
              });

              await selectInteraction.update({
                content: `✅ Mod log channel set to <#${channelId}>`,
                components: [],
              });

              // Refresh overview
              const updatedConfig = await container.prisma.modConfig.findUnique({
                where: { guildId },
              });
              if (updatedConfig) {
                await refreshOverview(interaction, updatedConfig, guild);
              }
            }
          }
        } catch {
          // Timeout - ignore
        }
        return;
      }

      if (customId === 'mod_setup:text_role') {
        const selectRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('mod_setup:select_text_role')
            .setPlaceholder('Select muted text role')
        );

        await buttonInteraction.reply({
          content:
            '💬 **Select the role to use for text mutes:**\n*This role should have Send Messages denied in all channels.*',
          components: [selectRow],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const selectInteraction = await buttonInteraction.channel?.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id && i.customId === 'mod_setup:select_text_role',
            componentType: ComponentType.RoleSelect,
            time: 60_000,
          });

          if (selectInteraction) {
            const roleId = selectInteraction.values[0];
            if (roleId) {
              await container.prisma.modConfig.update({
                where: { guildId },
                data: { mutedTextRole: roleId },
              });

              await selectInteraction.update({
                content: `✅ Muted text role set to <@&${roleId}>`,
                components: [],
              });

              const updatedConfig = await container.prisma.modConfig.findUnique({
                where: { guildId },
              });
              if (updatedConfig) {
                await refreshOverview(interaction, updatedConfig, guild);
              }
            }
          }
        } catch {
          // Timeout - ignore
        }
        return;
      }

      if (customId === 'mod_setup:voice_role') {
        const selectRow = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId('mod_setup:select_voice_role')
            .setPlaceholder('Select muted voice role (optional)')
        );

        await buttonInteraction.reply({
          content:
            '🔇 **Select the role to use for voice mutes (optional):**\n*If not set, server mute will be used instead.*',
          components: [selectRow],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const selectInteraction = await buttonInteraction.channel?.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id && i.customId === 'mod_setup:select_voice_role',
            componentType: ComponentType.RoleSelect,
            time: 60_000,
          });

          if (selectInteraction) {
            const roleId = selectInteraction.values[0];
            if (roleId) {
              await container.prisma.modConfig.update({
                where: { guildId },
                data: { mutedVoiceRole: roleId },
              });

              await selectInteraction.update({
                content: `✅ Muted voice role set to <@&${roleId}>`,
                components: [],
              });

              const updatedConfig = await container.prisma.modConfig.findUnique({
                where: { guildId },
              });
              if (updatedConfig) {
                await refreshOverview(interaction, updatedConfig, guild);
              }
            }
          }
        } catch {
          // Timeout - ignore
        }
        return;
      }

      if (customId === 'mod_setup:warning_escalation') {
        const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('mod_setup:select_escalation')
            .setPlaceholder('Configure warning escalation')
            .addOptions([
              {
                label: 'Enable (Default Rules)',
                description: '3 warns → timeout, 5 → kick, 10 → tempban',
                value: 'enable_default',
              },
              {
                label: 'Disable',
                description: 'No automatic escalation recommendations',
                value: 'disable',
              },
            ])
        );

        await buttonInteraction.reply({
          content:
            '⚠️ **Configure warning escalation:**\n*When enabled, moderators will see escalation recommendations based on warning count.*',
          components: [selectRow],
          flags: MessageFlags.Ephemeral,
        });

        try {
          const selectInteraction = await buttonInteraction.channel?.awaitMessageComponent({
            filter: (i) =>
              i.user.id === interaction.user.id && i.customId === 'mod_setup:select_escalation',
            componentType: ComponentType.StringSelect,
            time: 60_000,
          });

          if (selectInteraction) {
            const value = selectInteraction.values[0];
            if (value === 'enable_default') {
              await container.prisma.modConfig.update({
                where: { guildId },
                data: {
                  warningEscalation: JSON.parse(
                    JSON.stringify({
                      enabled: true,
                      thresholds: [
                        {
                          count: 3,
                          action: 'timeout',
                          duration: 3600,
                          message: '3 warnings - 1h timeout',
                        },
                        {
                          count: 5,
                          action: 'timeout',
                          duration: 86400,
                          message: '5 warnings - 24h timeout',
                        },
                        { count: 7, action: 'kick', message: '7 warnings - kick' },
                        {
                          count: 10,
                          action: 'tempban',
                          duration: 604800,
                          message: '10 warnings - 7d ban',
                        },
                      ],
                    })
                  ),
                },
              });

              await selectInteraction.update({
                content: '✅ Warning escalation enabled with default rules.',
                components: [],
              });
            } else if (value === 'disable') {
              await container.prisma.modConfig.update({
                where: { guildId },
                data: {
                  warningEscalation: JSON.parse(JSON.stringify({ enabled: false, thresholds: [] })),
                },
              });

              await selectInteraction.update({
                content: '✅ Warning escalation disabled.',
                components: [],
              });
            }

            const updatedConfig = await container.prisma.modConfig.findUnique({
              where: { guildId },
            });
            if (updatedConfig) {
              await refreshOverview(interaction, updatedConfig, guild);
            }
          }
        } catch {
          // Timeout - ignore
        }
        return;
      }

      if (customId === 'mod_setup:create_roles') {
        await buttonInteraction.deferReply({ ephemeral: true });

        try {
          const config = await container.prisma.modConfig.findUnique({
            where: { guildId },
          });

          const createdRoles: string[] = [];

          if (!config?.mutedTextRole) {
            const textMuteRole = await guild.roles.create({
              name: 'Muted (Text)',
              color: 0x808080,
              permissions: [],
              reason: 'Auto-created by mod setup',
            });

            const channels = guild.channels.cache.filter(
              (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildForum
            );

            for (const [, channel] of channels) {
              try {
                await (channel as TextChannel).permissionOverwrites.create(textMuteRole, {
                  SendMessages: false,
                  AddReactions: false,
                  CreatePublicThreads: false,
                  CreatePrivateThreads: false,
                  SendMessagesInThreads: false,
                });
              } catch {
                // Skip channels we can't modify
              }
            }

            await container.prisma.modConfig.update({
              where: { guildId },
              data: { mutedTextRole: textMuteRole.id },
            });

            createdRoles.push(`<@&${textMuteRole.id}> (text)`);
          }

          if (!config?.mutedVoiceRole) {
            const voiceMuteRole = await guild.roles.create({
              name: 'Muted (Voice)',
              color: 0x808080,
              permissions: [],
              reason: 'Auto-created by mod setup',
            });

            const voiceChannels = guild.channels.cache.filter(
              (c) => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice
            );

            for (const [, channel] of voiceChannels) {
              try {
                await channel.permissionOverwrites.create(voiceMuteRole, {
                  Speak: false,
                  Stream: false,
                });
              } catch {
                // Skip channels we can't modify
              }
            }

            await container.prisma.modConfig.update({
              where: { guildId },
              data: { mutedVoiceRole: voiceMuteRole.id },
            });

            createdRoles.push(`<@&${voiceMuteRole.id}> (voice)`);
          }

          if (createdRoles.length > 0) {
            await buttonInteraction.editReply({
              content: `✅ **Roles created:**\n${createdRoles.join('\n')}\n\n*Channel permissions have been configured automatically.*`,
            });
          } else {
            await buttonInteraction.editReply({
              content: '✅ Muted roles already exist. No changes made.',
            });
          }

          const updatedConfig = await container.prisma.modConfig.findUnique({
            where: { guildId },
          });
          if (updatedConfig) {
            await refreshOverview(interaction, updatedConfig, guild);
          }
        } catch (error) {
          container.logger.error('[Setup] Failed to create roles:', error);
          await buttonInteraction.editReply({
            content: '❌ Failed to create roles. Make sure I have the Manage Roles permission.',
          });
        }
        return;
      }

      // Unknown button - just acknowledge
      await buttonInteraction.deferUpdate();
    } catch (error) {
      container.logger.error('[Setup] Button interaction error:', error);
    }
  });

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      try {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle('Setup Timed Out')
          .setDescription('Run `/mod setup` again to continue.')
          .setColor(0xff9900);

        await interaction.editReply({
          embeds: [timeoutEmbed],
          components: [],
        });
      } catch {
        // Message may be deleted
      }
    }
  });
}

/**
 * Refresh the overview embed without recreating the collector
 */
async function refreshOverview(
  interaction: Subcommand.ChatInputCommandInteraction,
  config: {
    modLogChannelId: string | null;
    mutedTextRole: string | null;
    mutedVoiceRole: string | null;
    warningEscalation: unknown;
  },
  guild: {
    channels: { fetch: (id: string) => Promise<unknown> };
    roles: { fetch: (id: string) => Promise<unknown> };
  }
) {
  const modLogChannel = config.modLogChannelId
    ? await guild.channels.fetch(config.modLogChannelId).catch(() => null)
    : null;
  const textMuteRole = config.mutedTextRole
    ? await guild.roles.fetch(config.mutedTextRole).catch(() => null)
    : null;
  const voiceMuteRole = config.mutedVoiceRole
    ? await guild.roles.fetch(config.mutedVoiceRole).catch(() => null)
    : null;

  const embed = buildSetupEmbed(
    config,
    modLogChannel as { id: string } | null,
    textMuteRole as { id: string } | null,
    voiceMuteRole as { id: string } | null
  );

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('mod_setup:mod_log')
      .setLabel('Set Mod Log')
      .setStyle(modLogChannel ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('📋'),
    new ButtonBuilder()
      .setCustomId('mod_setup:text_role')
      .setLabel('Text Mute Role')
      .setStyle(textMuteRole ? ButtonStyle.Success : ButtonStyle.Primary)
      .setEmoji('💬'),
    new ButtonBuilder()
      .setCustomId('mod_setup:voice_role')
      .setLabel('Voice Mute Role')
      .setStyle(voiceMuteRole ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setEmoji('🔇')
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('mod_setup:warning_escalation')
      .setLabel('Warning Escalation')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('⚠️'),
    new ButtonBuilder()
      .setCustomId('mod_setup:create_roles')
      .setLabel('Auto-Create Roles')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✨'),
    new ButtonBuilder()
      .setCustomId('mod_setup:done')
      .setLabel('Done')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
  );

  await interaction.editReply({
    embeds: [embed],
    components: [row1, row2],
  });
}

/**
 * Handle /mod config subcommands for quick configuration
 */
export async function handleConfigModLog(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const channel = interaction.options.getChannel('channel', true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: '❌ Please select a text channel.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = asGuildId(interaction.guild.id);

  await container.prisma.modConfig.upsert({
    where: { guildId },
    update: { modLogChannelId: channel.id },
    create: { guildId, modLogChannelId: channel.id },
  });

  await interaction.reply({
    content: `✅ Mod log channel set to <#${channel.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleConfigTextRole(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const role = interaction.options.getRole('role', true);
  const guildId = asGuildId(interaction.guild.id);

  await container.prisma.modConfig.upsert({
    where: { guildId },
    update: { mutedTextRole: role.id },
    create: { guildId, mutedTextRole: role.id },
  });

  await interaction.reply({
    content: `✅ Muted text role set to <@&${role.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleConfigVoiceRole(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const role = interaction.options.getRole('role', true);
  const guildId = asGuildId(interaction.guild.id);

  await container.prisma.modConfig.upsert({
    where: { guildId },
    update: { mutedVoiceRole: role.id },
    create: { guildId, mutedVoiceRole: role.id },
  });

  await interaction.reply({
    content: `✅ Muted voice role set to <@&${role.id}>`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleConfigView(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ This command can only be used in a server.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const guildId = asGuildId(interaction.guild.id);
  const config = await container.prisma.modConfig.findUnique({
    where: { guildId },
  });

  if (!config) {
    await interaction.reply({
      content: '❌ No moderation config found. Run `/mod setup` to configure.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Moderation Config')
    .setColor(0x5865f2)
    .addFields(
      {
        name: 'Mod Log Channel',
        value: config.modLogChannelId ? `<#${config.modLogChannelId}>` : '`Not set`',
        inline: true,
      },
      {
        name: 'Muted Text Role',
        value: config.mutedTextRole ? `<@&${config.mutedTextRole}>` : '`Not set`',
        inline: true,
      },
      {
        name: 'Muted Voice Role',
        value: config.mutedVoiceRole ? `<@&${config.mutedVoiceRole}>` : '`Not set`',
        inline: true,
      },
      {
        name: 'Warning Escalation',
        value:
          (config.warningEscalation as { enabled?: boolean })?.enabled !== false
            ? '`Enabled`'
            : '`Disabled`',
        inline: true,
      },
      {
        name: 'AutoMod Enabled',
        value: config.autoModEnabled ? '`Yes`' : '`No`',
        inline: true,
      }
    );

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
