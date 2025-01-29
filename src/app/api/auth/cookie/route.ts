import { NextResponse } from 'next/server'


export async function DELETE() {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('auth')
    return response
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    // Create the response
    const response = NextResponse.json({ success: true })
    
    // Set the cookie in the response
    response.cookies.set('auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 })
  }
}