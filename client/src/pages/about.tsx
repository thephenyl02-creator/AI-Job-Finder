import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search, FileText, Briefcase, Users, Target, ArrowRight, Scale } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-serif font-medium text-foreground mb-4">
            About Legal Tech Careers
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The job search platform built for legal professionals exploring technology careers.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Target className="h-5 w-5 text-muted-foreground" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <p>
                Legal Tech Careers connects legal professionals with opportunities in the growing
                legal technology industry. Whether you're a practicing attorney looking to
                transition into legal tech, a paralegal seeking roles at innovative companies,
                or a law school graduate exploring non-traditional paths, we help
                you find your next opportunity.
              </p>
              <p>
                We aggregate real job listings from leading legal tech companies, law firms
                with innovation teams, and legal aid organizations embracing technology.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Users className="h-5 w-5 text-muted-foreground" />
                Who We Serve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Legal Professionals</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Attorneys seeking tech-focused roles</li>
                    <li>Paralegals at legal tech companies</li>
                    <li>Legal operations specialists</li>
                    <li>Compliance and regulatory experts</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">Tech Professionals</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Engineers building legal software</li>
                    <li>Product managers in legal tech</li>
                    <li>Data scientists and researchers</li>
                    <li>UX designers for legal products</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Search className="h-5 w-5 text-muted-foreground" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center mx-auto mb-3">
                    <Search className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Guided Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Describe your ideal role in plain language. We match you with the most relevant positions.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Resume Matching</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your resume and we'll find jobs that match your experience and skills.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center mx-auto mb-3">
                    <Briefcase className="h-6 w-6 text-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-1">Real Listings</h3>
                  <p className="text-sm text-muted-foreground">
                    All jobs come from actual company career pages. Apply directly to employers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                Our Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                We pull job listings from verified sources including:
              </p>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Legal Tech Companies</h4>
                  <ul className="space-y-1">
                    <li>Everlaw</li>
                    <li>NetDocuments</li>
                    <li>Rocket Lawyer</li>
                    <li>Mitratech</li>
                    <li>Brightflag</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Law Firms</h4>
                  <ul className="space-y-1">
                    <li>Gibson Dunn</li>
                    <li>Axiom</li>
                    <li>Factor</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Legal Aid</h4>
                  <ul className="space-y-1">
                    <li>Legal Services NYC</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/">
            <Button size="lg" className="gap-2" data-testid="button-start-search">
              <Search className="h-4 w-4" />
              Start Your Search
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Legal Tech Careers
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting legal professionals with technology careers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
