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

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
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
  } catch (err) {
    console.error("PDF proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch PDF. The URL may be invalid or unreachable." },
      { status: 500 }
    );
  }
}
