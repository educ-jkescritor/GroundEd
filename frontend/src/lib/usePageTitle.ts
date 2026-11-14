import { useEffect } from "react";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · GroundEd` : "GroundEd: keep your syllabus current, with sources";
  }, [title]);
}
