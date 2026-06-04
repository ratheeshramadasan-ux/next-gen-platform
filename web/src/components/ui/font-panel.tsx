import { useState } from "react";

const FONT_FAMILIES = [
  { label: "Inter", value: "Inter, sans-serif", category: "Sans-serif" },
  { label: "Geist", value: "Geist, sans-serif", category: "Sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif", category: "Sans-serif" },
  { label: "IBM Plex Sans", value: "'IBM Plex Sans', sans-serif", category: "Sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace", category: "Monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace", category: "Monospace" },
  { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace", category: "Monospace" },
];

const FONT_SIZES = [
  { label: "XS", value: 11, desc: "Compact" },
  { label: "S", value: 13, desc: "Small" },
  { label: "M", value: 14, desc: "Default" },
  { label: "L", value: 16, desc: "Large" },
  { label: "XL", value: 18, desc: "Accessible" },
];

const PREVIEW_TEXT = "The quick automation platform enables seamless workflow execution across enterprise environments.";

export default function FontPanel() {
  const [selectedFont, setSelectedFont] = useState(FONT_FAMILIES[0]);
  const [selectedSize, setSelectedSize] = useState(FONT_SIZES[2]);
  const [isOpen, setIsOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const grouped = FONT_FAMILIES.reduce((acc, f) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  return (
    <div style={{ padding: "24px", maxWidth: 480, fontFamily: "var(--font-sans)" }}>
      <h2 style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 16, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Typography Settings
      </h2>

      {/* Font Family */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
          Font family
        </label>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              fontSize: 14,
              fontFamily: selectedFont.value,
              color: "var(--color-text-primary)",
            }}
          >
            <span>{selectedFont.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.5, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isOpen && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)",
              zIndex: 50,
              overflow: "hidden",
            }}>
              {Object.entries(grouped).map(([cat, fonts]) => (
                <div key={cat}>
                  <div style={{ padding: "8px 14px 4px", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {cat}
                  </div>
                  {fonts.map(f => (
                    <button
                      key={f.value}
                      onClick={() => { setSelectedFont(f); setIsOpen(false); }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: selectedFont.value === f.value ? "var(--color-background-secondary)" : "transparent",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        fontFamily: f.value,
                        fontSize: 14,
                        color: selectedFont.value === f.value ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        textAlign: "left",
                      }}
                    >
                      <span>{f.label}</span>
                      {selectedFont.value === f.value && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Font Size */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
          Font size
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {FONT_SIZES.map(s => (
            <button
              key={s.value}
              onClick={() => setSelectedSize(s)}
              title={s.desc}
              style={{
                flex: 1,
                padding: "10px 0",
                background: selectedSize.value === s.value ? "var(--color-background-info)" : "var(--color-background-primary)",
                border: selectedSize.value === s.value ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-secondary)",
                borderRadius: "var(--border-radius-md)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ fontSize: s.value, fontWeight: 500, color: selectedSize.value === s.value ? "var(--color-text-info)" : "var(--color-text-primary)", lineHeight: 1 }}>
                {s.label}
              </span>
              <span style={{ fontSize: 10, color: selectedSize.value === s.value ? "var(--color-text-info)" : "var(--color-text-tertiary)" }}>
                {s.value}px
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div style={{
        padding: "16px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        border: "0.5px solid var(--color-border-tertiary)",
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Preview
        </div>
        <p style={{
          fontFamily: selectedFont.value,
          fontSize: selectedSize.value,
          color: "var(--color-text-primary)",
          lineHeight: 1.6,
          margin: 0,
          transition: "all 0.2s ease",
        }}>
          {PREVIEW_TEXT}
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["Heading text", "Body copy", "Labels & UI"].map((t, i) => (
            <span key={t} style={{
              fontFamily: selectedFont.value,
              fontSize: [selectedSize.value + 4, selectedSize.value, selectedSize.value - 2][i],
              fontWeight: [500, 400, 400][i],
              color: ["var(--color-text-primary)", "var(--color-text-secondary)", "var(--color-text-tertiary)"][i],
            }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Current selection summary */}
      <div style={{
        padding: "10px 14px",
        background: "var(--color-background-secondary)",
        borderRadius: "var(--border-radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        fontSize: 12,
      }}>
        <span style={{ color: "var(--color-text-secondary)" }}>
          {selectedFont.label} · {selectedSize.value}px · {selectedFont.category}
        </span>
        <button
          onClick={() => { setSelectedFont(FONT_FAMILIES[0]); setSelectedSize(FONT_SIZES[2]); }}
          style={{ fontSize: 11, color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Reset
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={handleApply}
          style={{
            flex: 1,
            padding: "10px",
            background: applied ? "var(--color-background-success)" : "var(--color-text-primary)",
            color: applied ? "var(--color-text-success)" : "var(--color-background-primary)",
            border: applied ? "0.5px solid var(--color-border-success)" : "none",
            borderRadius: "var(--border-radius-md)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {applied ? "Applied" : "Apply changes"}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: "10px 20px",
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-secondary)",
            borderRadius: "var(--border-radius-md)",
            fontSize: 13,
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
