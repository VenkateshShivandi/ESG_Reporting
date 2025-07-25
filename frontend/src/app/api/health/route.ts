import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'frontend',
    message: '✅ Frontend is running successfully!',
  })
}
