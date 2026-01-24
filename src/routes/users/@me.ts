import { Route, type ApiRequest, type ApiResponse, HttpCodes } from '@sapphire/plugin-api';
import axios from 'axios';

/**
 * Get current authenticated user information
 * This route requires authentication via the authenticated middleware
 */
export class UserMeRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'users/@me',
      methods: ['GET'],
    });
  }

  public async run(request: ApiRequest, response: ApiResponse) {
    // Get the auth token from cookie
    const authCookieName = 'DASHBOARD_AUTH';
    const authToken = request.headers.cookie
      ?.split('; ')
      .find((c) => c.startsWith(`${authCookieName}=`))
      ?.split('=')[1];

    if (!authToken) {
      return response.status(HttpCodes.Unauthorized).json({
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      });
    }

    try {
      // Fetch user data from Discord API
      const userResponse = await axios.get('https://discord.com/api/v10/users/@me', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (userResponse.status !== 200) {
        return response.status(HttpCodes.InternalServerError).json({
          error: 'Failed to fetch user data from Discord',
        });
      }

      const userData = userResponse.data;

      // Optionally fetch guilds
      let guilds = [];
      try {
        const guildsResponse = await axios.get('https://discord.com/api/v10/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (guildsResponse.status === 200) {
          guilds = guildsResponse.data;
        }
      } catch (error) {
        // Guilds are optional, don't fail if we can't fetch them
        this.container.logger.warn('Failed to fetch user guilds:', error);
      }

      // Return user data
      return response.json({
        user: {
          id: userData.id,
          username: userData.username,
          discriminator: userData.discriminator,
          avatar: userData.avatar,
          email: userData.email,
          verified: userData.verified,
          mfa_enabled: userData.mfa_enabled,
          locale: userData.locale,
          flags: userData.flags,
          premium_type: userData.premium_type,
          public_flags: userData.public_flags,
        },
        guilds: guilds.map(
          (guild: {
            id: string;
            name: string;
            icon: string | null;
            owner: boolean;
            permissions: string;
            features: string[];
          }) => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            permissions: guild.permissions,
            features: guild.features,
          })
        ),
      });
    } catch (error) {
      this.container.logger.error('Error fetching user data:', error);
      return response.status(HttpCodes.InternalServerError).json({
        error: 'Internal Server Error',
        message: 'Failed to fetch user data',
      });
    }
  }
}
