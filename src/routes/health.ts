import { Route } from '@sapphire/plugin-api';

export class HealthRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'health',
      methods: ['GET'],
    });
  }

  public run(_request: Route.Request, response: Route.Response) {
    return response.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now(),
      message: 'Bot API is running',
    });
  }
}
