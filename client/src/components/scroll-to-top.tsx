import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <Button
        size="icon"
        variant="outline"
        onClick={scrollToTop}
        className="shadow-md bg-background/80 backdrop-blur-sm"
        data-testid="button-scroll-to-top"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
