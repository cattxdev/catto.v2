import { ApiRequest, ApiResponse, Middleware, type MiddlewareOptions } from '@sapphire/plugin-api';

/**
 * Middleware to ensure a user is authenticated via OAuth2
 */
export class AuthenticatedMiddleware extends Middleware {
  public constructor(context: Middleware.LoaderContext, options: MiddlewareOptions) {
    super(context, {
      ...options,
      position: 20, // Run after body parsing (10) but before route handlers
    });
  }

  public override async run(request: ApiRequest, response: ApiResponse): Promise<void> {
    // Skip authentication for OAuth routes
    if (request.url?.includes('/oauth/')) {
      return;
    }

    // Check if the request has authentication cookie
    const authCookieName = 'DASHBOARD_AUTH';
    const authToken = request.headers.cookie
      ?.split('; ')
      .find((c) => c.startsWith(`${authCookieName}=`))
      ?.split('=')[1];

    if (!authToken) {
      response.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      });
      return;
    }

    // Authentication successful, continue to next middleware/route
  }
}
