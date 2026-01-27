import {
  container,
  UserError,
  type ChatInputCommand,
  type MessageCommand,
} from '@sapphire/framework';
import type {
  Subcommand,
  SubcommandMappingGroup,
  SubcommandMappingMethod,
  ChatInputSubcommandDeniedPayload,
  MessageSubcommandDeniedPayload,
} from '@sapphire/plugin-subcommands';

import { ApplicationCommandOptionType } from 'discord-api-types/v10';
import type { SlashCommandSubcommandBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { subCommandsRegistry, subCommandsGroupRegistry } from './functions.js';
import { SubcommandsAdvancedEvents } from './types.js';

/**
 * Identifier for subcommand denied errors
 */
const SUBCOMMAND_DENIED_IDENTIFIER = 'SubcommandDenied' as const;

/**
 * **Hooks**
 *
 * Methods needed to register commands as subcommands and commands in subcommand groups.
 *
 * @since 1.0.0
 */
export const RegisterSubcommandsHooks = {
  subcommands: (piece: Subcommand, context?: SlashCommandBuilder) => {
    const subcommands = subCommandsRegistry.get(piece.name);
    if (!subcommands) {
      container.logger.error(
        `[Subcommands-Plugin]: An attempt was made to obtain the subcommands for the parent command ${piece.name} but no command was registered for it.`
      );

      return;
    }

    for (const { slashCommand, commandPiece } of subcommands.values()) {
      container.logger.debug(
        `[Subcommands-Hook]: Processing subcommand "${slashCommand?.name ?? commandPiece?.name}" - commandPiece has chatInputRun: ${!!commandPiece.chatInputRun}`
      );

      if (slashCommand && context && Array.isArray(context.options)) {
        context.options.push(slashCommand);
      }

      const subcommand: SubcommandMappingMethod = {
        name: slashCommand?.name ?? commandPiece?.name ?? '',
        type: 'method',
        chatInputRun: commandPiece.chatInputRun
          ? async (i, c) => {
              try {
                const result = await piece.preconditions.chatInputRun(
                  i,
                  piece as unknown as ChatInputCommand
                );
                if (result.isErr()) {
                  const payload: ChatInputSubcommandDeniedPayload = {
                    command: piece,
                    interaction: i,
                    subcommand,
                    matchedSubcommandMapping: subcommand,
                    context: c,
                  };
                  return piece.container.client.emit(
                    SubcommandsAdvancedEvents.ChatInputSubcommandDenied,
                    result.err().unwrapOr(
                      new UserError({
                        context: c,
                        identifier: SUBCOMMAND_DENIED_IDENTIFIER,
                        message: 'Unknown error',
                      })
                    ),
                    payload
                  );
                }

                container.logger.debug(
                  `[Subcommands-Hook]: Executing chatInputRun for "${commandPiece.name}"`
                );
                return commandPiece.chatInputRun
                  ? await commandPiece.chatInputRun(i, c)
                  : undefined;
              } catch (error) {
                container.logger.error(
                  `[Subcommands-Hook]: Error executing chatInputRun for "${commandPiece.name}":`,
                  error
                );
                if (!i.replied && !i.deferred) {
                  await i
                    .reply({
                      content: 'An error occurred while executing this command.',
                      ephemeral: true,
                    })
                    .catch(() => {});
                }
                throw error;
              }
            }
          : undefined,

        messageRun: commandPiece.messageRun
          ? async (m, a, c) => {
              const result = await piece.preconditions.messageRun(
                m,
                piece as unknown as MessageCommand
              );
              if (result.isErr()) {
                const payload: MessageSubcommandDeniedPayload = {
                  command: piece,
                  message: m,
                  subcommand,
                  matchedSubcommandMapping: subcommand,
                  context: c,
                };
                return piece.container.client.emit(
                  SubcommandsAdvancedEvents.MessageSubcommandDenied,
                  result.err().unwrapOr(
                    new UserError({
                      context: c,
                      identifier: SUBCOMMAND_DENIED_IDENTIFIER,
                      message: 'Unknown error',
                    })
                  ),
                  payload
                );
              }

              return commandPiece.messageRun ? commandPiece.messageRun(m, a, c) : undefined;
            }
          : undefined,
      };

      piece.parsedSubcommandMappings.push(subcommand);
    }
  },
  groups: (piece: Subcommand, context?: SlashCommandBuilder) => {
    const subcommandsGroups = subCommandsGroupRegistry.get(piece.name);
    if (!subcommandsGroups) {
      container.logger.error(
        `[Subcommands-Group-Plugin]: An attempt was made to obtain the subcommand groups for the parent command ${piece.name} but no command was registered for it.`
      );

      return;
    }

    for (const [name, commands] of subcommandsGroups) {
      for (const { slashCommand, commandPiece } of [...commands.values()]) {
        const groupMapping = piece.parsedSubcommandMappings.find(
          ({ name: x, type }) => x === name && type === 'group'
        ) as SubcommandMappingGroup;

        const subcommand: SubcommandMappingMethod = {
          name: slashCommand?.name ?? commandPiece?.name ?? '',
          type: 'method',
          chatInputRun: commandPiece.chatInputRun
            ? async (i, c) => {
                const result = await piece.preconditions.chatInputRun(
                  i,
                  piece as unknown as ChatInputCommand
                );
                if (result.isErr()) {
                  const payload: ChatInputSubcommandDeniedPayload = {
                    command: piece,
                    interaction: i,
                    subcommand,
                    matchedSubcommandMapping: subcommand,
                    context: c,
                  };
                  return piece.container.client.emit(
                    SubcommandsAdvancedEvents.ChatInputSubcommandDenied,
                    result.err().unwrapOr(
                      new UserError({
                        context: c,
                        identifier: SUBCOMMAND_DENIED_IDENTIFIER,
                        message: 'Unknown error',
                      })
                    ),
                    payload
                  );
                }

                return commandPiece.chatInputRun ? commandPiece.chatInputRun(i, c) : undefined;
              }
            : undefined,

          messageRun: commandPiece.messageRun
            ? async (m, a, c) => {
                const result = await piece.preconditions.messageRun(
                  m,
                  piece as unknown as MessageCommand
                );
                if (result.isErr()) {
                  const payload: MessageSubcommandDeniedPayload = {
                    command: piece,
                    message: m,
                    subcommand,
                    matchedSubcommandMapping: subcommand,
                    context: c,
                  };
                  return piece.container.client.emit(
                    SubcommandsAdvancedEvents.MessageSubcommandDenied,
                    result.err().unwrapOr(
                      new UserError({
                        context: c,
                        identifier: SUBCOMMAND_DENIED_IDENTIFIER,
                        message: 'Unknown error',
                      })
                    ),
                    payload
                  );
                }

                return commandPiece.messageRun ? commandPiece.messageRun(m, a, c) : undefined;
              }
            : undefined,
        };

        if (groupMapping) groupMapping.entries.push(subcommand);
        else {
          piece.parsedSubcommandMappings.push({
            name,
            type: 'group',
            entries: [subcommand],
          });
        }
      }
      if (context) {
        for (const option of context.options) {
          const data = option.toJSON();
          if (data.name === name && data.type === ApplicationCommandOptionType.SubcommandGroup) {
            (option as unknown as { options: SlashCommandSubcommandBuilder[] }).options?.push(
              ...[...commands.values()]
                .filter(({ slashCommand }) => slashCommand)
                .map(({ slashCommand }) => slashCommand as SlashCommandSubcommandBuilder)
            );
          }
        }
      }
    }
  },
};
