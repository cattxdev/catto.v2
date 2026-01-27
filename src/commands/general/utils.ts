import { Subcommand } from '#root/lib/sapphire/command/command.js';
import { ApplicationCommandRegistry } from '@sapphire/framework';

export class ParentCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'utils',
      description: 'Utility commands',
      // No need to manually specify subcommands - base class handles it automatically!
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((ctx) => {
      // It is necessary to call this hook to register the subcommands in Discord
      this.hooks.subcommands(this, ctx);
      return ctx.setName(this.name).setDescription('Parent command of utils subcommands');
    });
  }
}
