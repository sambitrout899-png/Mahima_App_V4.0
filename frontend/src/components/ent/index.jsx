/**
 * Mahima Enterprise UI Components v4.0
 * ─────────────────────────────────────
 * Drop-in, zero-dependency React components built on the .ent-* CSS classes
 * in index.css. Gives every feature page a Salesforce/ServiceNow-grade look
 * without touching individual page logic.
 *
 * Usage:
 *   import { PageHeader, KpiGrid, KpiCard, Section, Table,
 *            Badge, Btn, Modal, EmptyState, Skeleton,
 *            Tabs, Alert, Pagination } from "../components/ent";
 */

import React, { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Search, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   PAGE HEADER
   ══════════════════════════════════════════════════════════════════ */

/**
 * <PageHeader title="Members" subtitle="Manage church members" eyebrow="Community">
 *   <Btn variant="primary" icon={<Plus />}>Add Member</Btn>
 * </PageHeader>
 */
export function PageHeader({ title, subtitle, eyebrow, icon, children, className = "" }) {
  return (
    <div className={`ent-page-header ${className}`}>
      <div className="ent-page-header-left">
        {eyebrow && (
          <div className="ent-page-eyebrow">
            {icon && <span className="w-3.5 h-3.5">{icon}</span>}
            {eyebrow}
          </div>
        )}
        <h1 className="ent-page-title">{title}</h1>
        {subtitle && <p className="ent-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="ent-page-actions">{children}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   KPI CARDS
   ══════════════════════════════════════════════════════════════════ */

/**
 * <KpiGrid>
 *   <KpiCard label="Total Members" value="1,248" trend="+12%" trendDir="up" icon={<Users />} />
 * </KpiGrid>
 */
export function KpiGrid({ children, cols = 4, className = "" }) {
  return (
    <div
      className={`ent-kpi-grid ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${Math.floor(900 / cols)}px, 1fr))` }}
    >
      {children}
    </div>
  );
}

export function KpiCard({ label, value, trend, trendDir = "flat", icon, variant, className = "" }) {
  const variantClass = variant ? `ent-kpi-card-${variant}` : "";
  const trendClass = `ent-kpi-trend-${trendDir}`;
  return (
    <div className={`ent-kpi-card ${variantClass} ${className}`}>
      {icon && (
        <div className="ent-kpi-icon">
          {React.cloneElement(icon, { size: 17 })}
        </div>
      )}
      <div className="ent-kpi-value">{value ?? "—"}</div>
      <div className="ent-kpi-label">{label}</div>
      {trend && (
        <div className={`ent-kpi-trend ${trendClass}`}>
          {trendDir === "up" ? "↑" : trendDir === "down" ? "↓" : "—"} {trend}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SECTION / PANEL
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Section title="Recent Activity" subtitle="Last 7 days" actions={<Btn size="sm">View all</Btn>}>
 *   content...
 * </Section>
 */
export function Section({ title, subtitle, icon, actions, flush = false, children, className = "" }) {
  return (
    <div className={`ent-section ${className}`}>
      {(title || actions) && (
        <div className="ent-section-hd">
          <div>
            {title && (
              <div className="ent-section-title">
                {icon && React.cloneElement(icon, { size: 15, className: "text-emerald-700 shrink-0" })}
                {title}
              </div>
            )}
            {subtitle && <div className="ent-section-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="ent-section-actions">{actions}</div>}
        </div>
      )}
      <div className={flush ? "ent-section-body-flush" : "ent-section-body"}>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TOOLBAR
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Toolbar
 *   search={search} onSearch={setSearch} placeholder="Search members..."
 *   filters={[{ label: "All", value: "all" }, { label: "Active", value: "active" }]}
 *   activeFilter={filter} onFilter={setFilter}
 * >
 *   (optional extra children on the right)
 * </Toolbar>
 */
export function Toolbar({ search, onSearch, placeholder = "Search...", filters, activeFilter, onFilter, children }) {
  return (
    <div className="ent-toolbar">
      {onSearch !== undefined && (
        <div className="ent-search">
          <Search size={14} className="ent-search-icon" />
          <input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      )}

      {filters?.map((f) => (
        <button
          key={f.value}
          type="button"
          className={`ent-filter-chip ${activeFilter === f.value ? "ent-filter-chip-active" : ""}`}
          onClick={() => onFilter?.(f.value)}
        >
          {f.icon && React.cloneElement(f.icon, { size: 12 })}
          {f.label}
          {f.count !== undefined && (
            <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
          )}
        </button>
      ))}

      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BUTTON
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Btn variant="primary" size="sm" icon={<Plus />} loading={saving} onClick={handleSave}>
 *   Save
 * </Btn>
 */
export function Btn({
  variant = "secondary",
  size,
  icon,
  iconRight,
  loading,
  disabled,
  children,
  className = "",
  type = "button",
  ...rest
}) {
  const variantClass = `ent-btn-${variant}`;
  const sizeClass = size ? `ent-btn-${size}` : "";
  const iconOnly = !children && (icon || iconRight);
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`ent-btn ${variantClass} ${sizeClass} ${iconOnly ? "ent-btn-icon" : ""} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && React.cloneElement(icon, { size: size === "sm" ? 13 : 15 })
      )}
      {children}
      {!loading && iconRight && React.cloneElement(iconRight, { size: size === "sm" ? 13 : 15 })}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BADGE
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Badge variant="success" dot>Active</Badge>
 * variants: success | warning | danger | info | neutral | primary
 */
export function Badge({ variant = "neutral", dot = false, children, className = "" }) {
  return (
    <span className={`ent-badge ent-badge-${variant} ${dot ? "ent-badge-dot" : ""} ${className}`}>
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DATA TABLE
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Table
 *   columns={[{ key: "name", label: "Name" }, { key: "role", label: "Role" }]}
 *   rows={users}
 *   loading={loading}
 *   empty={{ title: "No members yet", text: "Add your first member to get started." }}
 *   renderCell={(row, col) => col.key === "role" ? <Badge>{row.role}</Badge> : row[col.key]}
 *   keyFn={(row) => row.id}
 * />
 */
export function Table({ columns = [], rows = [], loading, empty, renderCell, keyFn, className = "" }) {
  if (loading) {
    return (
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="ent-skeleton-row">
            <div className="ent-skeleton ent-skeleton-avatar" />
            {columns.slice(1).map((c) => (
              <div key={c.key} className="ent-skeleton ent-skeleton-text flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length && empty) {
    return (
      <EmptyState
        title={typeof empty === "object" ? empty.title : empty}
        text={typeof empty === "object" ? empty.text : undefined}
        icon={typeof empty === "object" ? empty.icon : undefined}
        action={typeof empty === "object" ? empty.action : undefined}
      />
    );
  }

  return (
    <div className={`ent-table-wrap ${className}`}>
      <table className="ent-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.sortable ? "sortable" : ""} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={keyFn ? keyFn(row) : rowIndex}>
              {columns.map((col) => (
                <td key={col.key} className={col.muted ? "ent-td-muted" : col.actions ? "ent-td-actions" : ""}>
                  {renderCell ? renderCell(row, col) : (row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AVATAR
   ══════════════════════════════════════════════════════════════════ */

export function Avatar({ name = "", src, size = "", className = "" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";
  const sizeClass = size === "sm" ? "ent-avatar-sm" : size === "lg" ? "ent-avatar-lg" : "";
  return (
    <div className={`ent-avatar ${sizeClass} ${className}`} title={name}>
      {src ? <img src={src} alt={name} /> : initials}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EMPTY STATE
   ══════════════════════════════════════════════════════════════════ */

export function EmptyState({ title = "Nothing here yet", text, icon, action }) {
  return (
    <div className="ent-empty">
      <div className="ent-empty-icon">
        {icon ? React.cloneElement(icon, { size: 24 }) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
          </svg>
        )}
      </div>
      <div className="ent-empty-title">{title}</div>
      {text && <div className="ent-empty-text">{text}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOADING SKELETON
   ══════════════════════════════════════════════════════════════════ */

export function Skeleton({ variant = "text", width, height, className = "" }) {
  const variantClass = {
    text: "ent-skeleton-text",
    "text-sm": "ent-skeleton-text-sm",
    avatar: "ent-skeleton-avatar",
    heading: "ent-skeleton-heading",
  }[variant] || "ent-skeleton-text";

  return (
    <div
      className={`ent-skeleton ${variantClass} ${className}`}
      style={{ width, height }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   ALERT / BANNER
   ══════════════════════════════════════════════════════════════════ */

const ALERT_ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
  neutral: Info,
};

/**
 * <Alert variant="success">Profile saved successfully.</Alert>
 */
export function Alert({ variant = "neutral", children, className = "" }) {
  const Icon = ALERT_ICONS[variant] || Info;
  return (
    <div className={`ent-alert ent-alert-${variant} ${className}`} role="alert">
      <Icon size={16} className="ent-alert-icon shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MODAL
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Member" size="lg">
 *   content...
 *   <Modal.Footer>
 *     <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
 *     <Btn variant="primary" loading={saving}>Save</Btn>
 *   </Modal.Footer>
 * </Modal>
 */
export function Modal({ open, onClose, title, subtitle, size = "", children, className = "" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === "lg" ? "ent-modal-lg" : size === "sm" ? "ent-modal-sm" : "";

  return (
    <div
      className="ent-modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className={`ent-modal ${sizeClass} ${className}`} role="dialog" aria-modal="true">
        <div className="ent-modal-hd">
          <div>
            <div className="ent-modal-title">{title}</div>
            {subtitle && <div className="ent-modal-subtitle">{subtitle}</div>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="ent-modal-close" aria-label="Close">
              <X size={16} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

Modal.Body = function ModalBody({ children, className = "" }) {
  return <div className={`ent-modal-body ${className}`}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className = "" }) {
  return <div className={`ent-modal-ft ${className}`}>{children}</div>;
};

/* ══════════════════════════════════════════════════════════════════
   FORM HELPERS
   ══════════════════════════════════════════════════════════════════ */

/**
 * <FormGrid>
 *   <Field label="Full Name" required error={errors.name}>
 *     <input className="ent-input" ... />
 *   </Field>
 * </FormGrid>
 */
export function FormGrid({ children, className = "" }) {
  return <div className={`ent-form-grid ${className}`}>{children}</div>;
}

export function Field({ label, required, hint, error, full, children, className = "" }) {
  return (
    <div className={`ent-field ${full ? "ent-field-full" : ""} ${error ? "ent-field-has-error" : ""} ${className}`}>
      {label && (
        <label className={`ent-label ${required ? "ent-label-required" : ""}`}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <div className="ent-input-hint">{hint}</div>}
      {error && (
        <div className="ent-input-error">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TABS
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Tabs
 *   tabs={[{ key: "all", label: "All", count: 120 }, { key: "active", label: "Active" }]}
 *   active={tab}
 *   onChange={setTab}
 * />
 */
export function Tabs({ tabs = [], active, onChange, className = "" }) {
  return (
    <div className={`ent-tabs ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`ent-tab ${active === tab.key ? "ent-tab-active" : ""}`}
          onClick={() => onChange?.(tab.key)}
        >
          {tab.icon && React.cloneElement(tab.icon, { size: 14 })}
          {tab.label}
          {tab.count !== undefined && (
            <span className="ent-tab-count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PAGINATION
   ══════════════════════════════════════════════════════════════════ */

/**
 * <Pagination page={page} total={total} limit={limit} onChange={setPage} />
 */
export function Pagination({ page = 1, total = 0, limit = 10, onChange, className = "" }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  if (totalPages <= 1) return null;

  return (
    <div className={`ent-pagination ${className}`}>
      <span>
        {total > 0 ? `${start}–${end} of ${total}` : "No results"}
      </span>

      <div className="ent-pagination-pages">
        <button
          type="button"
          className="ent-page-btn"
          disabled={page <= 1}
          onClick={() => onChange?.(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-sm">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className={`ent-page-btn ${p === page ? "ent-page-btn-active" : ""}`}
              onClick={() => onChange?.(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="ent-page-btn"
          disabled={page >= totalPages}
          onClick={() => onChange?.(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   INFO GRID (detail views — label:value pairs)
   ══════════════════════════════════════════════════════════════════ */

/**
 * <InfoGrid fields={[{ label: "Email", value: user.email }, { label: "Role", value: <Badge>Admin</Badge> }]} />
 */
export function InfoGrid({ fields = [], className = "" }) {
  return (
    <div className={`ent-info-grid ${className}`}>
      {fields.map((f, i) => (
        <div key={i} className="ent-info-field">
          <label>{f.label}</label>
          <span>{f.value ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DIVIDER
   ══════════════════════════════════════════════════════════════════ */

export function Divider({ className = "" }) {
  return <hr className={`ent-divider ${className}`} />;
}
