import { NextResponse } from 'next/server'
import { processPendingNotifications } from '@/lib/notifications-service'

export async function POST() {
  try {
    await processPendingNotifications()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Process notifications error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
