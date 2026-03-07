# Figma Design Specification — Kestrel Dashboard

> Figma file key: `NG18MHF02rQYRxql9qG084`  
> Template base: SnowUI Dashboard  
> Primary frame: node `54869:11584` — Desktop 1440 × 1024

---

## 1. Design Tokens

### Colors

```css
/* Backgrounds */
--bg-canvas: #0f0f0f; /* outermost canvas (dark) */
--bg-sidebar: #171821; /* left sidebar */
--bg-main: #171821; /* main content area */
--bg-card-blue: #e6f1fd; /* stat card blue tint */
--bg-card-purple: #edeefc; /* stat card purple tint */
--bg-chart-block: rgba(255, 255, 255, 0.04); /* chart container */
--bg-right-panel: #ffffff; /* right panel — WHITE */

/* Text */
--text-white: #ffffff;
--text-black: #000000; /* used on light cards */
--text-muted-40: rgba(255, 255, 255, 0.4);
--text-muted-15: rgba(255, 255, 255, 0.15);

/* Accent palette (chart bars) */
--bar-blue: #a0bce8;
--bar-mint: #6be6d3;
--bar-sky: #7dbbff;
--bar-purple: #b899eb;
--bar-green: #71dd8c;
--bar-primary: #000000; /* iOS bar (solid dark) */

/* Lines / borders */
--border-divider: rgba(255, 255, 255, 0.06);
--border-right-panel: rgba(0, 0, 0, 0.1);
--border-activity: rgba(0, 0, 0, 0.1); /* dashed activity line */

/* Icon badge backgrounds */
--icon-bg-purple: #edeefc;
--icon-bg-blue: #e6f1fd;
```

### Typography

```css
font-family: 'Inter', sans-serif;
font-feature-settings: 'ss01' 1, 'cv01' 1;

/* Scale */
--text-xs:   12px / 16px;
--text-sm:   13px / 18px;
--text-base: 14px / 20px;
--text-lg:   16px / 24px;
--text-xl:   20px / 28px;
--text-2xl:  24px / 32px;

/* Weights used */
400 (regular), 500 (medium), 600 (semibold)
```

### Spacing & Radius

```css
/* Border radii */
--radius-sm:  8px;
--radius-md:  12px;
--radius-lg:  16px;
--radius-xl:  20px;
--radius-2xl: 24px;
--radius-pill: 80px;

/* Card padding */  24px all sides
/* Card gap:      28px between stat cards */
/* Section gap:   20px between chart rows */
```

---

## 2. Layout Grid

```
┌─────────────┬──────────────────────────────────────┬──────────────┐
│  Sidebar    │         Main Content Area             │  Right Panel │
│  220px      │            flex-1                     │   280px      │
│  dark bg    │       light/dark cards mixed          │  white bg    │
└─────────────┴──────────────────────────────────────┴──────────────┘
```

```tsx
// app/dashboard/layout.tsx (target)
<div className="flex h-screen overflow-hidden bg-[#171821]">
  <DashboardSidebar /> {/* 220px, shrink-0 */}
  <div className="flex flex-1 flex-col overflow-hidden">
    <DashboardTopBar /> {/* h-14 */}
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
  <DashboardRightPanel /> {/* hidden on < xl, 280px */}
</div>
```

---

## 3. Top Navigation Bar

```
[ Dashboards / Default ]   ········   [🔍 Search]  [☀]  [↻]  [🔔1]  [⊞]
```

```tsx
// components/DashboardTopBar.tsx
<header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
  {/* Breadcrumb */}
  <nav className="flex items-center gap-1.5 text-[13px]">
    <span className="text-zinc-500">Dashboards</span>
    <span className="text-zinc-600">/</span>
    <span className="font-medium text-white">Default</span>
  </nav>

  {/* Right controls */}
  <div className="flex items-center gap-3">
    <div className="flex h-8 w-48 items-center gap-2 rounded-lg bg-white/[0.05] px-3">
      <Search className="h-3.5 w-3.5 text-zinc-500" />
      <input
        placeholder="Search"
        className="bg-transparent text-[12px] text-zinc-400 outline-none placeholder:text-zinc-600 w-full"
      />
    </div>
    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
      <Sun className="h-4 w-4" />
    </button>
    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
      <RotateCcw className="h-4 w-4" />
    </button>
    <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
      <Bell className="h-4 w-4" />
      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
    </button>
    <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.05]">
      <LayoutGrid className="h-4 w-4" />
    </button>
  </div>
</header>
```

