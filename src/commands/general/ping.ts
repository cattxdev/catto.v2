import { Command } from '#command.js';

export class PingCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      registerSubCommand: {
        parentCommandName: 'utils', // Name of the parent command (parent.js).
        slashSubcommand: (builder) => builder.setName('ping').setDescription('Hi!'), // Builder that will be embedded in the parent command registry to register the slash subcommand.
      },
    });
  }

  // It is only necessary if the `slashSubcommand` option of the `registerSubCommand` command options is used.
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    return interaction.reply('uwu');
  }
}
