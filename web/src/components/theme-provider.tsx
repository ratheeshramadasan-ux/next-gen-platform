"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // suppressHydrationWarning silences the React script-tag warning that
  // next-themes injects for SSR theme detection (this is intentional by the library)
  return (
    <NextThemesProvider {...props}>
      <div suppressHydrationWarning>{children}</div>
    </NextThemesProvider>
  );
}
