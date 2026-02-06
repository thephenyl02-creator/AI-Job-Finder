import { useEffect } from "react";

const BASE_TITLE = "Legal Tech Careers";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} - Jobs for Legal Professionals in Technology`;
    return () => {
      document.title = `${BASE_TITLE} - Jobs for Legal Professionals in Technology`;
    };
  }, [title]);
}
