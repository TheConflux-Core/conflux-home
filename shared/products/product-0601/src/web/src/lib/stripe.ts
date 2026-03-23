import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-02-15',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    priceId: process.env.STRIPE_PRICE_STARTER!,
    features: ['1 assessment per month', 'Basic SSP generation', 'Gap analysis report', 'Email support'],
  },
  pro: {
    name: 'Pro',
    price: 199,
    priceId: process.env.STRIPE_PRICE_PRO!,
    features: ['Unlimited assessments', 'Full SSP + POA&M generation', 'Remediation tracking', 'C3PAO readiness scoring', 'Priority support'],
  },
  team: {
    name: 'Team',
    price: 299,
    priceId: process.env.STRIPE_PRICE_TEAM!,
    features: ['Everything in Pro', 'Up to 10 team members', 'Shared assessment library', 'Audit collaboration tools', 'Dedicated support'],
  },
};
