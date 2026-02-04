import { Subcommand } from '#root/lib/sapphire/command/command.js';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Subcommand.Options>({
  name: 'voice',
  description: 'Manage your temporary voice channel',
  preconditions: ['GuildOnly'],
})
export class VoiceCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
      name: 'voice',
      preconditions: [], // The preconditions set here affect all subcommands.
    });
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) => {
      // Register all subcommands and groups using hooks
      this.hooks.subcommands(this, builder);

      return builder.setName(this.name).setDescription(this.description).setDMPermission(false);
    });
  }
}
