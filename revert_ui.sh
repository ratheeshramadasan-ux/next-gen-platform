#!/bin/bash
sed -i '' 's/bg-\[#09090b\] border border-zinc-800\/80/bg-card\/60 border border-border\/50/' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
sed -i '' 's/border border-zinc-800 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300/border border-border hover:bg-muted text-muted-foreground hover:text-foreground/' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
sed -i '' 's/text-zinc-600/text-muted-foreground\/60/' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
sed -i '' 's/grid-cols-\[280px_1fr_300px\]/grid-cols-\[240px_1fr_240px\]/' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