---

## 4. Sidebar

```
┌─────────────────────┐
│  ⬡ Kestrel          │  (logo + name, h-14)
├─────────────────────┤
│  FAVORITES          │  section label (11px uppercase zinc-500)
│  ▣ Overview  ›      │  active — bg-white/10, white, emerald icon
│  ↗ Lend             │
│  ⬛ Borrow          │
├─────────────────────┤
│  RECENTLY           │
│  ▣ Overview         │
│  eCommerce          │
├─────────────────────┤
│  DASHBOARDS         │
│  ▣ Overview   (dot) │  active sub-item
│  eCommerce          │
│  Projects           │
├─────────────────────┤
│  PAGES              │
│  User Profile  ›    │
│  Account            │
│  Corporate          │
├─────────────────────┤
│  ────────────────   │  divider
│  [avatar] 0x1a…b4   │  connected wallet (bottom)
│  [Disconnect]       │
└─────────────────────┘
```

Active nav item:

```tsx
className = "bg-white/10 text-white rounded-lg px-2.5 py-2";
// icon: text-emerald-400
// trailing: <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-500" />
```

Inactive nav item:

```tsx
className =
  "text-zinc-400 hover:bg-white/5 hover:text-white rounded-lg px-2.5 py-2";
// icon: text-zinc-500
```

---

## 5. Stat Cards (Main Content, Row 1)

**Critical: These are LIGHT colored, NOT dark. Text is black.**

Card layout — 4 columns, `gap-[28px]`:

```
┌──────────────────────┐  ┌──────────────────────┐
│  Total Deposits       │  │  Active Loans         │
│                       │  │                       │
│  14,230 CTC      ↑8% │  │  9             ↑2%   │
│                       │  │                       │
│  [small sparkline]    │  │  [small sparkline]    │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  Total Borrowed       │  │  Avg. APR             │
│                       │  │                       │
│  8,741 CTC       ↓1% │  │  12.4%          →0%  │
│                       │  │                       │
└──────────────────────┘  └──────────────────────┘
```

Alternating colors: card 1,3 = blue tint; card 2,4 = purple tint.

```tsx
// components/StatCard.tsx (target)
interface StatCardProps {
  label: string;
  value: string;
  delta: string; // e.g. "+8%"
  deltaUp?: boolean;
  variant?: "blue" | "purple"; // controls bg color
}

<div
  className={cn(
    "rounded-[20px] p-6 flex flex-col gap-3",
    variant === "blue" ? "bg-[#e6f1fd]" : "bg-[#edeefc]",
  )}
>
  <p className="text-[14px] font-normal text-black/70">{label}</p>
  <div className="flex items-end justify-between">
    <span className="text-[24px] font-semibold leading-8 text-black">
      {value}
    </span>
    <span
      className={cn(
        "flex items-center gap-0.5 text-[12px] font-medium",
        deltaUp ? "text-emerald-600" : "text-red-500",
      )}
    >
      {deltaUp ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {delta}
    </span>
  </div>
</div>;
```

---

## 6. Charts (Main Content, Row 2+)

All chart containers share this base style:

```tsx
<div className="rounded-[20px] bg-white/[0.04] p-6">
  <h3 className="mb-4 text-[14px] font-semibold text-white">{title}</h3>
  {/* chart */}
</div>
```

### 6a. Reward History Chart (wide, ~662px)

Two-line area chart: **"This Period"** (solid line, `#7dbbff`) + **"Last Period"** (dashed line, `rgba(125,187,255,0.35)`).

