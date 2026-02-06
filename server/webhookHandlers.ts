import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export async function processWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!Buffer.isBuffer(payload)) {
    throw new Error(
      'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
      'Received type: ' + typeof payload + '. ' +
      'Ensure webhook route is registered BEFORE app.use(express.json()).'
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
  }

  const stripe = await getUncachableStripeClient();
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        await storage.updateUserSubscription(userId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionTier: 'pro',
          subscriptionStatus: 'active',
        });
        console.log(`Subscription activated for user ${userId}`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        const status = subscription.status === 'active' ? 'active' : subscription.status;
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: status,
          subscriptionTier: status === 'active' ? 'pro' : 'free',
        });
        console.log(`Subscription updated for user ${user.id}: ${status}`);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const user = await storage.getUserByStripeCustomerId(customerId);
      if (user) {
        await storage.updateUserSubscription(user.id, {
          subscriptionTier: 'free',
          subscriptionStatus: 'canceled',
        });
        console.log(`Subscription canceled for user ${user.id}`);
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }
}
