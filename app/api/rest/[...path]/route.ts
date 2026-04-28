import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { d1ApiFetch } from '@/lib/server-api';

// Catch-all route for REST API endpoints
// This file exists to satisfy Next.js type checking
export async function GET(request: NextRequest) {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