```tsx
// components/charts/RewardHistoryChart.tsx
<ResponsiveContainer width="100%" height={200}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
    <XAxis
      dataKey="date"
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
      tickFormatter={(v) => `${v / 1000}K`}
    />
    <Tooltip
      contentStyle={{
        background: "#1e2028",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
      }}
    />
    <Line
      type="monotone"
      dataKey="thisMonth"
      name="This Period"
      stroke="#7dbbff"
      strokeWidth={2}
      dot={false}
    />
    <Line
      type="monotone"
      dataKey="lastMonth"
      name="Last Period"
      stroke="rgba(125,187,255,0.35)"
      strokeWidth={2}
      strokeDasharray="4 4"
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

### 6b. Traffic by Website (narrow, ~272px)

Horizontal pill multi-segment bars for top sites. Each row: label + segmented pill.

```tsx
const sites = [
  { name: "Google", value: 72, color: "#7dbbff" },
  { name: "YouTube", value: 55, color: "#b899eb" },
  { name: "Instagram", value: 48, color: "#6be6d3" },
  { name: "Pinterest", value: 32, color: "#71dd8c" },
  { name: "Facebook", value: 28, color: "#a0bce8" },
  { name: "Twitter", value: 20, color: "#7dbbff" },
];

// Each row:
<div className="flex items-center gap-3">
  <span className="w-20 text-[12px] text-zinc-400">{site.name}</span>
  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/10">
    <div
      style={{ width: `${site.value}%`, background: site.color }}
      className="h-full rounded-full"
    />
  </div>
  <span className="w-7 text-right text-[12px] text-zinc-400">
    {site.value}%
  </span>
</div>;
```

### 6c. Capital Allocation Chart (donut, ~400px)

Keep existing donut but update colors and add text legend below:

```tsx
// Legend below the donut
const segments = [
  { label: "Loaned", pct: "52.1%", color: "#7dbbff" },
  { label: "Available", pct: "22.8%", color: "#6be6d3" },
  { label: "Reserved", pct: "13.9%", color: "#b899eb" },
  { label: "Other", pct: "11.2%", color: "#71dd8c" },
];

// Legend row:
<div className="flex items-center gap-1.5">
  <div style={{ background: seg.color }} className="h-2.5 w-2.5 rounded-sm" />
  <span className="text-[12px] text-zinc-300">{seg.label}</span>
  <span className="ml-auto text-[12px] font-medium text-white">{seg.pct}</span>
