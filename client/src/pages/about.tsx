import { Header } from "@/components/header";
import { usePageTitle } from "@/hooks/use-page-title";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Target, Lightbulb, Shield } from "lucide-react";
import { Logo } from "@/components/logo";

export default function About() {
  usePageTitle("About");
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-foreground mb-4 tracking-tight" data-testid="text-about-title">
            Why Legal Tech Careers Exists
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The legal industry is changing faster than the job boards that serve it.
            Firms are building innovation teams. Startups are hiring lawyers who can bridge
            the gap between code and courtrooms. But if you're a legal professional looking
            for those opportunities, you're stuck searching in the wrong places.
          </p>
        </div>

        <div className="space-y-6 mb-12">
          <div className="prose prose-sm text-muted-foreground space-y-4">
            <p>
              General job boards don't understand legal tech as a category. You search
              "legal technology" and get buried in software engineer listings that require
              a CS degree. Legal job boards are built for traditional practice, so you
              find partnership tracks at BigLaw but nothing at the companies actually
              building legal software.
            </p>
            <p>
              Legal Tech Careers was built to close that gap. We aggregate real job
              listings from legal technology companies, law firms with innovation teams,
              courts and government agencies modernizing their systems, and legal aid
              organizations using technology to expand access to justice.
            </p>
            <p>
              Every listing is categorized into a clear taxonomy so you can find
              roles by what matters to you: whether that's compliance technology,
              contract management, e-discovery, legal AI, or access to justice.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            {
              icon: Target,
              title: "Focused",
              description: "Only legal tech roles. Every job listing is relevant to legal professionals exploring technology careers.",
            },
            {
              icon: Lightbulb,
              title: "Practical",
              description: "Resume matching, fit scores, and specific tweaks so you know exactly how to position your legal background.",
            },
            {
              icon: Shield,
              title: "Honest",
              description: "Real listings from real companies. No scraped duplicates, no ghost jobs, no pay-to-rank.",
            },
          ].map((item) => (
            <Card key={item.title} className="bg-background border-border/60">
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-foreground mb-3">
                  <item.icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-sm" data-testid={`text-about-${item.title.toLowerCase()}`}>
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/30 border-border/60">
          <CardContent className="p-6 sm:p-8 text-center">
            <h2 className="text-xl font-serif font-medium text-foreground mb-2">
              Ready to explore?
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Browse every listing for free. Upgrade when the tools are worth it to you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="text-base" data-testid="button-about-browse">
                <a href="/auth">
                  Browse Jobs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-base" data-testid="button-about-pricing">
                  See Pricing
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border/40 py-8 mt-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Legal Tech Careers
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Where legal professionals find their next move in technology.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
