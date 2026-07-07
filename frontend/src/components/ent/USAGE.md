# Mahima Enterprise Component Usage Guide

## Import
```jsx
import { PageHeader, KpiGrid, KpiCard, Section, Table,
         Badge, Btn, Modal, EmptyState, Tabs, Alert,
         Pagination, FormGrid, Field, Avatar, InfoGrid } from "../components/ent";
```

## Page Template (copy-paste for any new feature page)
```jsx
import React, { useState } from "react";
import { Users, Plus, Download } from "lucide-react";
import { PageHeader, KpiGrid, KpiCard, Section, Toolbar,
         Table, Badge, Btn, Pagination } from "../../components/ent";

export default function MyFeaturePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  return (
    <div>
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="Community"
        title="Members"
        subtitle="Manage your church family"
      >
        <Btn variant="secondary" icon={<Download />} size="sm">Export</Btn>
        <Btn variant="primary" icon={<Plus />}>Add Member</Btn>
      </PageHeader>

      {/* 2. KPI Row */}
      <KpiGrid>
        <KpiCard label="Total Members" value="1,248" trend="+12%" trendDir="up" />
        <KpiCard label="Active"         value="1,180" variant="success" />
        <KpiCard label="New This Month" value="34"    trend="+8%"  trendDir="up" />
        <KpiCard label="Inactive"       value="68"    variant="danger" />
      </KpiGrid>

      {/* 3. Data Section */}
      <Section title="All Members" flush>
        <Toolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search by name or email..."
          filters={[
            { label: "All",      value: "all",      count: 1248 },
            { label: "Active",   value: "active",   count: 1180 },
            { label: "Inactive", value: "inactive", count: 68 },
          ]}
          activeFilter="all"
        />

        <Table
          columns={[
            { key: "name",   label: "Name" },
            { key: "role",   label: "Role" },
            { key: "status", label: "Status" },
            { key: "joined", label: "Joined", muted: true },
            { key: "actions", label: "", actions: true },
          ]}
          rows={[
            { id: 1, name: "Sarah Johnson", role: "Pastor", status: "active", joined: "Jan 2024" },
          ]}
          keyFn={(r) => r.id}
          renderCell={(row, col) => {
            if (col.key === "status") return <Badge variant="success" dot>Active</Badge>;
            if (col.key === "actions") return <Btn size="sm" variant="ghost">Edit</Btn>;
            return row[col.key];
          }}
          empty={{ title: "No members found", text: "Try adjusting your search." }}
        />

        <Pagination page={page} total={1248} limit={25} onChange={setPage} />
      </Section>
    </div>
  );
}
```

## Badge Variants
```jsx
<Badge variant="success" dot>Active</Badge>
<Badge variant="warning" dot>Pending</Badge>
<Badge variant="danger"  dot>Inactive</Badge>
<Badge variant="info"    dot>New</Badge>
<Badge variant="primary" dot>Admin</Badge>
<Badge variant="neutral" dot>Draft</Badge>
```

## Button Variants
```jsx
<Btn variant="primary">Save</Btn>
<Btn variant="secondary">Cancel</Btn>
<Btn variant="ghost">View</Btn>
<Btn variant="danger">Delete</Btn>
<Btn variant="soft-primary">Export</Btn>
<Btn variant="primary" size="sm">Small</Btn>
<Btn variant="primary" loading={true}>Saving...</Btn>
```

## Modal
```jsx
<Modal open={showModal} onClose={() => setShowModal(false)} title="Add Member" subtitle="Fill in the details below">
  <Modal.Body>
    <FormGrid>
      <Field label="Full Name" required>
        <input className="ent-input" placeholder="Jane Doe" />
      </Field>
      <Field label="Email" required error="Invalid email">
        <input className="ent-input" type="email" />
      </Field>
      <Field label="Role">
        <select className="ent-select">
          <option>Member</option>
          <option>Pastor</option>
        </select>
      </Field>
      <Field label="Notes" full hint="Optional">
        <textarea className="ent-textarea" rows={3} />
      </Field>
    </FormGrid>
  </Modal.Body>
  <Modal.Footer>
    <Btn onClick={() => setShowModal(false)}>Cancel</Btn>
    <Btn variant="primary" loading={saving}>Save Member</Btn>
  </Modal.Footer>
</Modal>
```

## Tabs
```jsx
<Section title="Finance" flush>
  <Tabs
    tabs={[
      { key: "payroll",  label: "Payroll",  count: 24 },
      { key: "expenses", label: "Expenses", count: 12 },
      { key: "reports",  label: "Reports" },
    ]}
    active={activeTab}
    onChange={setActiveTab}
  />
  {/* tab content */}
</Section>
```

## Alert
```jsx
<Alert variant="success">Profile updated successfully.</Alert>
<Alert variant="warning">Review pending approval requests.</Alert>
<Alert variant="danger">Failed to save. Please try again.</Alert>
<Alert variant="info">Sync in progress — data may be stale.</Alert>
```

## KPI Card Variants (accent bar color)
```jsx
<KpiCard label="Revenue"   value="₹4.2L"  variant="success" />  // green top bar
<KpiCard label="Pending"   value="12"     variant="warning" />  // amber top bar
<KpiCard label="Overdue"   value="3"      variant="danger"  />  // red top bar
<KpiCard label="New Users" value="48"     variant="info"    />  // blue top bar
{/* no variant = default teal/green gradient */}
```
