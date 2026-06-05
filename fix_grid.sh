#!/bin/bash
sed -i '' 's/className={cn(/className={cn(/g' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
sed -i '' 's/isLeftPanelCollapsed ? "grid-cols-\[40px_1fr_300px\]" : "grid-cols-\[15%_70%_15%\]"//' /Users/ratheesh/next-gen-platform/web/src/document-reader/components/ExtractionStudio.tsx
