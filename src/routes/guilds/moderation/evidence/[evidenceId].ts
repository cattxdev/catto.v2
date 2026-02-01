import { Route } from '@sapphire/plugin-api';
import { ApiGate } from '#lib/validation/ApiGate.js';
import { RateLimitGate } from '#lib/validation/RateLimitGate.js';
import { evidenceService } from '#modules/moderation/services/EvidenceService.js';
import { parseRequestBody } from '#lib/route-utils.js';

export class EvidenceDetailRoute extends Route {
  public constructor(context: Route.LoaderContext, options: Route.Options) {
    super(context, {
      ...options,
      route: 'guilds/[guildId]/moderation/evidence/[evidenceId]',
      methods: ['GET', 'POST'],
    });
  }

  public async run(request: Route.Request, response: Route.Response) {
    const { guildId, evidenceId } = request.params;
    if (!guildId || !evidenceId) {
      return response.status(400).json({ error: 'Guild ID and Evidence ID are required' });
    }

    const gate = await ApiGate.fromRequest(request, guildId);
    if (!gate)
      return response.status(401).json({ error: 'Unauthorized', code: 'NOT_AUTHENTICATED' });

    const auth = await gate.checkAuth('mod.evidence.view');
    if (!auth.ok)
      return response
        .status(403)
        .json({ error: 'Forbidden', code: auth.code, metadata: auth.metadata });

    const rateLimit = await gate.checkRateLimit(
      'evidence.view',
      RateLimitGate.LIMITS['evidence.view']!
    );
    if (!rateLimit.ok)
      return response
        .status(429)
        .json({ error: 'Rate Limited', retryAfterMs: rateLimit.metadata?.retryAfterMs });

    // Route based on the sub-action in query or body
    const subAction = (request.query?.action as string) ?? '';

    try {
      if (request.method === 'GET') {
        switch (subAction) {
          case 'view-url':
            return this.handleViewUrl(gate, evidenceId, response);
          case 'download-url':
            return this.handleDownloadUrl(gate, evidenceId, response);
          case 'history':
            return this.handleHistory(evidenceId, response);
          default:
            return this.handleGetDetail(evidenceId, response);
        }
      }

      if (request.method === 'POST') {
        return this.handleAmend(gate, evidenceId, request, response);
      }

      return response.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
      this.container.logger.error('Error in evidence detail route:', error);
      return response.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /guilds/{guildId}/moderation/evidence/{evidenceId}
   * Get single evidence item with all details.
   */
  private async handleGetDetail(evidenceId: string, response: Route.Response) {
    const evidence = await evidenceService.getEvidenceById(evidenceId);
    if (!evidence) return response.status(404).json({ error: 'Evidence not found' });

    return response.json(evidence);
  }

  /**
   * GET /guilds/{guildId}/moderation/evidence/{evidenceId}?action=view-url
   * Get a presigned view URL for an evidence file.
   */
  private async handleViewUrl(_gate: ApiGate, evidenceId: string, response: Route.Response) {
    try {
      const url = await evidenceService.generateViewUrl(evidenceId);
      return response.json({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate view URL';
      return response.status(400).json({ error: message });
    }
  }

  /**
   * GET /guilds/{guildId}/moderation/evidence/{evidenceId}?action=download-url
   * Get a presigned download URL for an evidence file.
   */
  private async handleDownloadUrl(_gate: ApiGate, evidenceId: string, response: Route.Response) {
    try {
      const url = await evidenceService.generateDownloadUrl(evidenceId);
      return response.json({ url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate download URL';
      return response.status(400).json({ error: message });
    }
  }

  /**
   * GET /guilds/{guildId}/moderation/evidence/{evidenceId}?action=history
   * Get amendment history for an evidence item.
   */
  private async handleHistory(evidenceId: string, response: Route.Response) {
    const history = await evidenceService.getEvidenceHistory(evidenceId);
    return response.json({ history });
  }

  /**
   * POST /guilds/{guildId}/moderation/evidence/{evidenceId}
   * Add an amendment to the evidence item.
   */
  private async handleAmend(
    gate: ApiGate,
    evidenceId: string,
    request: Route.Request,
    response: Route.Response
  ) {
    const addAuth = await gate.checkAuth('mod.evidence.add');
    if (!addAuth.ok) return response.status(403).json({ error: 'Forbidden', code: addAuth.code });

    const body = ((await parseRequestBody(request)) ?? {}) as Record<string, unknown>;
    const { action, newValue, reason } = body as {
      action: string;
      newValue?: string;
      reason?: string;
    };

    if (!action) {
      return response
        .status(400)
        .json({ error: 'action is required (e.g., NOTE_ADDED, DESCRIPTION_UPDATED)' });
    }

    const amendment = await evidenceService.amendEvidence({
      evidenceId,
      amendedById: gate.userId,
      amendedByTag: gate.member.user.tag,
      action,
      newValue,
      reason,
    });

    return response.json(amendment);
  }
}
