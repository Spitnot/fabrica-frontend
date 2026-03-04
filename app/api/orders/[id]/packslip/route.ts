// ... existing imports and constants ...

// Inside the html template string, find the .header div and replace the .brand div:

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Packslip · ${id.slice(0, 8).toUpperCase()}</title>
  <style>
    /* ... existing styles ... */
    .brand-logo { height: 36px; width: auto; }
  </style>
</head>
<body>

  <!-- Print button -->
  <div class="no-print" style="margin-bottom:20px;text-align:right">
    <button onclick="window.print()"
      style="padding:8px 18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
      Print / Save as PDF
    </button>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <!-- REPLACED TEXT WITH IMAGE -->
      <img src="https://b2b.firmarollers.com/FR_ICON_B.svg" alt="Firma Rollers" class="brand-logo" />
      <div class="brand-sub" style="margin-top:4px;">B2B</div>
    </div>
    <div class="doc-title">
      <h1>Packing Slip</h1>
      <div class="ref">#${id.slice(0, 8).toUpperCase()}</div>
      <div class="status">${STATUS_LABELS[order.status] ?? order.status}</div>
    </div>
  </div>
  
  <!-- Rest of the file remains exactly the same -->
  <!-- ... addresses, meta, table, footer ... -->
`;