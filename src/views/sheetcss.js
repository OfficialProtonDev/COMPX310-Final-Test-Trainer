// Styles for the printed cheat sheet. Used both in the in-app preview and in the saved HTML file,
// so what you see is what prints. The sheet is paper: always black on white, whatever the app theme.
export const SHEET_FONTS =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Condensed:ital,wght@0,400;0,500;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+Math&display=swap';

export const PAGE = { w: 210, h: 297, pad: 5, gap: 2.2 }; // millimetres

export function sheetCss(fontPt) {
  const lh = 1.17;
  return `
.cs-page { width: ${PAGE.w}mm; height: ${PAGE.h}mm; padding: ${PAGE.pad}mm; box-sizing: border-box; background: #fff; color: #111; overflow: hidden; display: flex; gap: ${PAGE.gap}mm; align-items: flex-start; font-family: "IBM Plex Sans Condensed", "Arial Narrow", "Roboto Condensed", Arial, sans-serif; font-size: ${fontPt}pt; line-height: ${lh}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cs-col { flex: 0 0 auto; min-width: 0; }
.cs-block { margin: 0 0 1.4mm; break-inside: avoid; }
.cs-block .cs-t { display: flex; gap: 1mm; align-items: baseline; font-weight: 700; font-size: 1em; line-height: 1.15; border-bottom: 0.25mm solid #999; padding-bottom: 0.2mm; margin-bottom: 0.5mm; }
.cs-block .cs-t .cs-wk { font-weight: 600; color: #555; font-size: 0.86em; }
.cs-wkhead { font-weight: 700; font-size: 1.08em; background: #e6e6e6; color: #000; padding: 0.35mm 1mm; margin: 0 0 1mm; border-radius: 0.6mm; letter-spacing: 0.01em; }
.cs-title { font-weight: 700; font-size: 1.12em; margin: 0 0 1.2mm; padding-bottom: 0.5mm; border-bottom: 0.4mm solid #000; }
.cs-title small { display: block; font-weight: 400; font-size: 0.8em; color: #444; }
.cs-content { overflow-wrap: anywhere; }
.cs-content ul, .cs-content ol { margin: 0; padding-left: 1.05em; }
.cs-content li { margin: 0; padding: 0; }
.cs-content li::marker { color: #666; }
.cs-content p { margin: 0 0 0.4mm; }
.cs-content b, .cs-content strong { font-weight: 700; }
.cs-content .k { font-weight: 700; text-decoration: underline; text-decoration-thickness: 0.2mm; text-underline-offset: 0.3mm; }
.cs-content code { font-family: "IBM Plex Mono", Consolas, monospace; font-size: 0.9em; letter-spacing: -0.02em; }
.cs-content table.cs, .cs-content table.mini { border-collapse: collapse; width: 100%; margin: 0.3mm 0; font-size: 0.97em; }
.cs-content table.cs th, .cs-content table.cs td, .cs-content table.mini th, .cs-content table.mini td { border: 0.2mm solid #aaa; padding: 0.1mm 0.6mm; text-align: left; vertical-align: top; }
.cs-content table.cs th, .cs-content table.mini th { background: #efefef; font-weight: 700; }
.cs-content sub, .cs-content sup { line-height: 0; font-size: 0.72em; }
`;
}
