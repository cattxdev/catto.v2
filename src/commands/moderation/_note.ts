import { Subcommand } from '@sapphire/plugin-subcommands';
import { notesService } from '../../modules/moderation/services/NotesService.js';
import { buildNotesList } from '../../modules/moderation/discord/panelBuilder.js';
import { asGuildId, asUserId, asNoteId } from '../../modules/moderation/domain/types.js';
import { MessageFlags } from 'discord.js';
import {
  defer,
  editReply,
  ephemeralError,
  errorMessage,
  successMessage,
} from '#root/lib/discord/index.js';

export async function handleNoteAdd(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const target = interaction.options.getUser('target', true);
  const note = interaction.options.getString('note', true);
  const tagsStr = interaction.options.getString('tags');

  const tags = tagsStr
    ? tagsStr
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
    : [];

  await interaction.deferReply();

  try {
    const result = await notesService.addNote({
      guildId: asGuildId(interaction.guild.id),
      userId: asUserId(target.id),
      createdById: asUserId(interaction.user.id),
      note,
      tags,
    });

    if (!result.success) {
      await editReply(interaction, errorMessage('Error', `${result.error}`));
      return;
    }

    const tagsDisplay =
      tags.length > 0 ? `\n**Tags:** ${tags.map((t) => `\`${t}\``).join(', ')}` : '';
    await editReply(
      interaction,
      successMessage(
        `Note added for **${target.tag}**${tagsDisplay}\n**Note ID:** \`${result.noteId}\``
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in note add command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while adding the note.')
    );
  }
}

export async function handleNoteList(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const target = interaction.options.getUser('target', true);

  await interaction.deferReply();

  try {
    const notes = await notesService.listNotes(
      asGuildId(interaction.guild.id),
      asUserId(target.id)
    );

    const container = buildNotesList(target, notes);

    await interaction.editReply({
      components: [container.build()],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    interaction.client.logger.error('Error in note list command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while listing notes.')
    );
  }
}

export async function handleNoteDelete(interaction: Subcommand.ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply(ephemeralError('This command can only be used in a server.'));
    return;
  }

  const noteId = interaction.options.getString('note_id', true);

  await defer(interaction);

  try {
    // First get the note to show what was deleted
    const note = await notesService.getNote(asNoteId(noteId));

    if (!note) {
      await editReply(interaction, errorMessage('Error', 'Note not found.'));
      return;
    }

    const result = await notesService.deleteNote(asNoteId(noteId), asGuildId(interaction.guild.id));

    if (!result.success) {
      await editReply(interaction, errorMessage('Error', `${result.error}`));
      return;
    }

    await editReply(
      interaction,
      successMessage(
        `Note \`${noteId}\` has been deleted.\n**Preview:** ${note.note.substring(0, 100)}${note.note.length > 100 ? '...' : ''}`
      )
    );
  } catch (error) {
    interaction.client.logger.error('Error in note delete command:', error);
    await editReply(
      interaction,
      errorMessage('Error', 'An unexpected error occurred while deleting the note.')
    );
  }
}
