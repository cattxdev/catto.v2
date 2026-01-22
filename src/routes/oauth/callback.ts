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

			const { access_token, refresh_token, expires_in } = tokenResponse.data;

			// Fetch user data
			const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
				headers: {
					Authorization: `Bearer ${access_token}`
				}
			});

			const user = userResponse.data;

			// Set auth cookie (Sapphire format)
			const authData = JSON.stringify({
				token: access_token,
				refresh: refresh_token,
				expires: Date.now() + (expires_in * 1000),
				user_id: user.id
			});

			response.cookies.add(server.auth.cookie!, authData, {
				maxAge: expires_in,
				httpOnly: true,
				path: '/'
			});

			// Redirect back to dashboard
			const redirectUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
			return response.status(302).setHeader('Location', redirectUrl).text('');

		} catch (error) {
			this.container.logger.error('OAuth callback error:', error);
			return response.status(HttpCodes.InternalServerError).json({
				error: 'Failed to complete OAuth flow'
			});
		}
	}
}
