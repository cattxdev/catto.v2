import { Route, type ApiRequest, type ApiResponse, HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';

/**
 * OAuth Callback Route
 * Handles Discord OAuth2 callback and exchanges code for access token
 */
export class OAuthCallbackRoute extends Route {
	public constructor(context: Route.LoaderContext, options: Route.Options) {
		super(context, {
			...options,
			route: 'oauth/callback',
			methods: ['GET']
		});
	}

	public async run(request: ApiRequest, response: ApiResponse) {
		const { server } = this.container;
		
		if (!server.auth) {
			return response.status(HttpCodes.InternalServerError).json({
				error: 'OAuth is not configured'
			});
		}

		// Get the authorization code from query params
		const code = request.query.code as string;

		if (!code) {
			return response.status(HttpCodes.BadRequest).json({
				error: 'Missing authorization code'
			});
		}

		try {
			// Exchange code for access token
			const tokenResponse = await axios.post(
				'https://discord.com/api/v10/oauth2/token',
				new URLSearchParams({
					client_id: server.auth.id!,
					client_secret: server.auth.secret!,
					grant_type: 'authorization_code',
					code: code,
					redirect_uri: server.auth.redirect!
				}),
				{
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					}
				}
			);

			const { access_token } = tokenResponse.data;

			// Instead of setting cookie here, redirect to dashboard with token
			// Dashboard will set the cookie on its own domain
			const redirectUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
			const callbackUrl = `${redirectUrl}/api/auth/callback?token=${encodeURIComponent(access_token)}`;
			
			return response.status(302).setHeader('Location', callbackUrl).text('');

		} catch (error) {
			this.container.logger.error('OAuth callback error:', error);
			return response.status(HttpCodes.InternalServerError).json({
				error: 'Failed to complete OAuth flow'
			});
		}
	}
}
