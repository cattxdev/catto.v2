import { ApiRequest, ApiResponse, Middleware, type MiddlewareOptions } from '@sapphire/plugin-api';

/**
 * Middleware to ensure a user is authenticated via OAuth2
 */
export class AuthenticatedMiddleware extends Middleware {
	public constructor(context: Middleware.LoaderContext, options: MiddlewareOptions) {
		super(context, {
			...options,
			position: 20 // Run after body parsing (10) but before route handlers
		});
	}

	public override async run(request: ApiRequest, response: ApiResponse): Promise<void> {
		// Check if the request has authentication
		if (!request.auth) {
			response.status(401).json({
				error: 'Unauthorized',
				message: 'You must be logged in to access this resource'
			});
			return;
		}

		// Authentication successful, continue to next middleware/route
	}
}
