import Stripe from 'stripe';
import { getStripeSync } from './stripeClient';
import { storage } from './storage';

export async function processWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!Buffer.isBuffer(payload)) {
    throw new Error(
      'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
      'Received type: ' + typeof payload + '. ' +
      'Ensure webhook route is registered BEFORE app.use(express.json()).'
    );
  }

  const sync = await getStripeSync();
  const verifiedEvent = await sync.processWebhook(payload, signature) as Stripe.Event | undefined;

  if (!verifiedEvent) {
    return;
  }

  switch (verifiedEvent.type) {
    case 'checkout.session.completed': {
      const session = verifiedEvent.data.object as Stripe.Checkout.Session;
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
      const subscription = verifiedEvent.data.object as Stripe.Subscription;
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
      const subscription = verifiedEvent.data.object as Stripe.Subscription;
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
      break;
  }
}
