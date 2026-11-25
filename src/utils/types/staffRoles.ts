export type Role =
  | "ceo"
  | "board_member"
  | "operation_manager"
  | "hr_manager"
  | "business_development"
  | "designer"
  | "video_editor"
  | "social_media_manager"
  | "content_writer"
  | "intern";

export type Permission =
  // dashboards (everyone also gets the standard staff dashboard)
  | "dashboard.admin" // board: read-only view of the admin dashboard
  | "dashboard.operations" // operations: team work counts
  | "dashboard.hr" // HR: staff, attendance, leave and payroll counts
  // attendance
  | "attendance.own"
  | "attendance.all"
  // tasks
  | "tasks.own"
  | "tasks.all"
  | "tasks.assign"
  | "tasks.feedback"
  // payroll
  | "payroll.manage"
  // modules (view = open the page and read, manage = add / edit / delete)
  | "clients.view"
  | "clients.manage"
  | "plans.view"
  | "plans.manage"
  | "works.view"
  | "works.manage"
  | "bills.view"
  | "bills.manage"
  | "accounts.view"
  | "accounts.manage"
  | "staff.view"
  | "staff.create"
  | "staff.manage";

export const ROLE_LABELS: Record<Role, string> = {
  ceo: "CEO",
  board_member: "Board Member",
  operation_manager: "Operation Manager",
  hr_manager: "HR Manager",
  business_development: "Business Development Executive",
  designer: "Designer",
  video_editor: "Video Editor",
  social_media_manager: "Social Media Manager",
  content_writer: "Content Writer",
  intern: "Intern",
};

export const ROLES = Object.keys(ROLE_LABELS) as Role[];

/** Basic staff access: own attendance and own work only */
export const BASIC_ACCESS: Permission[] = ["attendance.own", "tasks.own"];
const BASE = BASIC_ACCESS;

/** Board members: see the admin dashboard and every module, but can't change anything. No attendance (no check in, no attendance page). */
export const BOARD_ACCESS: Permission[] = [
  "dashboard.admin",
  "tasks.all",
  "clients.view",
  "plans.view",
  "works.view",
  "bills.view",
  "accounts.view",
  "staff.view",
];


/** CEO: full access to every module and the admin dashboard. No attendance (no check in). */
export const CEO_ACCESS: Permission[] = [
  "dashboard.admin",
  "tasks.all",
  "tasks.assign",
  "tasks.feedback",
  "payroll.manage",
  "clients.view",
  "clients.manage",
  "plans.view",
  "plans.manage",
  "works.view",
  "works.manage",
  "bills.view",
  "bills.manage",
  "accounts.view",
  "accounts.manage",
  "staff.view",
  "staff.create",
  "staff.manage",
];

/* ───────────── role defaults (edit these to taste) ───────────── */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ceo: CEO_ACCESS,
  board_member: BOARD_ACCESS,

  intern: BASE,
  designer: [...BASE, "works.view"],
  video_editor: [...BASE, "works.view"],
  social_media_manager: [...BASE, "works.view"],
  content_writer: [...BASE, "works.view"],

  business_development: [
    ...BASE,
    "tasks.feedback",
    "clients.view",
    "plans.view",
  ],

  operation_manager: [
    ...BASE,
    "dashboard.operations",
    "attendance.all",
    "tasks.all",
    "tasks.assign",
    "tasks.feedback",
    "clients.view",
    "plans.view",
    "works.view",
  ],

  hr_manager: [
    ...BASE,
    "dashboard.hr",
    "attendance.all",
    "tasks.all",
    "payroll.manage",
    "staff.view",
    "staff.create",
  ],
};

export const can = (role: Role | undefined, permission: Permission) =>
  !!role && ROLE_PERMISSIONS[role]?.includes(permission);

