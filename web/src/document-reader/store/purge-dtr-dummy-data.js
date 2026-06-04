const fs = require("fs");
const filePath = "/Users/ratheesh/next-gen-platform/web/src/document-reader/components/DocumentTypeResolution.tsx";
let content = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");

// Replace mock lines in realOcrLines
const originalOcrLinesBlock = `  const realOcrLines = useMemo(() => {
    if (!activePage?.ocrText) {
      return [
        { label: "HEADER_REGION", text: "MEDICAL CLAIM", conf: 99.2 },
        { label: "CLAIMANT_NAME", text: "RATHEESH SHARMA", conf: 97.8 },
        { label: "POLICY_NUMBER", text: "CA-99281-Z", conf: 98.5 }
      ];
    }
    const lines = activePage.ocrText.split("\\n").filter(l => l.trim().length > 4).slice(0, 3);`;

const cleanOcrLinesBlock = `  const realOcrLines = useMemo(() => {
    if (!activePage?.ocrText) {
      return [
        { label: "SYSTEM_STATUS", text: "No active document loaded", conf: 0 },
        { label: "INSTRUCTION", text: "Please upload documents to run type resolution", conf: 0 }
      ];
    }
    const lines = activePage.ocrText.split("\\n").filter(l => l.trim().length > 4).slice(0, 3);`;

content = content.replace(originalOcrLinesBlock, cleanOcrLinesBlock);

// Replace mock transparency logs fallback
const originalLogsBlock = `    return [
      { id: "88a101-ca2b-4029-99a", model: "claim-medical-ca-v4", accuracy: "96.2%", status: "Auto-processed" },
      { id: "ff2982-ab0c-4576-88d", model: "passport-global-v2", accuracy: "98.2%", status: "Auto-processed" },
      { id: "77cd10-992a-431e-b81", model: "invoice-enterprise-v4", accuracy: "82.4%", status: "Validation Escalated" },
      { id: "eec239-011d-402e-99f", model: "bank-retail-v4", accuracy: "95.6%", status: "Auto-processed" }
    ];`;

const cleanLogsBlock = `    return [];`;

content = content.replace(originalLogsBlock, cleanLogsBlock);

// Replace default ocrQuality when no page is loaded
const originalOcrQualityFallback = `return { dpi: 300, skew: 0.12, noise: "Low", textConfidence: 98.4, language: "English (CA)", region: "Canada" };`;
const cleanOcrQualityFallback = `return { dpi: 0, skew: 0, noise: "N/A", textConfidence: 0, language: "N/A", region: "N/A" };`;

content = content.replace(originalOcrQualityFallback, cleanOcrQualityFallback);

// Replace decision pane mock references to show activeDocument or empty state
content = content.replace(
  '<span className="text-xs font-black tracking-widest uppercase text-foreground">{selectedModel.category} Claim Form</span>',
  '<span className="text-xs font-black tracking-widest uppercase text-foreground">{activeDocument ? (activeDocument.classification?.className || selectedModel.category + " Form") : "No Active Document"}</span>'
);

content = content.replace(
  '<span className="text-xs font-black text-emerald-500">{simulatedConfidence}%</span>',
  '<span className={`text-xs font-black ${activeDocument ? "text-emerald-500" : "text-muted-foreground"}`}>{activeDocument ? simulatedConfidence + "%" : "0.0%"}</span>'
);

content = content.replace(
  '{selectedModel.languages[0]} ({selectedModel.regions[0]})',
  '{activePage ? (activePage.detectedLanguage || "English") : "N/A"} ({activePage ? "CA" : "N/A"})'
);

content = content.replace(
  '<span className="text-xs font-black tracking-widest text-primary uppercase">{selectedModel.id}</span>',
  '<span className="text-xs font-black tracking-widest text-primary uppercase">{activeDocument ? (activeDocument.classification?.classId || selectedModel.id) : "None"}</span>'
);

content = content.replace(
  '<span className="text-xs font-black tracking-widest text-muted-foreground uppercase">{selectedModel.id.replace("-v4", "-global-v2").replace("-v3", "-global-v2").replace("-v5", "-global-v2")}</span>',
  '<span className="text-xs font-black tracking-widest text-muted-foreground uppercase">{activeDocument ? (activeDocument.classification?.classId || selectedModel.id).replace("-v4", "-global-v2").replace("-v3", "-global-v2") : "None"}</span>'
);

content = content.replace(
  `<p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/50">
                      Header and anchor match patterns resolved this payload to a <strong className="text-foreground">{selectedModel.name}</strong> entity. High OCR text similarity of {ocrQuality.textConfidence}% matches regional {selectedModel.regions[0]} classification structures.
                    </p>`,
  `<p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/50">
                      {activeDocument ? (
                        \`Header and anchor match patterns resolved this payload to a \${activeDocument.classification?.className || selectedModel.name} entity. High OCR text similarity of \${ocrQuality.textConfidence}% matches regional classification structures.\`
                      ) : (
                        "Please upload a document in the Intake phase to execute OCR analysis and resolve its structural document type."
                      )}
                    </p>`
);

// Check if logs are empty and show message
content = content.replace(
  `{logs.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-4 p-4 border-b border-border/40 hover:bg-muted/10 transition-colors">
                    <span className="font-bold text-foreground truncate">{row.id}</span>
                    <span className="text-primary truncate">{row.model}</span>
                    <span className="text-emerald-500 font-bold">{row.accuracy}</span>
                    <span className={row.status.includes("Escalated") ? "text-amber-500" : "text-emerald-500"}>{row.status}</span>
                  </div>
                ))}`,
  `{logs.length === 0 ? (
                  <div className="p-8 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    No resolution sessions recorded in transparency log
                  </div>
                ) : (
                  logs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-4 p-4 border-b border-border/40 hover:bg-muted/10 transition-colors">
                      <span className="font-bold text-foreground truncate">{row.id}</span>
                      <span className="text-primary truncate">{row.model}</span>
                      <span className="text-emerald-500 font-bold">{row.accuracy}</span>
                      <span className={row.status.includes("Escalated") ? "text-amber-500" : "text-emerald-500"}>{row.status}</span>
                    </div>
                  ))
                )}`
);

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully purged all hardcoded fallback dummy data from DTR screen!");
