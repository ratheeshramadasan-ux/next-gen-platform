"use client";

import React, { useState } from "react";
import { 
  ChevronDown, ChevronRight, ChevronLeft, FolderTree, FileText,
  Plus, Trash2, Folder, FolderPlus, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableDesigner } from "./TableDesigner";

export interface CategoryItem {
  id: string;
  name: string;
  parentId: string | null;
}

export interface FieldItem {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  confidence?: number;
  categoryId?: string | null;
  value?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  regex?: string;
  dateFormat?: string;
  numberFormat?: string;
  locatorStrategy?: "anchor" | "coordinate" | "hybrid";
  pageStrategy?: "current" | "detect_by_text" | "any_page";
  searchDirection?: "right" | "below" | "same_line" | "nearest";
  expansionMode?: "box" | "line" | "multiline" | "until_next_label";
  stopAtNextLabel?: boolean;
  allowLongText?: boolean;
}

export interface AnchorItem {
  id: string;
  value: string;
}

interface FieldHierarchyProps {
  categories: CategoryItem[];
  fields: FieldItem[];
  selectedFieldId: string | null;
  selectedCategoryId: string | null;
  onSelectField: (id: string | null) => void;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (parentId?: string | null) => void;
  onAddField: (categoryId?: string | null) => void;
  onDeleteField: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateField?: (id: string, updates: Partial<FieldItem>) => void;
  boundAnchors?: AnchorItem[];
  allAnchors?: AnchorItem[];
  onBindAnchor?: (anchorId: string) => void;
  onUnbindAnchor?: (anchorId: string) => void;
  onCollapse?: () => void;
}

