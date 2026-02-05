import axios from 'axios';
import { URL } from 'node:url';
import dns from 'node:dns/promises';

export interface OGData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// TODO: This should be part of a custom security layer, not hard coded in the fetcher
/**
 * Check if an IP address is private/internal (SSRF protection).
 * Blocks: loopback, private ranges, link-local, metadata services.
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 patterns
  const ipv4Patterns = [
    /^127\./, // Loopback
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private Class B
    /^192\.168\./, // Private Class C
    /^169\.254\./, // Link-local
    /^0\./, // Current network
    /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // Carrier-grade NAT
    /^192\.0\.0\./, // IETF protocol assignments
    /^192\.0\.2\./, // TEST-NET-1
    /^198\.51\.100\./, // TEST-NET-2
    /^203\.0\.113\./, // TEST-NET-3
    /^192\.88\.99\./, // 6to4 relay anycast
    /^224\./, // Multicast
    /^240\./, // Reserved
    /^255\.255\.255\.255$/, // Broadcast
  ];

  // IPv6 patterns
  const ipv6Patterns = [
    /^::1$/, // Loopback
    /^fe80:/i, // Link-local
    /^fc00:/i, // Unique local
    /^fd00:/i, // Unique local
    /^ff00:/i, // Multicast
    /^::ffff:127\./i, // IPv4-mapped loopback
    /^::ffff:10\./i, // IPv4-mapped private
    /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./i, // IPv4-mapped private
    /^::ffff:192\.168\./i, // IPv4-mapped private
    /^::ffff:169\.254\./i, // IPv4-mapped link-local
  ];

  for (const pattern of ipv4Patterns) {
    if (pattern.test(ip)) return true;
  }
  for (const pattern of ipv6Patterns) {
    if (pattern.test(ip)) return true;
  }

  return false;
}

/**
 * Validate a URL for SSRF protection
 * Only allows http/https and blocks private/internal IP addresses
 */
async function validateUrl(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    // Block localhost and common internal hostnames
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === 'metadata' ||
      hostname === 'metadata.google.internal' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }

    // Check if hostname is a direct IP address (before DNS resolution)
    // This catches cases like http://127.0.0.1 or http://10.0.0.1
    if (isPrivateIP(hostname)) {
      return false;
    }

    // Resolve hostname to IP and check if resolved IPs are private
    // This catches cases where a domain resolves to a private IP
    const addresses = await dns.resolve4(hostname).catch(() => []);
    const addresses6 = await dns.resolve6(hostname).catch(() => []);
    const allAddresses = [...addresses, ...addresses6];

    for (const ip of allAddresses) {
      if (isPrivateIP(ip)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// oEmbed endpoints for providers that block bot UAs or require JS rendering
const OEMBED_PROVIDERS: { pattern: RegExp; endpoint: string }[] = [
  {
    pattern: /(?:youtube\.com\/(?:watch|shorts)|youtu\.be\/)/,
    endpoint: 'https://www.youtube.com/oembed',
  },
  {
    pattern: /(?:twitter\.com|x\.com)\/\w+\/status\//,
    endpoint: 'https://publish.twitter.com/oembed',
  },
  {
    pattern: /vimeo\.com\/\d+/,
    endpoint: 'https://vimeo.com/api/oembed.json',
  },
  {
    pattern: /soundcloud\.com\/.+\/.+/,
    endpoint: 'https://soundcloud.com/oembed',
  },
  {
    pattern: /open\.spotify\.com\/(track|album|playlist|episode)\//,
    endpoint: 'https://open.spotify.com/oembed',
  },
];

/**
 * Fetch OpenGraph metadata from a URL.
 * Tries oEmbed first for known providers, falls back to HTML meta parsing.
 * Includes SSRF protection - blocks private/internal IP addresses.
 * Fails silently on timeout/error, returning null.
 */
export async function fetchOGData(url: string, timeout = 5000): Promise<OGData | null> {
  // SSRF protection: validate URL before making any requests
  if (!(await validateUrl(url))) {
    return null;
  }

  // Try oEmbed first for known providers
  const oembedEndpoint = findOEmbedEndpoint(url);
  if (oembedEndpoint) {
    const result = await fetchViaOEmbed(url, oembedEndpoint, timeout);
    if (result) return result;
  }

  // Fall back to HTML meta tag parsing
  try {
    const response = await axios.get(url, {
      timeout,
      maxContentLength: 512 * 1024, // 512KB max
      headers: BROWSER_HEADERS,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const html = typeof response.data === 'string' ? response.data : '';

    const title =
      extractMeta(html, 'og:title') ?? extractMeta(html, 'twitter:title') ?? extractTitle(html);
    const description =
      extractMeta(html, 'og:description') ??
      extractMeta(html, 'twitter:description') ??
      extractMetaByName(html, 'description');
    const image = extractMeta(html, 'og:image') ?? extractMeta(html, 'twitter:image');
    const siteName = extractMeta(html, 'og:site_name');

    if (!title && !description && !image) return null;

    return { title, description, image, siteName };
  } catch {
    return null;
  }
}

function findOEmbedEndpoint(url: string): string | null {
  for (const { pattern, endpoint } of OEMBED_PROVIDERS) {
    if (pattern.test(url)) return endpoint;
  }
  return null;
}

async function fetchViaOEmbed(
  url: string,
  endpoint: string,
  timeout: number
): Promise<OGData | null> {
  try {
    const res = await axios.get(endpoint, {
      params: { url, format: 'json' },
      timeout,
      headers: BROWSER_HEADERS,
    });

    const data = res.data;
    if (!data) return null;

    const og: OGData = {};
    if (data.title) og.title = String(data.title);
    if (data.thumbnail_url) og.image = String(data.thumbnail_url);
    if (data.provider_name) og.siteName = String(data.provider_name);
    if (data.description) og.description = String(data.description);

    return og.title || og.image ? og : null;
  } catch {
    return null;
  }
}

function extractMeta(html: string, property: string): string | undefined {
  const escaped = escapeRegex(property);
  const patterns = [
    // property/name first, then content
    new RegExp(
      `<meta[^>]*?(?:property|name)\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*?)["']`,
      'i'
    ),
    // content first, then property/name
    new RegExp(
      `<meta[^>]*?content\\s*=\\s*["']([^"']*?)["'][^>]*?(?:property|name)\\s*=\\s*["']${escaped}["']`,
      'i'
    ),
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]?.trim()) return decodeHTMLEntities(match[1].trim());
  }
  return undefined;
}

function extractMetaByName(html: string, name: string): string | undefined {
  const escaped = escapeRegex(name);
  const patterns = [
    new RegExp(
      `<meta[^>]*?name\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']*?)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]*?content\\s*=\\s*["']([^"']*?)["'][^>]*?name\\s*=\\s*["']${escaped}["']`,
      'i'
    ),
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]?.trim()) return decodeHTMLEntities(match[1].trim());
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ? decodeHTMLEntities(match[1].trim()) : undefined;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
