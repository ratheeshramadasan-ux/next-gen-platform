import type { CSSProperties } from "react";

export default function DownloadsPage() {
  return (
    <main
      style={{
        display: "grid",
        gap: "24px",
        minHeight: "calc(100vh - 110px)",
        padding: "24px 32px 32px"
      }}
    >
      <section
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: "28px",
          padding: "32px",
          boxShadow: "var(--shadow)",
          backdropFilter: "blur(18px)"
        }}
      >
        <p
          style={{
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--accent-strong)",
            margin: 0
          }}
        >
          Downloads
        </p>
        <h1
          style={{
            fontSize: "clamp(2.4rem, 4vw, 4.2rem)",
            lineHeight: 1.04,
            margin: "12px 0"
          }}
        >
          VM Agent downloads for Bot Runner
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: 760, fontSize: "1.05rem" }}>
          Use the top menu and open <strong>Downloads</strong> whenever you need
          the VM package. Choose the platform below to download the universal
          .NET runner starter bundle with setup instructions.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            marginTop: "28px"
          }}
        >
          <DownloadCard
            href="/api/download-vm-agent?target=windows"
            title="Windows VM Agent"
            detail="Starter package plus Windows Service installation notes for server VMs."
          />
          <DownloadCard
            href="/api/download-vm-agent?target=linux"
            title="Linux VM Agent"
            detail="Starter package plus systemd instructions for Linux virtual machines."
          />
        </div>
      </section>
    </main>
  );
}

function DownloadCard(props: {
  href: string;
  title: string;
  detail: string;
}) {
  return (
    <a href={props.href} style={cardStyle}>
      <p
        style={{
          margin: 0,
          color: "var(--accent-strong)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.82rem"
        }}
      >
        VM Package
      </p>
      <h2 style={{ margin: "10px 0 8px", fontSize: "1.5rem" }}>{props.title}</h2>
      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
        {props.detail}
      </p>
      <span
        style={{
          marginTop: "14px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "fit-content",
          padding: "10px 14px",
          borderRadius: "999px",
          background: "#1f1b18",
          color: "#fff6e9"
        }}
      >
        Download
      </span>
    </a>
  );
}

const cardStyle: CSSProperties = {
  display: "grid",
  gap: "4px",
  textDecoration: "none",
  borderRadius: "24px",
  padding: "24px",
  background: "rgba(255,255,255,0.76)",
  border: "1px solid var(--line)"
};