export function FieldHierarchy({
  categories,
  fields,
  selectedFieldId,
  selectedCategoryId,
  onSelectField,
  onSelectCategory,
  onAddCategory,
  onAddField,
  onDeleteField,
  onDeleteCategory,
  onUpdateField,
  boundAnchors = [],
  allAnchors = [],
  onBindAnchor,
  onUnbindAnchor,
  onCollapse
}: FieldHierarchyProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (node: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [node]: prev[node] === false ? true : false }));
  };

  const renderFieldRow = (field: FieldItem) => {
    const isSelected = selectedFieldId === field.id;
    return (
      <div
        key={field.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectField(field.id);
        }}
        className={cn(
          "flex rounded-xl cursor-pointer transition-all group my-1",
          isSelected 
            ? "flex-col items-stretch bg-red-50 border border-red-200/60 shadow-sm" 
            : "items-center justify-between border-transparent hover:bg-muted/40 min-h-[38px]"
        )}
      >
        {/* Field Row Header */}
        <div className={cn("flex items-center justify-between w-full min-w-0", isSelected ? "p-3 pb-2" : "p-2")}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected || field.required ? "bg-red-500" : "bg-muted-foreground/30")} />
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={cn("text-[11px] font-bold truncate", isSelected ? "text-foreground" : "text-muted-foreground")} title={field.name}>{field.name}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {isSelected ? (
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Selected Area</span>
                <span className="text-[10px] font-bold px-1">{Math.round((field.confidence || 1.0) * 100)}%</span>
              </div>
            ) : (
              <>
                <span className="text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
                  {field.type}
                </span>
                {field.confidence !== undefined && (
                  <span className="text-[10px] font-bold text-muted-foreground px-1">
                    {Math.round(field.confidence * 100)}%
                  </span>
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(field.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all ml-1"
                  title="Delete Field"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Properties Expansion */}
        {isSelected && (() => {
          return (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="px-3 pb-3 space-y-2.5 cursor-default"
            >
              <div className="h-px w-full bg-red-200/40 mb-2" />
              
              {/* Grid properties layout */}
              <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Field Type</span>
                <select 
                  value={field.type}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    onUpdateField?.(field.id, {
                      type: nextType,
                      ...(nextType === "date" && !field.dateFormat ? { dateFormat: "DD/MM/YYYY" } : {})
                    });
                  }}
                  className="w-full bg-white border border-border/60 rounded p-1 text-[10px] font-bold uppercase outline-none focus:border-red-400 transition-colors cursor-pointer text-foreground shadow-sm"
                >
                  <option value="text">TEXT</option>
                  <option value="id">ID / NUMBER</option>
                  <option value="number">NUMBER</option>
                  <option value="date">DATE</option>
                  <option value="multiline">MULTILINE</option>
                  <option value="table">TABLE</option>
                  <option value="checkbox">CHECKBOX</option>
                  <option value="radio">RADIO</option>
                  <option value="signature">SIGNATURE</option>
                  <option value="image">IMAGE</option>
                </select>
              </div>

              {field.type === "date" && (
                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Date Format</span>
                  <select
                    value={field.dateFormat || "DD/MM/YYYY"}
                    onChange={(e) => onUpdateField?.(field.id, { dateFormat: e.target.value })}
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-bold outline-none focus:border-red-400 transition-colors cursor-pointer text-foreground shadow-sm"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                    <option value="DD MMM YYYY">DD MMM YYYY</option>
                    <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                  </select>
                </div>
              )}

              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">How To Find This Field</span>
                  <span className="rounded bg-white px-1.5 py-0.5 text-[8px] font-black text-blue-600">
                    Smart
                  </span>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Locator</span>
                  <select
                    value={field.locatorStrategy || "hybrid"}
                    onChange={(e) => onUpdateField?.(field.id, { locatorStrategy: e.target.value as FieldItem["locatorStrategy"] })}
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-bold outline-none cursor-pointer text-foreground shadow-sm"
                  >
                    <option value="hybrid">Anchor + Position</option>
                    <option value="anchor">Anchor Only</option>
                    <option value="coordinate">Current Position Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Page</span>
                  <select
                    value={field.pageStrategy || "detect_by_text"}
                    onChange={(e) => onUpdateField?.(field.id, { pageStrategy: e.target.value as FieldItem["pageStrategy"] })}
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-bold outline-none cursor-pointer text-foreground shadow-sm"
                  >
                    <option value="detect_by_text">Find page by anchors</option>
                    <option value="any_page">Search all pages</option>
                    <option value="current">Current page only</option>
                  </select>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Search</span>
                  <select
                    value={field.searchDirection || "nearest"}
                    onChange={(e) => onUpdateField?.(field.id, { searchDirection: e.target.value as FieldItem["searchDirection"] })}
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-bold outline-none cursor-pointer text-foreground shadow-sm"
                  >
                    <option value="nearest">Nearest value</option>
                    <option value="right">Right of anchor</option>
                    <option value="below">Below anchor</option>
                    <option value="same_line">Same line</option>
                  </select>
                </div>

                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Value Size</span>
                  <select
                    value={field.expansionMode || "line"}
                    onChange={(e) => onUpdateField?.(field.id, { expansionMode: e.target.value as FieldItem["expansionMode"] })}
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-bold outline-none cursor-pointer text-foreground shadow-sm"
                  >
                    <option value="line">Grow along line</option>
                    <option value="until_next_label">Grow until next label</option>
                    <option value="multiline">Multi-line value</option>
                    <option value="box">Use selected box only</option>
                  </select>
                </div>

                <label className="flex items-center justify-between gap-3 rounded border border-border/40 bg-white px-2 py-1.5 text-[9px] font-bold text-foreground">
                  <span>Stop at next label</span>
                  <input
                    type="checkbox"
                    checked={field.stopAtNextLabel ?? true}
                    onChange={(e) => onUpdateField?.(field.id, { stopAtNextLabel: e.target.checked })}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded border border-border/40 bg-white px-2 py-1.5 text-[9px] font-bold text-foreground">
                  <span>Allow longer text than selected box</span>
                  <input
                    type="checkbox"
                    checked={field.allowLongText ?? true}
                    onChange={(e) => onUpdateField?.(field.id, { allowLongText: e.target.checked })}
                    className="h-3.5 w-3.5 accent-blue-600"
                  />
                </label>
              </div>

              {/* Table Configuration */}
              {field.type === "table" && (
                <div className="mt-2 col-span-2 bg-white rounded-lg p-2 border border-border/50">
                  <TableDesigner tableName={field.name} />
                </div>
              )}

              {/* Regex Input */}
              {field.type !== "table" && (
                <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Regex Validation</span>
                  <input
                    type="text"
                    value={field.regex || ""}
                    onChange={(e) => onUpdateField?.(field.id, { regex: e.target.value })}
                    placeholder="e.g. ^[A-Z0-9]{8,12}$"
                    className="w-full bg-white border border-border/60 rounded p-1.5 text-[10px] font-mono outline-none text-foreground focus:border-red-400 transition-colors shadow-sm"
                  />
                </div>
              )}

              {/* Bound Position Anchors */}
              {field.type !== "table" && (
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Bound Anchors</span>
                    <span className="text-[10px] text-red-500 font-bold">{boundAnchors ? boundAnchors.length : 0}</span>
                  </div>
                  
                  {boundAnchors && boundAnchors.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1 border-l-2 border-red-200 ml-1 pl-3 relative">
                      {boundAnchors.map((anchor, idx) => {
                        let tag = "Secondary";
                        let color = "text-emerald-500";
                        if (idx === 0) { tag = "Primary"; color = "text-blue-500"; }
                        else if (idx === boundAnchors.length - 1) { tag = "Fallback"; color = "text-amber-500"; }
                        
                        return (
                          <div key={anchor.id} className="flex items-center justify-between group/anchor relative">
                            {/* Line connecting to the side border */}
                            <div className="absolute -left-[14px] w-3 border-t-2 border-red-200 top-1/2" />
                            
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded shadow-sm border border-border/40 min-w-[100px]">
                              <span className="text-[10px] font-bold text-blue-400">T</span>
                              <span className="text-[10px] font-bold text-foreground truncate max-w-[80px]">{anchor.value}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={cn("text-[9px] font-bold uppercase tracking-wide", color)}>{tag} 96%</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnbindAnchor?.(anchor.id);
                                }}
                                className="opacity-0 group-hover/anchor:opacity-100 hover:text-red-500 text-muted-foreground transition-opacity"
                                title="Unlink Anchor"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-center mt-3">
                    {allAnchors && boundAnchors && allAnchors.length > boundAnchors.length ? (
                      <select 
                        onChange={(e) => {
                          if (e.target.value && onBindAnchor) {
                            onBindAnchor(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer text-red-500 hover:text-red-600 transition-colors text-center appearance-none"
                        defaultValue=""
                      >
                        <option value="" disabled>+ ADD ANCHOR</option>
                        {allAnchors.filter(a => !boundAnchors.some(ba => ba.id === a.id)).map(a => (
                          <option key={a.id} value={a.id}>{a.value}</option>
                        ))}
                      </select>
                    ) : (
                      <button className="text-[9px] font-black uppercase text-red-500 hover:text-red-600 transition-colors">
                        + ADD ANCHOR
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderCategoryNode = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return null;

    const childCategories = categories.filter(c => c.parentId === categoryId);
    const childFields = fields.filter(f => f.categoryId === categoryId);
    const hasChildren = childCategories.length > 0 || childFields.length > 0;
    
    const isExpanded = expandedNodes[category.id] !== false;
    const isSelected = selectedCategoryId === category.id;

    return (
      <div key={category.id} className="space-y-1 mt-1">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onSelectCategory(category.id);
          }}
          className={cn(
            "flex items-center justify-between py-2 px-1 rounded-md cursor-pointer transition-colors group min-h-[32px]",
            isSelected 
              ? "bg-muted/40" 
              : "hover:bg-muted/20"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <button 
              onClick={(e) => toggleExpand(category.id, e)}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <span className="text-[12px] font-bold text-foreground truncate">{category.name}</span>
            <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full ml-1">
              {childCategories.length + childFields.length}
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddCategory(category.id);
              }}
              className="hover:text-primary text-muted-foreground w-5 h-5 rounded flex items-center justify-center transition-colors"
              title="Add Sub-Category"
            >
              <FolderPlus size={12} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddField(category.id);
              }}
              className="hover:text-primary text-muted-foreground w-5 h-5 rounded flex items-center justify-center transition-colors"
              title="Add Field"
            >
              <Plus size={13} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory(category.id);
              }}
              className="hover:text-destructive text-muted-foreground w-5 h-5 rounded flex items-center justify-center transition-colors ml-1"
              title="Delete Category"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="pl-6 ml-1 space-y-0.5 pb-2">
            {childCategories.map(c => renderCategoryNode(c.id))}
            {childFields.map(f => renderFieldRow(f))}
          </div>
        )}
      </div>
    );
  };

  const rootCategories = categories.filter(c => !c.parentId);
  const rootFields = fields.filter(f => !f.categoryId);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-border/60 shadow-md overflow-hidden select-none">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/40 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          {onCollapse && (
            <button 
              onClick={(e) => { e.stopPropagation(); onCollapse(); }}
              className="hover:text-foreground text-muted-foreground transition-colors flex items-center justify-center shrink-0"
              title="Collapse Panel"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-[11px] font-bold text-foreground">Document Schema</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddCategory(selectedCategoryId || null);
            }}
            className="h-6 px-2 rounded-md bg-muted/50 hover:bg-muted text-foreground text-[9px] font-bold uppercase flex items-center gap-1.5 transition-all"
          >
            <FolderTree size={11} />
            CATEGORY
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddField(selectedCategoryId || null);
            }}
            className="h-6 px-2.5 rounded-md bg-[#ff4d4f] hover:bg-[#ff4d4f]/90 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm"
          >
            + FIELD
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-3 custom-scrollbar" onClick={() => { onSelectCategory(null); onSelectField(null); }}>
        <div className="space-y-1 pb-4">
          <div className="flex items-center gap-2 py-2 px-1 text-muted-foreground">
            <FileText size={14} className="text-foreground shrink-0" />
            <span className="text-[12px] font-bold text-foreground">Root Schema</span>
          </div>
          
          <div className="pl-4 border-l border-border/30 ml-2 space-y-1">
            {rootCategories.map(c => renderCategoryNode(c.id))}
            {rootFields.map(f => renderFieldRow(f))}
          </div>

          {rootCategories.length === 0 && rootFields.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FolderTree size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No Fields Created</p>
              <p className="text-[9px] text-muted-foreground/60 mt-1 max-w-[160px] leading-relaxed">Add a category or field to construct your document spatial mapping.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