</div>;
```

Donut cell colors: `["#7dbbff", "#6be6d3", "#b899eb", "#71dd8c"]`

### 6d. Traffic by Device Chart (vertical bars, ~400px)

```tsx
// NEW: components/charts/TrafficByDeviceChart.tsx
const devices = [
  { name: "Linux", value: 6200, fill: "#a0bce8" },
  { name: "Mac", value: 5100, fill: "#6be6d3" },
  { name: "iOS", value: 4800, fill: "#000000" },
  { name: "Windows", value: 7400, fill: "#7dbbff" },
  { name: "Android", value: 3200, fill: "#b899eb" },
  { name: "Other", value: 1800, fill: "#71dd8c" },
];

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={devices} barSize={24}>
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="rgba(255,255,255,0.06)"
      vertical={false}
    />
    <XAxis
      dataKey="name"
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
    />
    <YAxis
      tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
      axisLine={false}
      tickLine={false}
    />
    <Tooltip
      contentStyle={{
        background: "#1e2028",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
      }}
    />
    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
      {devices.map((d) => (
        <Cell key={d.name} fill={d.fill} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>;
```

---

## 7. Right Panel

**Background is WHITE (#ffffff), NOT dark. Border: `border-l border-black/10`.**

```
┌──────────────┐
│ Notifications│  (14px semibold, black)
├──────────────┤
│ [🟣] You fixed a bug.           Just now   │
│ [🔵] New user registered.      59 min ago  │
│ [🟣] Andi Lane subscribed.     Today       │
│ [🔵] New message received.     5 hrs ago   │
├──────────────┤
│ Activities   │  (14px semibold, black)
├──────────────┤
│ ┆ [avatar] Changed the style.      just now  │
│ ┆ [avatar] Released a new version. 59 min    │
│ ┆ [avatar] Submitted a bug.        12 hrs    │
│ ┆ [avatar] Modified data in...     Today     │
│ ┆ [avatar] Deleted a page...       Feb 2025  │
├──────────────┤
│ Contacts     │  (14px semibold, black)
├──────────────┤
│ [av] Natali Craig   │
│ [av] Drew Cano      │
│ [av] Andi Lane      │
│ [av] Koray Okumus   │
│ [av] Kate Morrison  │
│ [av] Melody Macy    │
└──────────────┘
```

```tsx
// components/DashboardRightPanel.tsx (target)
<aside className="hidden xl:flex h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-l border-black/10 bg-white">
  {/* Notifications */}
  <div className="p-5 border-b border-black/[0.06]">
    <h3 className="mb-3 text-[14px] font-semibold text-black">Notifications</h3>
    <div className="space-y-3">
      {notifications.map((n) => (
        <div key={n.id} className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              n.variant === "purple" ? "bg-[#edeefc]" : "bg-[#e6f1fd]",
            )}
          >
            <n.Icon className="h-4 w-4 text-black/60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-black leading-5">{n.text}</p>
            <p className="text-[11px] text-black/40">{n.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Activities */}
  <div className="p-5 border-b border-black/[0.06]">
    <h3 className="mb-3 text-[14px] font-semibold text-black">Activities</h3>
    <div className="relative space-y-4">
      {/* Vertical dashed line */}
      <div className="absolute left-3 top-0 bottom-0 w-px border-l border-dashed border-black/10" />
      {activities.map((a) => (
        <div key={a.id} className="relative flex items-start gap-3 pl-8">
          <div className="absolute left-0 h-6 w-6 overflow-hidden rounded-full bg-zinc-200 shrink-0">
            <Image
              src={a.avatar}
              alt={a.name}
              width={24}
              height={24}
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[13px] text-black leading-5">{a.action}</p>
            <p className="text-[11px] text-black/40">{a.time}</p>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Contacts */}
  <div className="p-5">
    <h3 className="mb-3 text-[14px] font-semibold text-black">Contacts</h3>
    <div className="space-y-3">
      {contacts.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <div className="h-7 w-7 overflow-hidden rounded-full bg-zinc-200 shrink-0">
            <Image
              src={c.avatar}
              alt={c.name}
              width={28}
              height={28}
              className="object-cover"
            />
          </div>
          <span className="text-[13px] text-black">{c.name}</span>
        </div>
      ))}
    </div>
  </div>
</aside>
```

Data constants for right panel:

```tsx
const notifications = [
  {
    id: 1,
    text: "You fixed a bug.",
    time: "Just now",
    variant: "purple",
    Icon: Bug,
  },
  {
    id: 2,
    text: "New user registered.",
    time: "59 min ago",
    variant: "blue",
    Icon: UserPlus,
  },
  {
    id: 3,
    text: "Andi Lane subscribed.",
    time: "Today",
    variant: "purple",
    Icon: Bell,
  },
  {
    id: 4,
    text: "New message received.",
    time: "5 hrs ago",
    variant: "blue",
    Icon: MessageCircle,
  },
];

const activities = [
  {
    id: 1,
    name: "Brooklyn Simmons",
    avatar: "/avatars/1.jpg",
    action: "Changed the style.",
    time: "Just now",
  },
  {
    id: 2,
    name: "Esther Howard",
    avatar: "/avatars/2.jpg",
    action: "Released a new version.",
    time: "59 min ago",
  },
  {
    id: 3,
    name: "Cameron Williamson",
    avatar: "/avatars/3.jpg",
    action: "Submitted a bug.",
    time: "12 hrs ago",
  },
  {
    id: 4,
    name: "Kristin Watson",
    avatar: "/avatars/4.jpg",
    action: "Modified A to Z data.",
    time: "Today",
  },
  {
    id: 5,
    name: "Ronald Richards",
    avatar: "/avatars/5.jpg",
    action: "Deleted a page.",
    time: "Feb 2025",
  },
];

const contacts = [
  { name: "Natali Craig", avatar: "/avatars/contact1.jpg" },
  { name: "Drew Cano", avatar: "/avatars/contact2.jpg" },
  { name: "Andi Lane", avatar: "/avatars/contact3.jpg" },
  { name: "Koray Okumus", avatar: "/avatars/contact4.jpg" },
  { name: "Kate Morrison", avatar: "/avatars/contact5.jpg" },
  { name: "Melody Macy", avatar: "/avatars/contact6.jpg" },
];
```

---

## 8. Page Header Row (Overview page)

```
Overview                                              [Today ▼]
```

```tsx
<div className="mb-6 flex items-center justify-between">
  <h1 className="text-[20px] font-semibold text-white">Overview</h1>
  <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] text-zinc-300 hover:bg-white/5">
    Today
    <ChevronDown className="h-3.5 w-3.5" />
  </button>
</div>
```

---

## 9. Page Layout — Overview (`app/dashboard/page.tsx` target)

```tsx
export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page title row */}
      <PageHeader />

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-2 gap-7 lg:grid-cols-4">
        <StatCard
          label="Total Deposits"
          value="14,230 CTC"
          delta="+8%"
          deltaUp
          variant="blue"
        />
        <StatCard
          label="Active Loans"
          value="9"
          delta="+2%"
          deltaUp
          variant="purple"
        />
        <StatCard
          label="Total Borrowed"
          value="8,741 CTC"
          delta="-1%"
          deltaUp={false}
          variant="blue"
        />
        <StatCard
          label="Avg. APR"
          value="12.4%"
          delta="0%"
          deltaUp
          variant="purple"
        />
      </div>

      {/* Row 2: Main chart + website traffic */}
      <div className="grid grid-cols-[1fr_auto] gap-5">
        <RewardHistoryChart /> {/* ~662px, flex-1 */}
        <TrafficByWebsiteChart /> {/* 272px fixed */}
      </div>

      {/* Row 3: Device chart + donut */}
      <div className="grid grid-cols-2 gap-5">
        <TrafficByDeviceChart />
        <CapitalAllocationChart />
      </div>
    </div>
  );
}
```

---

## 10. What Needs to Change — File-by-File Diff

| File                                           | Current                                        | Target                                                            |
| ---------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `app/dashboard/layout.tsx`                     | No top bar                                     | Add `<DashboardTopBar />`                                         |
| `app/dashboard/page.tsx`                       | Dark stat cards, live contract reads, 2 charts | Light stat cards, 4 chart types, mock/live data                   |
| `components/StatCard.tsx`                      | `bg-white/[0.04]` dark, white text             | `bg-[#e6f1fd]` or `bg-[#edeefc]`, **black text**, variant prop    |
| `components/DashboardSidebar.tsx`              | Single section, no tabs                        | Add "Recently" section, Dashboards/Pages sub-sections             |
| `components/DashboardRightPanel.tsx`           | Dark bg, emoji notifs, loan events             | **White bg**, icon-badge notifs, avatar activities, contacts list |
| `components/charts/RewardHistoryChart.tsx`     | AreaChart, single data                         | LineChart, two lines (this / last period), updated colors         |
| `components/charts/CapitalAllocationChart.tsx` | Donut, no legend                               | Donut + segment legend, updated colors                            |
| `components/DashboardTopBar.tsx`               | **Doesn't exist**                              | Create: breadcrumb + search + icon buttons                        |
| `components/charts/TrafficByDeviceChart.tsx`   | **Doesn't exist**                              | Create: vertical bar chart, 6 colored bars                        |
| `components/charts/TrafficByWebsiteChart.tsx`  | **Doesn't exist**                              | Create: horizontal pill bars                                      |

---

## 11. Asset Requirements

The right panel uses avatar images. Use placeholder URLs or place images in `public/avatars/`:

```
public/
  avatars/
    1.jpg  2.jpg  3.jpg  4.jpg  5.jpg   (activity feed)
    contact1.jpg … contact6.jpg          (contacts list)
```

Quick placeholder fallback (no images needed):

```tsx
// Instead of <Image>, use initials circle:
<div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-medium text-zinc-600">
  {name
    .split(" ")
    .map((w) => w[0])
    .join("")}
</div>
```

---

## 12. Figma Node IDs Reference

| Frame                          | Node ID       | Size        |
| ------------------------------ | ------------- | ----------- |
| Desktop overview (primary)     | `54869:11584` | 1440 × 1024 |
| Desktop overview (tall scroll) | `54869:6543`  | 1440 × 1708 |
| Mobile                         | `54869:8610`  | 393 × 1767  |

To re-fetch design context:

```
mcp_com_figma_mcp_get_design_context(fileKey="NG18MHF02rQYRxql9qG084", nodeId="54869:11584")
```

---

_Generated from Figma analysis — SnowUI Dashboard template, Kestrel customization._
