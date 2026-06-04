import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/app/dashboard/control-center/customer/page.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const lines = content.split('\n');

// 1. Patch Currency Block (Lines 1006-1011)
const newCurrencyBlock = `                          <div className="flex flex-col gap-1.5 focus-within:translate-x-1 transition-transform group/hook">
                             <div className="flex items-center justify-between pl-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Baseline Currency Hook</label>
                                <Link 
                                  href="/dashboard/control-center/masters?cat=CURRENCY"
                                  className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 transition-colors opacity-0 group-hover/hook:opacity-100 flex items-center gap-1 uppercase tracking-tighter"
                                >
                                  Edit Master <ExternalLink size={10} />
                                </Link>
                             </div>
                             <select value={companyData.currency || "USD"} onChange={e => setCompanyData({...companyData, currency: e.target.value})} className="px-4 py-4 bg-background border border-border rounded-sm text-sm font-bold text-emerald-600 outline-none focus:border-emerald-500">
                               {lookupCurrencies.map(c => (
                                 <option key={c.id} value={c.label}>
                                   {c.label} {c.symbol ? `(${c.symbol})` : ""}
                                 </option>
                               ))}
                             </select>
                          </div>`;

// 2. Patch Timezone Block (Lines 1012-1017)
const newTimezoneBlock = `                          <div className="flex flex-col gap-1.5 focus-within:translate-x-1 transition-transform group/hook">
                             <div className="flex items-center justify-between pl-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">System Operational Timezone</label>
                                <Link 
                                  href="/dashboard/control-center/masters?cat=TIMEZONE"
                                  className="text-[10px] font-black text-primary hover:text-primary transition-colors opacity-0 group-hover/hook:opacity-100 flex items-center gap-1 uppercase tracking-tighter"
                                >
                                  Edit Master <ExternalLink size={10} />
                                </Link>
                             </div>
                             <select value={companyData.timezone || "UTC"} onChange={e => setCompanyData({...companyData, timezone: e.target.value})} className="px-4 py-4 bg-background border border-border rounded-sm text-sm font-bold outline-none focus:border-primary">
                               {lookupTimezones.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                             </select>
                          </div>`;

// We use 0-indexing for lines array
// Line 1006 is index 1005
// Replace lines 1006 to 1017 (indices 1005 to 1016)
lines.splice(1005, 12, newCurrencyBlock, newTimezoneBlock);

fs.writeFileSync(filePath, lines.join('\n'));
console.log("Successfully patched customer/page.tsx");
