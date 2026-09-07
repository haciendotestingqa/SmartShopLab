import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

export type ReportTool =
  | 'newman'
  | 'playwright'
  | 'pact'
  | 'k6'
  | 'openrouter'
  | 'maestro';

export interface HtmlReportRow {
  name: string;
  passed: boolean;
  detail: string;
}

export interface HtmlReportOptions {
  filePath: string;
  title: string;
  subtitle?: string;
  summary: string;
  passed: boolean;
  rows: HtmlReportRow[];
  /** Logo de la herramienta en la esquina superior derecha */
  tool?: ReportTool;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** SVG + etiqueta por herramienta (tamaño medio ~56px) — logos oficiales/reconocibles */
export const TOOL_LOGOS: Record<ReportTool, { label: string; svg: string }> = {
  newman: {
    label: 'Newman / Postman',
    // Logo oficial Postman (Simple Icons) — Newman es el CLI de Postman
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="56" height="56" role="img" aria-label="Postman Newman">
      <path fill="#FF6C37" d="M13.527.099C6.955-.744.942 3.9.099 10.473c-.843 6.572 3.8 12.584 10.373 13.428 6.573.843 12.587-3.801 13.428-10.374C24.744 6.955 20.101.943 13.527.099zm2.471 7.485a.855.855 0 0 0-.593.25l-4.453 4.453-.307-.307-.643-.643c4.389-4.376 5.18-4.418 5.996-3.753zm-4.863 4.861l4.44-4.44a.62.62 0 1 1 .847.903l-4.699 4.125-.588-.588zm.33.694l-1.1.238a.06.06 0 0 1-.067-.032.06.06 0 0 1 .01-.073l.645-.645.512.512zm-2.803-.459l1.172-1.172.879.878-1.979.426a.074.074 0 0 1-.085-.039.072.072 0 0 1 .013-.093zm-3.646 6.058a.076.076 0 0 1-.069-.083.077.077 0 0 1 .022-.046h.002l.946-.946 1.222 1.222-2.123-.147zm2.425-1.256a.228.228 0 0 0-.117.256l.203.865a.125.125 0 0 1-.211.117h-.003l-.934-.934-.294-.295 3.762-3.758 1.82-.393.874.874c-1.255 1.102-2.971 2.201-5.1 3.268zm5.279-3.428h-.002l-.839-.839 4.699-4.125a.952.952 0 0 0 .119-.127c-.148 1.345-2.029 3.245-3.977 5.091zm3.657-6.46l-.003-.002a1.822 1.822 0 0 1 2.459-2.684l-1.61 1.613a.119.119 0 0 0 0 .169l1.247 1.247a1.817 1.817 0 0 1-2.093-.343zm2.578 0a1.714 1.714 0 0 1-.271.218h-.001l-1.207-1.207 1.533-1.533c.661.72.637 1.832-.054 2.522zM18.855 6.05a.143.143 0 0 0-.053.157.416.416 0 0 1-.053.45.14.14 0 0 0 .023.197.141.141 0 0 0 .084.03.14.14 0 0 0 .106-.05.691.691 0 0 0 .087-.751.138.138 0 0 0-.194-.033z"/>
    </svg>`,
  },
  playwright: {
    label: 'Playwright',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="56" height="56" role="img" aria-label="Playwright">
      <path fill="#2EAD33" d="M23.996 7.462c-.056.837-.257 2.135-.716 3.85-.995 3.715-4.27 10.874-10.42 9.227-6.15-1.65-5.407-9.487-4.412-13.201.46-1.716.934-2.94 1.305-3.694.42-.853.846-.289 1.815.523.684.573 2.41 1.791 5.011 2.488 2.601.697 4.706.506 5.583.352 1.245-.219 1.897-.494 1.834.455Zm-9.807 3.863s-.127-1.819-1.773-2.286c-1.644-.467-2.613 1.04-2.613 1.04Zm4.058 4.539-7.769-2.172s.446 2.306 3.338 3.153c2.862.836 4.43-.98 4.43-.981Zm2.701-2.51s-.13-1.818-1.773-2.286c-1.644-.469-2.612 1.038-2.612 1.038ZM8.57 18.23c-4.749 1.279-7.261-4.224-8.021-7.08C.197 9.831.044 8.832.003 8.188c-.047-.73.455-.52 1.415-.354.677.118 2.3.261 4.308-.28a11.28 11.28 0 0 0 2.41-.956c-.058.197-.114.4-.17.61-.433 1.618-.827 4.055-.632 6.426-1.976.732-2.267 2.423-2.267 2.423l2.524-.715c.227 1.002.6 1.987 1.15 2.838a5.914 5.914 0 0 1-.171.049Zm-4.188-6.298c1.265-.333 1.363-1.631 1.363-1.631l-3.374.888s.745 1.076 2.01.743Z"/>
    </svg>`,
  },
  pact: {
    label: 'Pact',
    // Logo oficial: eslabones de cadena (pact-foundation/pact-logo media/link.svg)
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 75" width="56" height="56" role="img" aria-label="Pact">
      <path fill="#F8FAFC" d="M43.339 61.726c5.887-.816 11.002-2.573 15.338-6.325.677.412 1.291.788 1.906 1.162 2.272 1.379 4.602 2.677 6.812 4.154 3.665 2.455 9.307.694 11.507-2.806 2.229-3.544 1.803-8.191-1.202-10.993-1.124-1.051-2.553-1.787-3.885-2.6-6.099-3.719-12.253-7.351-18.302-11.149-2.332-1.463-6.863-1.549-9.098.479.777.851 1.563 1.708 2.372 2.592-4.877 0-9.672 0-14.475 0 0-4.986 0-9.738 0-14.868 1.006.911 1.717 1.554 2.479 2.244.291-.176.563-.309.801-.485 4.875-3.653 10.412-4.917 16.371-4.282 3.396.361 6.543 1.715 9.463 3.465 6.218 3.725 12.397 7.512 18.576 11.304 4.114 2.525 7.539 5.728 9.523 10.233 2.881 6.544 2.784 13.009-.473 19.435-1.715 3.384-4.127 6.121-7.266 8.169-4.515 2.949-9.471 4.097-14.884 3.479-3.787-.431-7.103-1.96-10.291-3.854-4.526-2.688-9.008-5.456-13.507-8.193-.971-.591-1.437-.918-2.256-1.457z"/>
      <path fill="#F8FAFC" d="M45.82 41.509c-.68-.771-1.291-1.462-1.998-2.262 4.899 0 9.64 0 14.376 0 0 4.972 0 9.742 0 14.515-.117.06-.234.119-.352.179-.692-.882-1.387-1.763-1.986-2.526-2.095 1.197-3.734 2.335-5.527 3.121-6.47 2.833-12.986 2.959-19.25-.495-5.475-3.018-10.781-6.339-16.158-9.53-2.998-1.78-6.059-3.487-8.51-6.028-5.38-5.575-7.41-12.209-5.961-19.813C1.589 12.714 4.798 8.005 9.808 4.654c4.287-2.868 9.08-4.02 14.275-3.554 4.115.369 7.719 1.998 11.174 4.097 4.278 2.603 8.556 5.208 12.83 7.815.201.123.383.283.709.527-5.782.676-10.891 2.529-15.338 6.261-2.311-1.397-4.664-2.646-6.82-4.169-2.973-2.104-7.864-1.876-10.769 1.103-4.165 4.275-3.122 10.717 1.253 13.39 6.635 4.052 13.268 8.105 19.916 12.129 2.92 1.778 6.759 1.462 9.133-.517z"/>
    </svg>`,
  },
  k6: {
    label: 'Grafana k6',
    // Logo oficial k6 (assets/logo.svg) — montaña naranja #FF671D
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 974" width="56" height="56" role="img" aria-label="k6">
      <path fill="#FF671D" d="M1023.44 942.291C1026.79 958.149 1014.69 973.071 998.482 973.071H25.5392C6.85664 973.071 -5.48783 953.649 2.44323 936.734L319.975 259.491C326.801 244.934 345.227 240.244 358.181 249.765L520.715 369.244C532.581 377.968 549.347 374.858 557.297 362.463L782.224 11.7515C794.538 -7.45013 823.939 -2.06866 828.654 20.2499L1023.44 942.291ZM646.996 812.854H649.196C675.024 812.854 699.929 802.92 718.518 784.969C728.099 776.313 735.69 765.739 740.8 753.891C745.908 742.04 748.533 729.268 748.32 716.425C748.746 704.008 746.405 691.662 741.437 680.239C736.47 668.885 729.021 658.737 719.583 650.578C703.759 634.684 682.402 625.531 659.98 624.891H658.277C655.369 624.891 652.389 625.246 649.621 626.099L704.754 544.144L660.832 513.493L640.043 544.144L586.896 625.318C577.742 638.8 570.151 650.649 565.396 658.879C560.5 667.608 556.243 676.689 552.767 686.057C548.792 695.99 546.734 706.634 546.734 717.347C546.594 730.048 549.147 742.677 554.257 754.386C559.295 766.094 566.816 776.525 576.182 785.181C594.559 803.063 619.251 813.066 644.866 813.066L646.924 812.924L646.996 812.854ZM413.481 724.655L474.36 810.726H539.426L467.832 710.819L531.408 622.551L489.191 593.318L470.529 617.938L413.339 698.543V536.41L356.361 489.936V810.654H413.339V724.513H413.409L413.481 724.655ZM647.066 759.211C635.927 759.211 625.284 754.813 617.406 746.935C609.53 739.059 605.132 728.416 605.132 717.277C605.132 706.136 609.53 695.493 617.406 687.617C625.284 679.741 635.927 675.341 647.066 675.341H647.421C652.956 675.341 658.42 676.478 663.458 678.606C668.566 680.806 673.106 683.927 676.939 687.972C680.984 691.662 684.177 696.13 686.305 701.168C688.505 706.206 689.568 711.599 689.568 717.062C689.427 728.273 684.885 738.917 676.939 746.795C668.991 754.671 658.277 759.069 647.066 759.141V759.211Z"/>
    </svg>`,
  },
  openrouter: {
    label: 'OpenRouter',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" role="img" aria-label="OpenRouter">
      <rect width="64" height="64" rx="14" fill="#F8FAFC"/>
      <path fill="#0EA5E9" d="M16 32c0-8.8 7.2-16 16-16h3v7h-3c-5 0-9 4-9 9s4 9 9 9h3v7h-3c-8.8 0-16-7.2-16-16z"/>
      <path fill="#7C3AED" d="M29 32c0-8.8 7.2-16 16-16h3v7h-3c-5 0-9 4-9 9s4 9 9 9h3v7h-3c-8.8 0-16-7.2-16-16z"/>
      <circle cx="32" cy="32" r="4.5" fill="#0F172A"/>
    </svg>`,
  },
  maestro: {
    label: 'Maestro',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="56" height="56" role="img" aria-label="Maestro">
      <rect width="64" height="64" rx="14" fill="#6366F1"/>
      <path fill="#fff" d="M12 44V20h6l8.2 17.5L34.4 20H40v24h-5.2V29.2L28.6 44h-4.8l-6.2-14.8V44H12z"/>
      <rect x="44" y="22" width="8" height="22" rx="4" fill="#fff"/>
      <circle cx="48" cy="18" r="4" fill="#C7D2FE"/>
    </svg>`,
  },
};

/** Markup del logo (también usable para inyectar en reportes de terceros) */
export function toolLogoMarkup(tool: ReportTool): string {
  const meta = TOOL_LOGOS[tool];
  return `<div class="tool-logo" title="${escapeHtml(meta.label)}">
      ${meta.svg}
      <span class="tool-label">${escapeHtml(meta.label)}</span>
    </div>`;
}

/** CSS compartido del header con logo */
export const REPORT_HEADER_CSS = `
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #F9FAFB; color: #0F172A; }
    header { background: #1E293B; color: white; padding: 24px 32px; }
    header p { margin: 8px 0 0; color: #cbd5e1; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .header-text { min-width: 0; flex: 1; }
    .header-text h1 { margin: 0; font-size: 1.5rem; }
    .tool-logo { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .tool-logo svg { width: 56px; height: 56px; display: block; filter: drop-shadow(0 2px 6px rgb(0 0 0 / 25%)); }
    .tool-label { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; }
    main { padding: 24px 32px 48px; max-width: 1100px; }
    .badge { display: inline-block; background: var(--status, #16a34a); color: white; padding: 4px 12px; border-radius: 999px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgb(15 23 42 / 8%); }
    th, td { text-align: left; padding: 12px 16px; vertical-align: top; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; }
    pre { white-space: pre-wrap; margin: 0; font-size: 13px; }
`;

/** Genera un HTML estático para reportes del QA Lab */
export function writeHtmlReport(options: HtmlReportOptions): void {
  mkdirSync(path.dirname(options.filePath), { recursive: true });
  const statusColor = options.passed ? '#16a34a' : '#dc2626';
  const statusLabel = options.passed ? 'PASS' : 'FAIL';
  const rowsHtml = options.rows
    .map((row) => {
      const badge = row.passed ? 'PASS' : 'FAIL';
      const color = row.passed ? '#16a34a' : '#dc2626';
      return `<tr>
        <td>${escapeHtml(row.name)}</td>
        <td style="color:${color};font-weight:700">${badge}</td>
        <td><pre>${escapeHtml(row.detail)}</pre></td>
      </tr>`;
    })
    .join('\n');

  const logoBlock = options.tool ? toolLogoMarkup(options.tool) : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
  <style>
${REPORT_HEADER_CSS}
    :root { --status: ${statusColor}; }
  </style>
</head>
<body>
  <header>
    <div class="header-row">
      <div class="header-text">
        <h1>${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<p>${escapeHtml(options.subtitle)}</p>` : ''}
        <p><span class="badge">${statusLabel}</span> ${escapeHtml(options.summary)}</p>
        <p>Generado: ${escapeHtml(new Date().toISOString())}</p>
      </div>
      ${logoBlock}
    </div>
  </header>
  <main>
    <table>
      <thead><tr><th>Caso</th><th>Estado</th><th>Detalle</th></tr></thead>
      <tbody>${rowsHtml || '<tr><td colspan="3">Sin filas</td></tr>'}</tbody>
    </table>
  </main>
</body>
</html>`;

  writeFileSync(options.filePath, html, 'utf-8');
}
