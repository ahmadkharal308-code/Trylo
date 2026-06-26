// Server-rendered HTML for the admin pending-sellers page.
// All dynamic values are run through escHtml() before insertion.

export interface SellerRow {
  id: string;
  businessName: string;
  location: string | null;
  addressLine: string | null;
  cnicNumber: string | null;
  cnicDocumentUrl: string | null;
  businessProofUrl: string | null;
  createdAt: Date;
  user: {
    fullName: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function renderCard(s: SellerRow): string {
  const name = s.user?.fullName ?? '—';
  const phone = s.user?.phone ?? '—';
  const locationLine = [s.location, s.addressLine].filter(Boolean).join(', ') || '—';

  const cnicLink = s.cnicDocumentUrl
    ? `<a href="${esc(s.cnicDocumentUrl)}" target="_blank" rel="noopener noreferrer">View CNIC photo ↗</a>`
    : `<span class="none">Not uploaded</span>`;

  const proofLink = s.businessProofUrl
    ? `<a href="${esc(s.businessProofUrl)}" target="_blank" rel="noopener noreferrer">View document ↗</a>`
    : `<span class="none">Not provided</span>`;

  return `
<div class="card">
  <h2 class="card-title">${esc(s.businessName)}</h2>
  <dl class="fields">
    <dt>Contact name</dt><dd>${esc(name)}</dd>
    <dt>Phone</dt><dd>${esc(phone)}</dd>
    <dt>Location</dt><dd>${esc(locationLine)}</dd>
    <dt>CNIC number</dt><dd>${esc(s.cnicNumber ?? '—')}</dd>
    <dt>CNIC photo</dt><dd>${cnicLink}</dd>
    <dt>Business proof</dt><dd>${proofLink}</dd>
    <dt>Applied</dt><dd>${esc(formatDate(s.createdAt))}</dd>
  </dl>
  <div class="actions">
    <form method="post" action="/admin/sellers/${esc(s.id)}/approve">
      <button class="btn btn-approve" type="submit">Approve</button>
    </form>
    <form method="post" action="/admin/sellers/${esc(s.id)}/reject" class="reject-form">
      <textarea name="reason" placeholder="Reason for rejection (optional)"></textarea>
      <button class="btn btn-reject" type="submit">Reject</button>
    </form>
  </div>
</div>`;
}

export function buildAdminHtml(sellers: SellerRow[]): string {
  const count = sellers.length;
  const body =
    count === 0
      ? '<p class="empty">No pending applications — all clear.</p>'
      : sellers.map(renderCard).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trylo Admin — Pending Sellers</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f4f4f5; color: #18181b; padding: 32px 24px; max-width: 760px; margin: 0 auto; }
    header { margin-bottom: 28px; }
    h1 { font-size: 1.35rem; font-weight: 700; }
    .subtitle { color: #71717a; font-size: 0.85rem; margin-top: 4px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; border-radius: 999px; font-size: 0.75rem; font-weight: 600; padding: 1px 10px; margin-left: 8px; vertical-align: middle; }
    .card { background: #fff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 22px; margin-bottom: 18px; }
    .card-title { font-size: 1rem; font-weight: 600; margin-bottom: 14px; }
    dl.fields { display: grid; grid-template-columns: 130px 1fr; gap: 6px 12px; font-size: 0.875rem; }
    dt { color: #71717a; }
    dd { color: #18181b; word-break: break-all; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .none { color: #a1a1aa; font-style: italic; }
    .actions { display: flex; gap: 14px; align-items: flex-start; margin-top: 18px; padding-top: 16px; border-top: 1px solid #f4f4f5; }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 18px; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
    .btn-approve { background: #16a34a; color: #fff; }
    .btn-approve:hover { background: #15803d; }
    .btn-reject { background: #dc2626; color: #fff; }
    .btn-reject:hover { background: #b91c1c; }
    .reject-form { display: flex; flex-direction: column; gap: 8px; }
    textarea { border: 1px solid #d4d4d8; border-radius: 6px; padding: 8px 10px; font-size: 0.875rem; resize: vertical; min-height: 58px; width: 260px; font-family: inherit; }
    .empty { color: #71717a; font-style: italic; padding: 12px 0; }
  </style>
</head>
<body>
  <header>
    <h1>Trylo Admin <span class="badge">${esc(String(count))} pending</span></h1>
    <p class="subtitle">Pending seller applications — review CNIC and approve or reject.</p>
  </header>
  ${body}
</body>
</html>`;
}
