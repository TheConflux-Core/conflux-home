import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await prisma.user.update({
          where: { id: userId },
          data: { plan, stripeCustId: session.customer as string },
        });
        await prisma.subscription.create({
          data: {
            userId,
            stripeSubId: session.subscription as string,
            plan,
            status: 'active',
          },
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await prisma.subscription.updateMany({
        where: { stripeSubId: subscription.id },
        data: { status: 'cancelled' },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
