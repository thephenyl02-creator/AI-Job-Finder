import Stripe from 'stripe';

async function seedProducts() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY environment variable is required');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as any,
  });

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
    unit_amount: 500,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'monthly' },
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $5/mo');

  const yearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 3000,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { plan: 'yearly' },
  });
  console.log('Created yearly price:', yearlyPrice.id, '- $30/yr (save $30)');

  console.log('\nDone! Products and prices created in Stripe.');
}

seedProducts().catch(console.error);
