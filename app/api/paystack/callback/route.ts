import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!reference) {
    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
  }

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY!;
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const json = await res.json();
    if (!res.ok || !json.status || json.data?.status !== 'success') {
      return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
    }

    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=success`);
  } catch {
    return NextResponse.redirect(`${siteUrl}/dashboard?checkout=failed`);
  }
}
