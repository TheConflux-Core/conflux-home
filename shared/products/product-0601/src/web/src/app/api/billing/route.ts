import { NextResponse } from 'next/server';
import { stripe, PLANS } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const { plan, email, userId } = await request.json();

    const selectedPlan = PLANS[plan as keyof typeof PLANS];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: selectedPlan.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId, plan },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
