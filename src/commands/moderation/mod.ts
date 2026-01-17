import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplyOptions } from '@sapphire/decorators';
import { PermissionFlagsBits, SlashCommandSubcommandBuilder, InteractionContextType } from 'discord.js';
import { handleKick } from './_kick.js';
import { handleTimeout } from './_timeout.js';
import { handleWarn } from './_warn.js';
import { handleUnban } from './_unban.js';
import { handleCase } from './_case.js';
import { handleHistory } from './_history.js';
import { handleBan } from './_ban.js';

@ApplyOptions<Subcommand.Options>({
	name: 'mod',
	description: 'Moderation commands',
	requiredUserPermissions: [PermissionFlagsBits.ModerateMembers],
	requiredClientPermissions: [PermissionFlagsBits.ModerateMembers],
	subcommands: [
		{
			name: 'ban',
			chatInputRun: 'chatInputBan'
		},
		{
			name: 'kick',
			chatInputRun: 'chatInputKick'
		},
		{
			name: 'timeout',
			chatInputRun: 'chatInputTimeout'
		},
		{
			name: 'warn',
			chatInputRun: 'chatInputWarn'
		},
		{
			name: 'unban',
			chatInputRun: 'chatInputUnban'
		},
		{
			name: 'case',
			chatInputRun: 'chatInputCase'
		},
		{
			name: 'history',
			chatInputRun: 'chatInputHistory'
		}
	]
})
export class ModCommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
				.setContexts(InteractionContextType.Guild)
				.addSubcommand(this.buildBanSubcommand)
				.addSubcommand(this.buildKickSubcommand)
				.addSubcommand(this.buildTimeoutSubcommand)
				.addSubcommand(this.buildWarnSubcommand)
				.addSubcommand(this.buildUnbanSubcommand)
				.addSubcommand(this.buildCaseSubcommand)
				.addSubcommand(this.buildHistorySubcommand)
		);
	}

	private buildBanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('ban')
			.setDescription('Ban a member from the server')
			.addUserOption((option) =>
				option
					.setName('target')
					.setDescription('The member to ban')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('reason')
					.setDescription('Reason for the ban')
					.setMaxLength(512)
			)
			.addBooleanOption((option) =>
				option
					.setName('delete_messages')
					.setDescription('Delete messages from the last 7 days')
			);
	}

	private buildKickSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('kick')
			.setDescription('Kick a member from the server')
			.addUserOption((option) =>
				option
					.setName('target')
					.setDescription('The member to kick')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('reason')
					.setDescription('Reason for the kick')
					.setMaxLength(512)
			);
	}

	private buildTimeoutSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('timeout')
			.setDescription('Timeout a member')
			.addUserOption((option) =>
				option
					.setName('target')
					.setDescription('The member to timeout')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('duration')
					.setDescription('Duration (e.g., 10m, 1h, 1d)')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('reason')
					.setDescription('Reason for the timeout')
					.setMaxLength(512)
			);
	}

	private buildWarnSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('warn')
			.setDescription('Warn a member')
			.addUserOption((option) =>
				option
					.setName('target')
					.setDescription('The member to warn')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('reason')
					.setDescription('Reason for the warning')
					.setRequired(true)
					.setMaxLength(512)
			);
	}

	private buildUnbanSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('unban')
			.setDescription('Unban a user')
			.addStringOption((option) =>
				option
					.setName('user_id')
					.setDescription('The user ID to unban')
					.setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('reason')
					.setDescription('Reason for the unban')
					.setMaxLength(512)
			);
	}

	private buildCaseSubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('case')
			.setDescription('View a moderation case')
			.addIntegerOption((option) =>
				option
					.setName('number')
					.setDescription('Case number')
					.setRequired(true)
					.setMinValue(1)
			);
	}

	private buildHistorySubcommand(subcommand: SlashCommandSubcommandBuilder) {
		return subcommand
			.setName('history')
			.setDescription('View moderation history for a user')
			.addUserOption((option) =>
				option
					.setName('target')
					.setDescription('The user to check')
					.setRequired(true)
			);
	}

	public async chatInputBan(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleBan(interaction);
	}

	public async chatInputKick(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleKick(interaction);
	}

	public async chatInputTimeout(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleTimeout(interaction);
	}

	public async chatInputWarn(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleWarn(interaction);
	}

	public async chatInputUnban(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleUnban(interaction);
	}

	public async chatInputCase(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleCase(interaction);
	}

	public async chatInputHistory(interaction: Subcommand.ChatInputCommandInteraction) {
		return handleHistory(interaction);
	}
}
