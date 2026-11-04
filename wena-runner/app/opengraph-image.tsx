import { ImageResponse } from "next/og";

export const alt = "WENA Runners — local errands, fair deals, real people";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f2f8f5", color: "#102f38", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: "#008b57", fontSize: 28, fontWeight: 700 }}>
        <div style={{ width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 16, background: "#008b57", color: "white", fontSize: 32 }}>w</div>
        WENA RUNNERS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05 }}>Your to-do list.<br />Handled.</div>
        <div style={{ color: "#35535a", fontSize: 30 }}>Local errands. Fair deals. Real people.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#006b43", fontSize: 22, fontWeight: 700 }}>Post an errand <span>→</span> agree a fair price <span>→</span> get it done</div>
    </div>,
    size,
  );
}
