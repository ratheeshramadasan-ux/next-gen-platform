"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppStudioRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/next-gen/studio/ui-builder");
  }, [router]);

  return null;
}
