import { useState } from 'react'
import { HelpCircle, Scissors, Factory, Palette, FlaskConical, ClipboardList, Users, LayoutDashboard, Clock, Download, Keyboard } from 'lucide-react'

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: HelpCircle },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'styles', label: 'Styles', icon: Scissors },
  { id: 'suppliers', label: 'Suppliers', icon: Factory },
  { id: 'materials', label: 'Materials', icon: Palette },
  { id: 'samples', label: 'Samples', icon: FlaskConical },
  { id: 'orders', label: 'Purchase Orders', icon: ClipboardList },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'activity', label: 'Activity Log', icon: Clock },
  { id: 'export', label: 'Exporting Data', icon: Download },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
]

export default function Help() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Help & Documentation</h1>
          <p className="subtitle">Learn how to use Sourcing CRM</p>
        </div>
      </div>

      <div className="help-toc card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Table of Contents</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
              <s.icon size={14} /> {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="help-sections" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Section id="getting-started" title="Getting Started">
          <p><strong>Sourcing CRM</strong> helps fashion teams manage the entire product development lifecycle: styles, suppliers, materials, samples, and purchase orders.</p>
          <h4>First Steps</h4>
          <ol>
            <li><strong>Select a Season</strong> &mdash; Use the season selector in the sidebar to pick your active season.</li>
            <li><strong>Add Suppliers</strong> &mdash; Go to Suppliers and add your factory partners.</li>
            <li><strong>Create Styles</strong> &mdash; Build out your line with style numbers, categories, and supplier assignments.</li>
            <li><strong>Track Samples</strong> &mdash; Log sample rounds (Proto, Fit, PP, TOP) and track their status.</li>
            <li><strong>Issue Purchase Orders</strong> &mdash; Create POs when styles are approved for production.</li>
          </ol>
        </Section>

        <Section id="dashboard" title="Dashboard">
          <p>The Dashboard gives you a real-time overview of your season:</p>
          <ul>
            <li><strong>Stat Cards</strong> &mdash; Total styles, in-development count, samples awaiting review, open POs.</li>
            <li><strong>Status Charts</strong> &mdash; Visual breakdown of styles by status and samples by round.</li>
            <li><strong>Upcoming Deadlines</strong> &mdash; Samples and POs due in the next 7 days.</li>
            <li><strong>Activity Feed</strong> &mdash; Recent changes made by your team.</li>
            <li><strong>Overdue Alerts</strong> &mdash; Red banner when items are past their deadline.</li>
          </ul>
        </Section>

        <Section id="styles" title="Styles">
          <p>Styles represent individual products in your line. Each style has:</p>
          <ul>
            <li><strong>Style Number</strong> &mdash; Unique identifier (e.g., ST-2601).</li>
            <li><strong>Status</strong> &mdash; Concept, Development, Sampling, Costing, Approved, Production, Shipped, Cancelled.</li>
            <li><strong>BOM (Bill of Materials)</strong> &mdash; Track all materials, trims, and packaging with costs.</li>
            <li><strong>Colorways</strong> &mdash; Color variations for the style.</li>
            <li><strong>Size Run</strong> &mdash; Size range with quantities.</li>
          </ul>
          <p>Use <strong>Grid view</strong> for visual browsing or <strong>Table view</strong> for detailed data. Filter by status, category, supplier, or assignee.</p>
        </Section>

        <Section id="suppliers" title="Suppliers">
          <p>Manage your supplier base with detailed profiles:</p>
          <ul>
            <li><strong>Contact Info</strong> &mdash; Name, email, phone, location.</li>
            <li><strong>Product Types</strong> &mdash; Knits, Wovens, Denim, etc.</li>
            <li><strong>Certifications</strong> &mdash; GOTS, OEKO-TEX, BSCI, and more.</li>
            <li><strong>Scorecard</strong> &mdash; Rate quality, delivery, communication, and pricing.</li>
            <li><strong>Status</strong> &mdash; Active, Pending Approval, Inactive, Blacklisted.</li>
          </ul>
        </Section>

        <Section id="materials" title="Materials">
          <p>The Materials Library is your central repository for fabrics, trims, and packaging:</p>
          <ul>
            <li>Upload swatch images for visual reference.</li>
            <li>Track composition, weight, width, and pricing.</li>
            <li>Link materials to suppliers for sourcing.</li>
            <li>Materials are automatically available when building BOMs.</li>
          </ul>
        </Section>

        <Section id="samples" title="Samples">
          <p>Track sample rounds with a <strong>Kanban board</strong>:</p>
          <ul>
            <li><strong>Rounds</strong> &mdash; Proto, Fit, Pre-Production, Top of Production, Shipment.</li>
            <li><strong>Statuses</strong> &mdash; Requested, In Progress, Received, Under Review, Approved, Rejected, Revised.</li>
            <li><strong>Drag & Drop</strong> &mdash; Move cards between columns to update status.</li>
            <li>Add measurements, photos, and review comments to each sample.</li>
          </ul>
        </Section>

        <Section id="orders" title="Purchase Orders">
          <p>Create and manage production purchase orders:</p>
          <ul>
            <li><strong>PO Number</strong> &mdash; Auto-generated or custom.</li>
            <li><strong>Line Items</strong> &mdash; Link styles with quantity, colorway, size, and pricing.</li>
            <li><strong>Status Tracking</strong> &mdash; Draft, Issued, Confirmed, In Production, Shipped, Received.</li>
            <li><strong>Dates</strong> &mdash; Issue date, confirm-by, ex-factory, delivery.</li>
            <li><strong>Financials</strong> &mdash; Currency, payment terms, total amount auto-calculated.</li>
          </ul>
        </Section>

        <Section id="team" title="Team">
          <p>View and manage your team members. Each person has a role (Sourcing Manager, Merchandiser, QC Manager, etc.) and can be assigned to styles, samples, and POs.</p>
        </Section>

        <Section id="activity" title="Activity Log">
          <p>The Activity Log tracks all changes across your season:</p>
          <ul>
            <li>See who created, updated, or deleted items.</li>
            <li>Filter by entity type (style, supplier, sample, etc.) or by person.</li>
            <li>Paginated history for full audit trail.</li>
          </ul>
        </Section>

        <Section id="export" title="Exporting Data">
          <p>Export your data as CSV files from the Styles, Suppliers, and Samples pages. Click the <strong>Export</strong> button in the page header to download the currently filtered data.</p>
        </Section>

        <Section id="shortcuts" title="Keyboard Shortcuts">
          <table className="data-table" style={{ maxWidth: '400px' }}>
            <thead>
              <tr><th>Shortcut</th><th>Action</th></tr>
            </thead>
            <tbody>
              <tr><td><code>Esc</code></td><td>Close modal / dialog</td></tr>
            </tbody>
          </table>
        </Section>

        <Section id="faq" title="Frequently Asked Questions">
          <FAQ q="How do I switch seasons?" a="Use the season dropdown at the top of the sidebar. All data is filtered by the selected season." />
          <FAQ q="Can I delete a style?" a="Yes. Open the style detail page and use the delete option. This will also remove associated BOM items." />
          <FAQ q="How are PO totals calculated?" a="Totals are automatically calculated from line items: quantity x unit price for each line, summed for the PO total." />
          <FAQ q="How do I export data?" a="Click the Export button on the Styles, Suppliers, or Samples page. It downloads a CSV of the currently filtered view." />
          <FAQ q="Who can see activity logs?" a="All team members can view the activity log for the current season." />
        </Section>
      </div>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <div id={id} className="card help-section">
      <h2 style={{ marginBottom: '0.75rem' }}>{title}</h2>
      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-700)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--gray-100)', padding: '0.75rem 0' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ cursor: 'pointer', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        {q}
        <span style={{ color: 'var(--gray-400)', fontSize: '1.25rem' }}>{open ? '-' : '+'}</span>
      </div>
      {open && <div style={{ marginTop: '0.5rem', color: 'var(--gray-500)' }}>{a}</div>}
    </div>
  )
}
