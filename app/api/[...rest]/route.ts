import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from "@/lib/auth-server";

// This is a catch-all proxy that forwards requests to your D1 REST Bridge.
// It handles paths like /api/rest/menu, /api/rest/transactions, etc.
// The D1 Bridge expects paths like /rest/menu, /rest/transactions, etc.

export async function GET(request: Request) {
  return handleProxy(request);
}

export async function POST(request: Request) {
  return handleProxy(request);
}

export async function PUT(request: Request) {
  return handleProxy(request);
}

export async function PATCH(request: Request) {
  return handleProxy(request);
}

export async function DELETE(request: Request) {
  return handleProxy(request);
}

async function handleProxy(request: Request) {
  // Authentication check
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  // Remove /api prefix from the incoming request URL
  const targetPath = url.pathname.replace('/api', '');
  const targetUrl = `${process.env.API_BASE_URL}${targetPath}${url.search}`;

  try {
    const options: RequestInit = {
      method: request.method,
      headers: {
        'Authorization': `Bearer ${process.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      options.body = JSON.stringify(await request.json());
    }

    const response = await fetch(targetUrl, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Proxy Error [${targetUrl}]:`, response.status, errorText);
      return NextResponse.json({ error: 'Bridge API Error' }, { status: response.status });
    }

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn(`Could not parse D1 JSON from ${targetUrl}:`, text);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
