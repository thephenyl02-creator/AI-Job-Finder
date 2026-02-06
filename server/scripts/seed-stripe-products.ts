import { getUncachableStripeClient } from '../stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ query: "name:'Legal Tech Careers Pro'" });
  if (existingProducts.data.length > 0) {
    console.log('Pro product already exists, skipping seed.');
    console.log('Product ID:', existingProducts.data[0].id);
    const prices = await stripe.prices.list({ product: existingProducts.data[0].id, active: true });
    prices.data.forEach(p => {
      console.log(`Price: ${p.id} - $${(p.unit_amount || 0) / 100}/${p.recurring?.interval}`);
    });
    return;
  }

  console.log('Creating Pro subscription product...');
  const proProduct = await stripe.products.create({
    name: 'Legal Tech Careers Pro',
    description: 'Unlimited access to resume matching, career advisor, advanced analytics, job alerts, and all premium features.',
    metadata: {
      tier: 'pro',
      features: 'resume_matching,career_advisor,advanced_analytics,job_alerts,unlimited_views',
    },
  });
  console.log('Created product:', proProduct.id);

  const monthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $29/mo');

  const yearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 23900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'yearly' },
  });
  console.log('Created yearly price:', yearlyPrice.id, '- $239/yr (save ~$100)');

  console.log('\nDone! Products and prices created in Stripe.');
}

seedProducts().catch(console.error);
