import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  usePageTitle("Privacy Policy");

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-privacy">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-privacy-title">
              Privacy Policy
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8 prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground mb-6">
                Last updated: February 6, 2026
              </p>

              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                Legal Tech Careers ("we," "our," or "the Platform") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our Platform.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">1. Information We Collect</h2>

              <h3 className="text-base font-medium mt-4 mb-2">1.1 Account Information</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you create an account, we collect your email address, name, and password (stored in encrypted form). If you sign in with Google, we receive your Google profile information including name, email, and profile picture.
              </p>

              <h3 className="text-base font-medium mt-4 mb-2">1.2 Resume Data</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you upload a resume, we store the file content and extract structured information such as work experience, education, skills, and contact details. This data is used solely to provide job matching, resume analysis, and career guidance features. You can delete your resume data at any time through the Platform.
              </p>

              <h3 className="text-base font-medium mt-4 mb-2">1.3 Usage Data and Activity Tracking</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We collect information about how you interact with the Platform, including: pages visited, search queries entered, jobs viewed, jobs saved, apply button clicks, filter selections, and feature usage patterns. This data is associated with your user account and is used to personalize your experience, improve our services, and generate aggregate analytics. We track session identifiers to understand navigation patterns within individual visits.
              </p>

              <h3 className="text-base font-medium mt-4 mb-2">1.4 User Behavioral Profiles</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Based on your activity, we build a behavioral profile ("persona") that includes your preferred job categories, skills of interest, location preferences, remote work interest, seniority level, career stage, and engagement patterns. This profile is used to personalize AI recommendations and improve the relevance of search results and suggestions.
              </p>

              <h3 className="text-base font-medium mt-4 mb-2">1.5 Payment Information</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Payment processing is handled entirely by Stripe. We do not store credit card numbers, bank account details, or other sensitive payment information on our servers. We store only your Stripe customer ID and subscription status to manage your account.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use your information to: (a) provide and improve the Platform's features, including AI-powered search, job matching, resume analysis, and career guidance; (b) personalize your experience based on your preferences and activity; (c) process subscriptions and payments; (d) send job alerts and notifications you have opted into; (e) generate aggregate analytics to improve our service; (f) detect and prevent fraud or abuse; and (g) communicate important updates about the Platform.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">3. AI Data Processing</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Certain Platform features use OpenAI's API to process your data, including resume analysis, job matching, career guidance, and the conversational assistant. When using these features, relevant portions of your data (such as resume content, search queries, or job descriptions) are sent to OpenAI for processing. OpenAI processes this data according to their API data usage policy, which states that API data is not used to train their models. We minimize the amount of personal data sent to AI services and only include information necessary for the specific feature being used.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">4. Cookies and Session Management</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We use session cookies to maintain your authenticated state across page visits. These cookies are essential for the Platform to function and cannot be disabled. Session cookies are HTTP-only and are automatically deleted when your session expires (after 7 days of inactivity). We do not use third-party tracking cookies or advertising cookies. We use browser session storage to manage UI preferences such as dismissed notifications, which is cleared when you close your browser.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">5. Data Storage and Security</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your data is stored in a PostgreSQL database hosted on secure infrastructure. Passwords are hashed using bcrypt with a cost factor of 12. Session data is stored server-side in the database, not in client-side storage. We implement standard security measures including HTTPS encryption in transit, parameterized database queries to prevent injection attacks, and input validation on all endpoints. Access to user data is restricted to authorized personnel only.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">6. Third-Party Services</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We integrate with the following third-party services:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground mt-2">
                <li><strong>Stripe</strong> - Payment processing for Pro subscriptions. Stripe's privacy policy governs their handling of payment data.</li>
                <li><strong>OpenAI</strong> - AI processing for search, matching, resume analysis, and career guidance features. Data sent to OpenAI is processed under their API terms.</li>
                <li><strong>Google</strong> - Optional authentication via Google OAuth 2.0. Google's privacy policy governs their handling of authentication data.</li>
              </ul>

              <h2 className="text-lg font-semibold mt-6 mb-3">7. Data Sharing</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We do not sell, rent, or trade your personal information to third parties. We do not share your data with employers or job posters. Your resume and profile data are visible only to you. We may share aggregate, anonymized analytics data that cannot identify individual users. We may disclose your information if required by law, court order, or governmental authority.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">8. Data Retention</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We retain your account data for as long as your account is active. Activity data and behavioral profiles are retained to provide personalized services. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law. Aggregate, anonymized data may be retained indefinitely for analytical purposes.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">9. Your Rights</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You have the right to: (a) access the personal data we hold about you; (b) correct inaccurate personal data; (c) delete your account and associated data; (d) export your data in a portable format; (e) withdraw consent for data processing where applicable; and (f) opt out of non-essential communications. You can exercise most of these rights directly through the Platform. For additional requests, please contact us.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">10. Children's Privacy</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child, we will promptly delete it.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">11. Changes to This Policy</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may update this Privacy Policy from time to time. Material changes will be communicated through the Platform or via email. We encourage you to review this policy periodically. Your continued use of the Platform after changes constitutes acceptance of the updated policy.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">12. Contact</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us through the Platform.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}