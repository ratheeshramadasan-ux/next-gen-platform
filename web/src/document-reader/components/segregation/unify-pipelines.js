const fs = require("fs");
const { execSync } = require("child_process");

const filePath = "/Users/ratheesh/next-gen-platform/web/src/document-reader/components/segregation/PageSegregation.tsx";
let content = fs.readFileSync(filePath, "utf8");

// Let's locate the redundant Global Segregation Matrix div which starts around line 1142
// In the original file, it was:
//              <div className="space-y-4 bg-muted/10 p-5 rounded-2xl border border-border/40">
//                 <div className="flex items-center justify-between px-1">
//                    <span className="text-[9px] font-black text-muted-foreground ...
// We can locate it precisely by looking for "Global Segregation Matrix" and deleting its outer wrapper!
const lines = content.split(/\r?\n/);
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("Global Segregation Matrix")) {
    // Find the enclosing div start (usually a few lines above)
    for (let j = i; j >= i - 5; j--) {
      if (lines[j].includes("space-y-4 bg-muted/10")) {
        startIndex = j;
        break;
      }
    }
    break;
  }
}

if (startIndex !== -1) {
  // Let's find the closing tag of this div block by tracing curly braces and divs
  let openDivs = 0;
  for (let k = startIndex; k < lines.length; k++) {
    if (lines[k].includes("<div")) {
      const match = lines[k].match(/<div/g);
      openDivs += match.length;
    }
    if (lines[k].includes("</div>")) {
      const match = lines[k].match(/<\/div>/g);
      openDivs -= match.length;
    }
    if (openDivs <= 0) {
      endIndex = k;
      break;
    }
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  console.log(`Found matrix card at index range ${startIndex}-${endIndex}`);
  // Let's delete this matrix card block!
  lines.splice(startIndex, endIndex - startIndex + 1);
  content = lines.join("\n");
  console.log("Successfully removed redundant Global Segregation Matrix card!");
} else {
  console.log("Could not locate matrix card automatically, using fallback replacements...");
}

// Let's update the toggles in Boundary Director to directly map to the state of global settings as well!
// 1. Header toggle should update both group.headerEnabled AND segregationSettings.boundary.useStructuralBoundary
content = content.replace(
  `onClick={() => updateLogicGroup(group.id, { headerEnabled: !group.headerEnabled })}`,
  `onClick={() => {
                                       const newVal = !group.headerEnabled;
                                       updateLogicGroup(group.id, { headerEnabled: newVal });
                                       handleUpdateLayerProps("boundary", { useStructuralBoundary: newVal });
                                    }}`
);

// 2. Footer toggle should update both group.footerEnabled AND segregationSettings.boundary.useStructuralBoundary
content = content.replace(
  `onClick={() => updateLogicGroup(group.id, { footerEnabled: !group.footerEnabled })}`,
  `onClick={() => {
                                       const newVal = !group.footerEnabled;
                                       updateLogicGroup(group.id, { footerEnabled: newVal });
                                       handleUpdateLayerProps("boundary", { useStructuralBoundary: newVal });
                                    }}`
);

// 3. Keyword/OCR toggle should update both group.keywordEnabled AND segregationSettings.keyword.enabled
content = content.replace(
  `onClick={() => updateLogicGroup(group.id, { keywordEnabled: !group.keywordEnabled })}`,
  `onClick={() => {
                                       const newVal = !group.keywordEnabled;
                                       updateLogicGroup(group.id, { keywordEnabled: newVal });
                                       handleUpdateLayerProps("keyword", { enabled: newVal });
                                    }}`
);

// 4. Fixed Document Length toggle should update both group.pageCountEnabled AND segregationSettings.pageCount.enabled
content = content.replace(
  `onClick={() => updateLogicGroup(group.id, { pageCountEnabled: !group.pageCountEnabled })}`,
  `onClick={() => {
                                       const newVal = !group.pageCountEnabled;
                                       updateLogicGroup(group.id, { pageCountEnabled: newVal });
                                       handleUpdateLayerProps("pageCount", { enabled: newVal });
                                    }}`
);

// Let's add the gorgeous "Auxiliary Automation Pipelines" card right before "FALLBACK ACTIONS"!
const auxiliaryCardCode = `                              {/* AUXILIARY AUTOMATION PIPELINES */}
                              <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-sm space-y-4">
                                 <span className="text-xs font-black text-muted-foreground uppercase tracking-wider block">
                                    AUXILIARY PIPELINE LAYERS
                                 </span>
                                 <div className="space-y-3">
                                    {/* 1. Barcode Separators */}
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                                       <div>
                                          <span className="text-xs font-bold text-foreground block">Barcode Separator Detection</span>
                                          <span className="text-[10px] text-muted-foreground block mt-0.5">Force splits on physical separator sheets</span>
                                       </div>
                                       <button 
                                         onClick={() => handleUpdateLayerProps("separator", { enabled: !segregationSettings.separator.enabled })}
                                         className={cn("w-8 h-4 rounded-full relative transition-all shadow-inner", segregationSettings.separator.enabled ? "bg-primary" : "bg-muted")}
                                       >
                                          <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", segregationSettings.separator.enabled ? "right-0.5" : "left-0.5")} />
                                       </button>
                                    </div>

                                    {/* 2. Continuity Merging */}
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                                       <div>
                                          <span className="text-xs font-bold text-foreground block">Continuity Merging</span>
                                          <span className="text-[10px] text-muted-foreground block mt-0.5">Merge adjacent matching child sheets</span>
                                       </div>
                                       <button 
                                         onClick={() => handleUpdateLayerProps("continuity", { enabled: !segregationSettings.continuity.enabled })}
                                         className={cn("w-8 h-4 rounded-full relative transition-all shadow-inner", segregationSettings.continuity.enabled ? "bg-primary" : "bg-muted")}
                                       >
                                          <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", segregationSettings.continuity.enabled ? "right-0.5" : "left-0.5")} />
                                       </button>
                                    </div>

                                    {/* 3. Blank Page Removal */}
                                    <div className="flex items-center justify-between p-2 rounded-xl bg-muted/20 border border-border/40">
                                       <div>
                                          <span className="text-xs font-bold text-foreground block">Blank Page Removal</span>
                                          <span className="text-[10px] text-muted-foreground block mt-0.5">Purges empty scanner noise pages</span>
                                       </div>
                                       <button 
                                         onClick={() => handleUpdateLayerProps("blank", { enabled: !segregationSettings.blank.enabled })}
                                         className={cn("w-8 h-4 rounded-full relative transition-all shadow-inner", segregationSettings.blank.enabled ? "bg-primary" : "bg-muted")}
                                       >
                                          <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", segregationSettings.blank.enabled ? "right-0.5" : "left-0.5")} />
                                       </button>
                                    </div>
                                 </div>
                              </div>`;

// Insert the auxiliary card right above fallback actions
if (content.includes("{/* 7. FALLBACK ACTIONS */}")) {
  content = content.replace("{/* 7. FALLBACK ACTIONS */}", `${auxiliaryCardCode}\n\n                              {/* 7. FALLBACK ACTIONS */}`);
  console.log("Successfully injected Auxiliary Automation Pipelines card!");
}

fs.writeFileSync(filePath, content, "utf8");
console.log("Successfully wrote updated PageSegregation.tsx!");

try {
  execSync("npx tsc --noEmit", { cwd: "/Users/ratheesh/next-gen-platform/web", stdio: "pipe" });
  console.log("TypeScript verification PASSED!");
} catch (err) {
  console.log("TypeScript verification FAILED:");
  console.log(err.stdout.toString() + err.stderr.toString());
}
