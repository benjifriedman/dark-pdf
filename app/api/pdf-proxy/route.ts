import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiting
 * 
 * NOTE: This works for single-instance deployments but has limitations on serverless
 * platforms like Vercel where:
 * - Each request may hit a different instance (no shared memory)
 * - Cold starts reset the Map
 * - Multiple concurrent instances don't share state
 * 
 * For production with high traffic, consider using:
 * - Vercel KV or Upstash Redis for distributed rate limiting
 * - Vercel's built-in rate limiting (Pro/Enterprise plans)
 * 
 * The current implementation still provides basic protection against casual abuse
 * since requests often hit the same warm instance.
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return false;
  }

  record.count++;
  
  if (record.count > RATE_LIMIT) {
    return true;
  }

  return false;
}

/**
 * Validate that a URL is a safe external HTTP/HTTPS URL
 * Prevents SSRF attacks by blocking internal/private IPs
 */
function isValidExternalUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS URLs are allowed" };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return { valid: false, error: "Localhost URLs are not allowed" };
    }
    
    // Block private IP ranges
    const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const [, a, b] = ipv4Match.map(Number);
      // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (link-local)
      if (a === 10 || 
          (a === 172 && b >= 16 && b <= 31) || 
          (a === 192 && b === 168) ||
          (a === 169 && b === 254) ||
          a === 0) {
        return { valid: false, error: "Private IP addresses are not allowed" };
      }
    }
    
    // Block common internal hostnames
    const blockedPatterns = ['internal', 'intranet', 'corp', 'private', 'local'];
    if (blockedPatterns.some(pattern => hostname.includes(pattern))) {
      return { valid: false, error: "Internal hostnames are not allowed" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

export async function GET(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
             request.headers.get("x-real-ip") || 
             "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing URL parameter" }, { status: 400 });
  }

  // Validate URL to prevent SSRF
  const validation = isValidExternalUrl(url);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PDFProxy/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("pdf")) {
      return NextResponse.json(
        { error: "URL does not point to a PDF file" },
        { status: 400 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch PDF. The URL may be invalid or unreachable." },
      { status: 500 }
    );
  }
}
