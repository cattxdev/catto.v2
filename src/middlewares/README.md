# Authentication Middleware Setup

This directory contains middleware for authenticating API requests using Sapphire's built-in OAuth2 support.

## Available Middlewares

### 1. `authenticated.ts` - Authentication Check
Ensures that a user is authenticated via OAuth2 before accessing protected routes.

**Position**: 20 (runs after body parsing)

**Usage**: Automatically applies to all routes. Returns 401 if not authenticated.

### 2. `guildAccess.ts` - Guild Access Check
Verifies that an authenticated user has access to a specific guild.

**Position**: 30 (runs after authenticated middleware)

**Usage**: Automatically checks `guildId` param and verifies user membership. Returns 403 if user doesn't have access.

**Features**:
- Fetches user's guilds from Discord API
- Checks guild membership
- Detects admin permissions
- Stores access info in `request.guildAccess`

## How to Use

### Setting Up OAuth2

Your OAuth2 is already configured in `BotClient.ts`:

```typescript
api: {
  auth: {
    id: CONFIG.CLIENT_ID,
    secret: CONFIG.CLIENT_SECRET,
    cookie: 'SAPPHIRE_AUTH',
    redirect: CONFIG.API_REDIRECT,
    scopes: [OAuth2Scopes.Identify, OAuth2Scopes.Guilds],
  },
  // ... other config
}
```

### OAuth Flow

1. **Login**: Direct users to `/oauth/login?redirect=/your-return-path`
2. **Callback**: User is redirected to `POST /api/oauth/callback` after authorization
3. **Cookie**: Sapphire sets a secure cookie (`SAPPHIRE_AUTH`)
4. **Protected Routes**: Middlewares check the cookie automatically
5. **Logout**: `POST /api/oauth/logout` clears the cookie

### Accessing User Data in Routes

```typescript
import { methods, Route, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';

export class MyProtectedRoute extends Route {
  public [methods.GET](request: ApiRequest, response: ApiResponse) {
    // User data is available via request.auth
    const userId = request.auth?.id;
    const token = request.auth?.token;
    
    // Guild access info (from guildAccess middleware)
    const { hasAccess, isAdmin } = (request as any).guildAccess || {};
    
    // Your route logic here
  }
}
```

### Route Parameters

For guild-specific routes, use the `guildId` parameter:

```typescript
// Route definition
route: 'guilds/:guildId/settings'

// The guildAccess middleware will automatically:
// 1. Extract the guildId parameter
// 2. Verify user has access to that guild
// 3. Return 403 if user doesn't have access
```

### Disabling Middlewares for Specific Routes

If you need a route to bypass authentication:

```typescript
export class PublicRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'public/data'
    });
  }
  
  // Simply check if auth exists and handle both cases
  public [methods.GET](request: ApiRequest, response: ApiResponse) {
    const isAuthenticated = !!request.auth;
    // Handle authenticated and non-authenticated requests differently
  }
}
```

## Example: Protected Guild Route

```typescript
import { methods, Route, type ApiRequest, type ApiResponse } from '@sapphire/plugin-api';

export class GuildSettingsRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/:guildId/settings'
    });
  }

  public async [methods.GET](request: ApiRequest, response: ApiResponse) {
    const { guildId } = request.params;
    const { isAdmin } = (request as any).guildAccess || {};

    // Fetch guild settings from database
    const guild = await this.container.prisma.guild.findUnique({
      where: { guildId }
    });

    if (!guild) {
      return response.status(404).json({ error: 'Guild not found' });
    }

    // Return different data based on permissions
    if (isAdmin) {
      return response.json({ ...guild, fullAccess: true });
    } else {
      return response.json({ 
        id: guild.guildId,
        name: guild.name,
        publicSettings: guild.settings
      });
    }
  }

  public async [methods.PATCH](request: ApiRequest, response: ApiResponse) {
    const { guildId } = request.params;
    const { isAdmin } = (request as any).guildAccess || {};

    // Only admins can modify settings
    if (!isAdmin) {
      return response.status(403).json({ 
        error: 'Admin permissions required' 
      });
    }

    // Update logic here
  }
}
```

## Testing Authentication

### Using Postman/Thunder Client

1. First, authenticate by opening in browser:
   ```
   http://localhost:4000/oauth/login?redirect=/dashboard
   ```

2. After authentication, grab the `SAPPHIRE_AUTH` cookie from your browser

3. In Postman, add the cookie to your requests:
   ```
   Cookie: SAPPHIRE_AUTH=<your-cookie-value>
   ```

### Using curl

```bash
# After getting your cookie from browser
curl -H "Cookie: SAPPHIRE_AUTH=your-cookie-value" \
  http://localhost:4000/api/users/@me
```

## Security Notes

- The `SAPPHIRE_AUTH` cookie is HTTP-only and secure in production
- Tokens are encrypted and stored securely by Sapphire
- Always validate permissions in your route handlers
- The middleware only checks guild membership, not Discord permissions
- For permission-specific checks, use the Discord API or cache

## Middleware Execution Order

1. **Body Parser** (position 10) - Built-in Sapphire middleware
2. **Authenticated** (position 20) - Checks OAuth2 authentication
3. **GuildAccess** (position 30) - Checks guild membership
4. **Your Route Handler** - Processes the request
