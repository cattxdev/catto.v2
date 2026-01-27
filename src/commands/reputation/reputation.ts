import { Subcommand } from '#subcommand.js';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Subcommand.Options>({
  name: 'reputation',
  description: 'View reputation information',
  preconditions: ['GuildOnly'],
})
export class ReputationCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'reputation',
      preconditions: [],
    });
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) => {
      // Register all subcommands using hooks
      this.hooks.subcommands(this, builder);

      return builder.setName(this.name).setDescription(this.description).setDMPermission(false);
    });
  }
}
