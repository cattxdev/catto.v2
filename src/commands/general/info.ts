import { Subcommand } from '#subcommand.js';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Subcommand.Options>({
  name: 'info',
  aliases: ['botinfo', 'stats'],
  description: 'Display bot information and statistics',
  detailedDescription:
    'Shows detailed information about the bot including version, uptime, and statistics.',
})
export class InfoCommand extends Subcommand {
  public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
    super(context, {
      ...options,
    });
  }

  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) => {
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommandGroup((group) =>
          group.setName('help').setDescription('Get help about various bot features')
        );

      // Register all subcommand groups using hooks
      this.hooks.groups(this, builder);

      return builder;
    });
  }
}
