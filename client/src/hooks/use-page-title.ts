import { useEffect } from "react";

const BASE_TITLE = "Legal Tech Careers";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} — Career Intelligence for Legal Professionals`;
    return () => {
      document.title = `${BASE_TITLE} — Career Intelligence for Legal Professionals`;
    };
  }, [title]);
}
