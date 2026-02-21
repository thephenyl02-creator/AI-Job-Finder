import Stripe from 'stripe';
import { getStripeSync, getUncachableStripeClient, getStripeSecretKey } from './stripeClient';
import { storage } from './storage';

async function verifyAndParseEvent(payload: Buffer, signature: string): Promise<Stripe.Event | null> {
  try {
    const sync = await getStripeSync();
    const verifiedEvent = await sync.processWebhook(payload, signature) as Stripe.Event | undefined;
    return verifiedEvent || null;
  } catch (syncErr: any) {
    console.log('StripeSync unavailable for webhook verification, using direct Stripe client');
    try {
      const stripe = await getUncachableStripeClient();
      const secretKey = await getStripeSecretKey();

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret) {
        const event = stripe.webhooks.constructEvent(payload.toString(), signature, webhookSecret);
        return event;
      }

      if (process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1') {
        console.error('STRIPE WEBHOOK REJECTED: No webhook secret configured in production. Set STRIPE_WEBHOOK_SECRET.');
        return null;
      }

      const payloadObj = JSON.parse(payload.toString());
      if (payloadObj?.id && payloadObj?.type && payloadObj?.data?.object) {
        console.warn('DEV ONLY: Verifying webhook via event retrieval (not signature). Set STRIPE_WEBHOOK_SECRET for production.');
        const event = await stripe.events.retrieve(payloadObj.id);
        return event;
      }

      console.warn('Cannot verify webhook: no webhook secret and payload format unrecognized');
      return null;
    } catch (directErr: any) {
      console.error('Direct webhook verification also failed:', directErr.message);
      return null;
    }
  }
}

export async function processWebhook(payload: Buffer, signature: string): Promise<void> {
  if (!Buffer.isBuffer(payload)) {
    throw new Error(
      'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
      'Received type: ' + typeof payload + '. ' +
      'Ensure webhook route is registered BEFORE app.use(express.json()).'
    );
  }

  const verifiedEvent = await verifyAndParseEvent(payload, signature);

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
