"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMasterValues } from "@/app/actions/masterActions";

interface MasterDropdownProps {
  category: string;
  label: string;
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  multiSelect?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
}

export function MasterDropdown({ 
  category, 
  label, 
  placeholder = "Select option...", 
  value, 
  onChange,
  className,
  multiSelect = false,
  selectedValues = [],
  onMultiChange
}: MasterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      const result = await getMasterValues(category);
      if (result.success) {
        setOptions(result.values || []);
      }
      setLoading(false);
    };

    if (isOpen && options.length === 0) {
      loadOptions();
    }
  }, [isOpen, category, options.length]);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) ||
    opt.code?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (opt: any) => {
    if (multiSelect) {
      const isSelected = selectedValues.includes(opt.id);
      const newValues = isSelected 
        ? selectedValues.filter(id => id !== opt.id)
        : [...selectedValues, opt.id];
      onMultiChange?.(newValues);
    } else {
      onChange(opt.id);
      setIsOpen(false);
    }
  };

  const selectedOption = options.find(o => o.id === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-2 bg-background/20 border border-border rounded-sm text-sm hover:border-primary/50 transition-all focus:outline-none focus:ring-1 focus:ring-primary/30"
        >
          <span className={cn("truncate", !value && selectedValues.length === 0 && "text-muted-foreground")}>
            {multiSelect 
              ? (selectedValues.length > 0 ? `${selectedValues.length} Selected` : placeholder)
              : (selectedOption ? selectedOption.name : placeholder)}
          </span>
          {loading ? <Loader2 size={14} className="animate-spin text-primary" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </button>

        {isOpen && (
          <div className="absolute z-[100] mt-1 w-full bg-background/95 backdrop-blur-xl border border-border rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-muted/20 border border-border rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs rounded-sm transition-all text-left",
                      (value === opt.id || selectedValues.includes(opt.id)) ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground/80"
                    )}
                  >
                    <span>{opt.name}</span>
                    {(value === opt.id || selectedValues.includes(opt.id)) && <Check size={12} />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[10px] text-muted-foreground  font-medium uppercase tracking-widest">No results found</div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Multi-select chips */}
      {multiSelect && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
           {selectedValues.map(id => {
             const opt = options.find(o => o.id === id);
             if (!opt) return null;
             return (
               <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {opt.name}
                  <button onClick={() => handleSelect(opt)} className="hover:text-rose-500 transition-colors">×</button>
               </span>
             );
           })}
        </div>
      )}
    </div>
  );
}