/* ───────────── labels + groups (used by the Add / Edit staff form) ───────────── */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.admin": "Board dashboard (admin overview, view only)",
  "dashboard.operations": "Operations dashboard (team work counts)",
  "dashboard.hr": "HR dashboard (staff, attendance, leave, payroll counts)",
  "attendance.own": "Mark & view own attendance",
  "attendance.all": "View all staff attendance",
  "tasks.own": "See & update own work",
  "tasks.all": "View all work tracking / reports",
  "tasks.assign": "Create & assign tasks",
  "tasks.feedback": "Add feedback on work",
  "payroll.manage": "Payroll management",
  "clients.view": "View clients",
  "clients.manage": "Add / edit / delete clients",
  "plans.view": "View client plans",
  "plans.manage": "Create / edit / pause plans & invoices",
  "works.view": "View works",
  "works.manage": "Upload / delete works",
  "bills.view": "View bills",
  "bills.manage": "Add / edit bills",
  "accounts.view": "View accounts & cash book",
  "accounts.manage": "Add / edit transactions",
  "staff.view": "View staff list",
  "staff.create": "Add new staff",
  "staff.manage": "Edit / delete staff & change their access",
};

/** The dashboards you can switch on for a person (shown as cards in the Add / Edit staff form) */
export const DASHBOARD_OPTIONS: { perm: Permission; title: string; desc: string }[] = [
  {
    perm: "dashboard.operations",
    title: "Operations dashboard",
    desc: "Team work counts: how much is in each status, and who has what.",
  },
  {
    perm: "dashboard.hr",
    title: "HR dashboard",
    desc: "Staff, attendance, leave and payroll counts.",
  },
  {
    perm: "dashboard.admin",
    title: "Board dashboard",
    desc: "The admin overview, view only.",
  },
];

export const PERMISSION_GROUPS: { id: string; label: string; items: Permission[] }[] = [
  {
    id: "dashboards",
    label: "Dashboards",
    items: ["dashboard.admin", "dashboard.operations", "dashboard.hr"],
  },
  { id: "attendance", label: "Attendance", items: ["attendance.own", "attendance.all"] },
  { id: "tasks", label: "Tasks & work tracking", items: ["tasks.own", "tasks.all", "tasks.assign", "tasks.feedback"] },
  { id: "clients", label: "Client management", items: ["clients.view", "clients.manage"] },
  { id: "plans", label: "Plan management", items: ["plans.view", "plans.manage"] },
  { id: "works", label: "Work management", items: ["works.view", "works.manage"] },
  { id: "bills", label: "Bills management", items: ["bills.view", "bills.manage"] },
  { id: "accounts", label: "Accounts & transactions", items: ["accounts.view", "accounts.manage"] },
  { id: "payroll", label: "Payroll", items: ["payroll.manage"] },
  { id: "staff", label: "Staff management", items: ["staff.view", "staff.create", "staff.manage"] },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items);

/** "manage" needs "view": ticking manage also ticks view, unticking view also unticks manage */
const REQUIRES: Partial<Record<Permission, Permission>> = {
  "clients.manage": "clients.view",
  "plans.manage": "plans.view",
  "works.manage": "works.view",
  "bills.manage": "bills.view",
  "accounts.manage": "accounts.view",
  "staff.create": "staff.view",
  "staff.manage": "staff.view",
};

export const togglePermission = (list: Permission[], p: Permission): Permission[] => {
  if (list.includes(p)) {
    return list.filter((x) => x !== p && REQUIRES[x] !== p);
  }
  const need = REQUIRES[p];
  const next = [...list, p];
  if (need && !next.includes(need)) next.push(need);
  return next;
};

/** Group a permission list by module, for compact badges in tables */
export const summarizeAccess = (list: Permission[]) =>
  PERMISSION_GROUPS.map((g) => {
    const on = g.items.filter((i) => list.includes(i));
    return { id: g.id, label: g.label, on, total: g.items.length };
  }).filter((x) => x.on.length > 0);

/** Custom permissions win; otherwise fall back to the role defaults */
export const permissionsFor = (
  role?: Role,
  custom?: Permission[] | null
): Permission[] => custom ?? (role ? ROLE_PERMISSIONS[role] ?? [] : []);

export const hasPermission = (
  staff: { role?: Role; permissions?: Permission[] | null } | null | undefined,
  permission: Permission
) =>
  !!staff &&
  permissionsFor(staff.role, staff.permissions).includes(permission);