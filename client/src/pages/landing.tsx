import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles, Search, Briefcase, TrendingUp, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Matching",
    description: "Our semantic search understands your career goals and matches you with ideal positions.",
  },
  {
    icon: Briefcase,
    title: "Legal Tech Focus",
    description: "Exclusively curated opportunities from leading legal technology companies.",
  },
  {
    icon: TrendingUp,
    title: "Career Growth",
    description: "Access roles from startups to established players transforming the legal industry.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" data-testid="logo-landing">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">
              L
            </div>
            <span className="text-lg font-semibold text-foreground hidden sm:inline">
              Legal AI Careers
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild data-testid="button-header-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/10 pointer-events-none" />
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                AI-Powered Job Search
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight font-serif">
                Find Your Next Role in{" "}
                <span className="text-primary">Legal Tech</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Discover opportunities at companies transforming the legal industry with AI. 
                Use natural language to describe your ideal role and let our AI find the perfect match.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto text-base px-8" data-testid="button-hero-get-started">
                  <a href="/api/login">
                    <Search className="mr-2 h-5 w-5" />
                    Start Searching
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" data-testid="button-hero-learn-more">
                  Learn More
                </Button>
              </div>
              
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-green-500" />
                  Free forever
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  No credit card required
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24 bg-card/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                Why Legal AI Careers?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We connect talented professionals with the most innovative legal technology companies.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="bg-background border-border hover-elevate">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to find your dream job?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who've found their next opportunity through our platform.
            </p>
            <Button size="lg" asChild className="text-base px-8" data-testid="button-cta-sign-up">
              <a href="/api/login">
                Get Started for Free
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground text-xs font-bold">
                L
              </div>
              <span className="text-sm text-muted-foreground">
                Legal AI Careers
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors" data-testid="link-contact">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
