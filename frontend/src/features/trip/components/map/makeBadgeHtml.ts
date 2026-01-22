export function makeBadgeHtml(text: string, tone: "start" | "end" | "num") {
  const bg =
    tone === "start"
      ? "linear-gradient(135deg,#059669,#10b981)"
      : tone === "end"
      ? "linear-gradient(135deg,#e11d48,#fb7185)"
      : "linear-gradient(135deg,#111827,#0b1220)";

  const size = tone === "num" ? 36 : 44;
  const fontSize = tone === "num" ? 13 : 11;
  const border = tone === "num" ? 2 : 3;
  const padding = tone === "num" ? 0 : 6;

  return `
    <div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${bg};
      color:white;font-weight:900;font-size:${fontSize}px;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 14px 28px rgba(0,0,0,.25);
      border:${border}px solid rgba(255,255,255,.95);
      transform: translateY(-4px);
      text-align:center;
      padding:${padding}px;
      line-height:1.05;
      letter-spacing:-.2px;
    ">${text}</div>
  `;
}
