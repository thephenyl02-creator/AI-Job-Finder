import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  usePageTitle("Terms of Service");

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-terms">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-terms-title">
              Terms of Service
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8 prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground mb-6">
                Last updated: February 6, 2026
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                By accessing or using Legal Tech Careers ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform. These terms apply to all users, including visitors, registered users, and subscribers.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">2. Description of Service</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Legal Tech Careers is a job search platform designed for legal professionals seeking careers in legal technology. The Platform provides job listings, AI-powered search and matching capabilities, resume management tools, career guidance, and market insights. We offer both free and premium ("Pro") subscription tiers.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">3. User Accounts</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. We reserve the right to suspend or terminate accounts that violate these terms or that we believe to be fraudulent.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">4. Subscription Plans and Billing</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Platform offers a free tier with basic features and a Pro subscription that unlocks advanced capabilities. Pro subscriptions are available at $5 per month or $30 per year. Payments are processed through Stripe. Subscriptions automatically renew at the end of each billing period unless cancelled. You may cancel your subscription at any time through the Stripe billing portal; cancellation takes effect at the end of the current billing period. No refunds are provided for partial billing periods.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">5. Acceptable Use</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                You agree to use the Platform only for lawful purposes related to job searching and career development. You shall not: (a) scrape, crawl, or collect data from the Platform through automated means without authorization; (b) attempt to gain unauthorized access to the Platform's systems or other users' accounts; (c) upload malicious content, viruses, or harmful code; (d) use the Platform to harass, abuse, or harm others; (e) impersonate any person or entity; or (f) interfere with the Platform's operation or security.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">6. Content and Intellectual Property</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Job listings on the Platform are sourced from third-party career pages and are the property of the respective employers. The Platform's design, features, AI models, and proprietary content are owned by Legal Tech Careers. You retain ownership of content you upload, including resumes and personal information, but grant us a limited license to process and store this content to provide the Platform's services.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">7. AI-Powered Features</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Platform uses artificial intelligence for job search, resume analysis, career guidance, and other features. AI-generated content and recommendations are provided for informational purposes only and should not be considered professional legal, career, or financial advice. We do not guarantee the accuracy, completeness, or suitability of AI-generated content. You are responsible for reviewing and verifying any AI-generated suggestions before acting on them.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">8. Resume Data Processing</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you upload a resume, we process it to extract relevant information for job matching and career guidance features. Your resume data is stored securely and is not shared with third parties without your consent. Resume data may be processed by our AI service providers (such as OpenAI) solely for the purpose of providing Platform features. See our Privacy Policy for complete details on data handling.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">9. Job Listings Disclaimer</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Job listings are provided for informational purposes. We do not guarantee the accuracy, availability, or legitimacy of any job posting. We are not responsible for the hiring practices, employment terms, or conduct of any employer whose listings appear on the Platform. We do not endorse any specific employer or position. Job postings may expire or become unavailable without notice.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">10. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The Platform is provided "as is" without warranties of any kind, express or implied. We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of data, loss of employment opportunities, or reliance on AI-generated content. Our total liability for any claims arising from your use of the Platform shall not exceed the amount you paid for your subscription in the twelve months preceding the claim.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">11. Modifications to Terms</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We reserve the right to modify these Terms of Service at any time. Material changes will be communicated through the Platform or via email. Your continued use of the Platform after changes constitutes acceptance of the revised terms.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">12. Termination</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                We may suspend or terminate your access to the Platform at our discretion, including for violations of these terms. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination shall remain in effect.
              </p>

              <h2 className="text-lg font-semibold mt-6 mb-3">13. Contact</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If you have questions about these Terms of Service, please contact us through the Platform.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}