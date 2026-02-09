import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import {
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
  InteractionContextType,
  type Role,
} from 'discord.js';
import {
  ephemeralError,
  successContainer,
  infoContainer,
  errorMessage,
  defer,
  editReply,
} from '#lib/discord/index.js';
import {
  createPermissionGrant,
  removePermissionGrant,
  listPermissionGrants,
} from '#lib/validation/permissionResolver.js';
import {
  resolveResourceInput,
  allCategories,
  allCommandKeys,
  getCommand,
  getCategory,
} from '#lib/validation/permissionRegistry.js';
import { ensureNonNull } from '#lib/utils.js';
import type {
  PermissionSubjectType,
  PermissionResourceType,
  PermissionEffect,
} from '@prisma/client';

@ApplyOptions<Subcommand.Options>({
  name: 'permission',
  description: 'Manage custom permissions for roles and users',
  requiredClientPermissions: [PermissionFlagsBits.ManageRoles],
  subcommands: [
    { name: 'add', chatInputRun: 'chatInputAdd' },
    { name: 'remove', chatInputRun: 'chatInputRemove' },
    { name: 'list', chatInputRun: 'chatInputList' },
  ],
})
export class PermissionCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .addSubcommand(this.buildAddSubcommand)
        .addSubcommand(this.buildRemoveSubcommand)
        .addSubcommand(this.buildListSubcommand)
    );
  }

  private buildAddSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('add')
      .setDescription('Grant a permission to a role or user')
      .addStringOption((option) =>
        option
          .setName('resource')
          .setDescription('Command or category to grant (e.g., "warn", "mod.kick", "moderation")')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addRoleOption((option) =>
        option.setName('role').setDescription('Role to grant permission to')
      )
      .addUserOption((option) =>
        option.setName('user').setDescription('User to grant permission to')
      )
      .addBooleanOption((option) =>
        option.setName('deny').setDescription('Deny instead of allow (default: false)')
      );
  }

  private buildRemoveSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('remove')
      .setDescription('Remove a permission grant from a role or user')
      .addStringOption((option) =>
        option
          .setName('resource')
          .setDescription('Command or category to remove (e.g., "warn", "mod.kick", "moderation")')
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addRoleOption((option) =>
        option.setName('role').setDescription('Role to remove permission from')
      )
      .addUserOption((option) =>
        option.setName('user').setDescription('User to remove permission from')
      );
  }

  private buildListSubcommand(subcommand: SlashCommandSubcommandBuilder) {
    return subcommand
      .setName('list')
      .setDescription('List permission grants')
      .addRoleOption((option) => option.setName('role').setDescription('Filter by role'))
      .addUserOption((option) => option.setName('user').setDescription('Filter by user'))
      .addStringOption((option) =>
        option
          .setName('resource')
          .setDescription('Filter by command or category')
          .setAutocomplete(true)
      );
  }

  public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply(ephemeralError('This command can only be used in a server.'));
      return;
    }

    const resourceInput = interaction.options.getString('resource', true);
    const role = interaction.options.getRole('role') as Role | null;
    const user = interaction.options.getUser('user');
    const deny = interaction.options.getBoolean('deny') ?? false;

    if (!role && !user) {
      await interaction.reply(ephemeralError('You must specify either a role or a user.'));
      return;
    }

    if (role && user) {
      await interaction.reply(ephemeralError('Please specify only one: role or user.'));
      return;
    }

    const resolved = resolveResourceInput(resourceInput);
    if (!resolved) {
      await interaction.reply(
        ephemeralError(`Unknown resource: "${resourceInput}". Use a valid command or category.`)
      );
      return;
    }

    await defer(interaction);

    try {
      const subjectType: PermissionSubjectType = role ? 'ROLE' : 'USER';
      const subjectId = role
        ? role.id
        : ensureNonNull(user, 'permission.ts > chatInputAdd > user').id;
      const effect: PermissionEffect = deny ? 'DENY' : 'ALLOW';

      await createPermissionGrant(
        interaction.guild.id,
        subjectType,
        subjectId,
        resolved.type as PermissionResourceType,
        resolved.key,
        effect,
        interaction.user.id
      );

      const subjectMention = role
        ? `<@&${role.id}>`
        : `<@${ensureNonNull(user, 'permission.ts > chatInputAdd > user').id}>`;
      const resourceDisplay =
        resolved.type === 'CATEGORY'
          ? (getCategory(resolved.key)?.displayName ?? resolved.key)
          : (getCommand(resolved.key)?.displayName ?? resolved.key);

      const result = successContainer()
        .h2('Permission Added')
        .text(
          `**${effect === 'DENY' ? 'Denied' : 'Granted'}** \`${resourceDisplay}\` to ${subjectMention}`
        )
        .footer(`${resolved.type}: ${resolved.key}`);

      await editReply(interaction, result);
    } catch (error) {
      this.container.logger.error('Error adding permission grant:', error);
      await editReply(interaction, errorMessage('Error', 'Failed to add permission grant.'));
    }
  }

  public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply(ephemeralError('This command can only be used in a server.'));
      return;
    }

    const resourceInput = interaction.options.getString('resource', true);
    const role = interaction.options.getRole('role') as Role | null;
    const user = interaction.options.getUser('user');

    if (!role && !user) {
      await interaction.reply(ephemeralError('You must specify either a role or a user.'));
      return;
    }

    if (role && user) {
      await interaction.reply(ephemeralError('Please specify only one: role or user.'));
      return;
    }

    const resolved = resolveResourceInput(resourceInput);
    if (!resolved) {
      await interaction.reply(
        ephemeralError(`Unknown resource: "${resourceInput}". Use a valid command or category.`)
      );
      return;
    }

    await defer(interaction);

    try {
      const subjectType: PermissionSubjectType = role ? 'ROLE' : 'USER';
      const subjectId = role
        ? role.id
        : ensureNonNull(user, 'permission.ts > chatInputRemove > user').id;

      const removed = await removePermissionGrant(
        interaction.guild.id,
        subjectType,
        subjectId,
        resolved.type as PermissionResourceType,
        resolved.key
      );

      if (!removed) {
        await editReply(
          interaction,
          errorMessage('Not Found', 'No matching permission grant found.')
        );
        return;
      }

      const subjectMention = role
        ? `<@&${role.id}>`
        : `<@${ensureNonNull(user, 'permission.ts > chatInputRemove > user').id}>`;
      const resourceDisplay =
        resolved.type === 'CATEGORY'
          ? (getCategory(resolved.key)?.displayName ?? resolved.key)
          : (getCommand(resolved.key)?.displayName ?? resolved.key);

      const result = successContainer()
        .h2('Permission Removed')
        .text(`Removed \`${resourceDisplay}\` from ${subjectMention}`)
        .footer(`${resolved.type}: ${resolved.key}`);

      await editReply(interaction, result);
    } catch (error) {
      this.container.logger.error('Error removing permission grant:', error);
      await editReply(interaction, errorMessage('Error', 'Failed to remove permission grant.'));
    }
  }

  public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply(ephemeralError('This command can only be used in a server.'));
      return;
    }

    const role = interaction.options.getRole('role') as Role | null;
    const user = interaction.options.getUser('user');
    const resourceInput = interaction.options.getString('resource');

    await defer(interaction);

    try {
      const filters: {
        subjectType?: PermissionSubjectType;
        subjectId?: string;
        resourceType?: PermissionResourceType;
        resourceKey?: string;
      } = {};

      if (role) {
        filters.subjectType = 'ROLE';
        filters.subjectId = role.id;
      } else if (user) {
        filters.subjectType = 'USER';
        filters.subjectId = user.id;
      }

      if (resourceInput) {
        const resolved = resolveResourceInput(resourceInput);
        if (resolved) {
          filters.resourceType = resolved.type as PermissionResourceType;
          filters.resourceKey = resolved.key;
        }
      }

      const grants = await listPermissionGrants(interaction.guild.id, filters);

      if (grants.length === 0) {
        const result = infoContainer().h2('Permission Grants').text('No permission grants found.');
        await editReply(interaction, result);
        return;
      }

      const lines: string[] = [];
      for (const grant of grants.slice(0, 25)) {
        const subjectMention =
          grant.subjectType === 'ROLE' ? `<@&${grant.subjectId}>` : `<@${grant.subjectId}>`;
        const resourceDisplay =
          grant.resourceType === 'CATEGORY'
            ? (getCategory(grant.resourceKey)?.displayName ?? grant.resourceKey)
            : (getCommand(grant.resourceKey)?.displayName ?? grant.resourceKey);
        const effectIcon = grant.effect === 'ALLOW' ? '✅' : '❌';
        lines.push(
          `${effectIcon} ${subjectMention} → \`${resourceDisplay}\` (${grant.resourceType.toLowerCase()})`
        );
      }

      const result = infoContainer()
        .h2('Permission Grants')
        .text(lines.join('\n'))
        .when(grants.length > 25, (c) => c.footer(`Showing 25 of ${grants.length} grants`));

      await editReply(interaction, result);
    } catch (error) {
      this.container.logger.error('Error listing permission grants:', error);
      await editReply(interaction, errorMessage('Error', 'Failed to list permission grants.'));
    }
  }

  public override async autocompleteRun(interaction: Subcommand.AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'resource') {
      const query = focusedOption.value.toLowerCase();
      const results: { name: string; value: string }[] = [];

      for (const category of allCategories()) {
        if (category.key.includes(query) || category.displayName.toLowerCase().includes(query)) {
          results.push({
            name: `${category.displayName} (category)`,
            value: category.key,
          });
        }
      }

      for (const cmdKey of allCommandKeys()) {
        const cmd = getCommand(cmdKey);
        if (cmd && (cmdKey.includes(query) || cmd.displayName.toLowerCase().includes(query))) {
          results.push({
            name: `${cmd.displayName} (${cmdKey})`,
            value: cmdKey,
          });
        }
      }

      await interaction.respond(results.slice(0, 25));
    }
  }
}
