import type { NavItem, Role } from "@/types";

const comingSoon = [
  "Rooms",
  "Medical",
  "Feedback",
  "Reports",
  "Settings",
];

const adminItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", enabled: true },
  { label: "User Access", href: "/admin/users", enabled: true },
  { label: "Hostels", href: "/admin/hostels", enabled: true },
  { label: "Students", href: "/admin/students", enabled: true },
  { label: "Wardens", href: "/admin/wardens", enabled: true },
  { label: "Leaves", href: "/admin/leaves", enabled: true },
  { label: "Permissions", href: "/admin/permissions", enabled: true },
  { label: "Visitors", href: "/admin/visitors", enabled: true },
  { label: "Maintenance", href: "/admin/maintenance", enabled: true },
  { label: "Complaints", href: "/admin/complaints", enabled: true },
  { label: "Fees", href: "/admin/fees", enabled: true },
  { label: "Electricity", href: "/admin/electricity", enabled: true },
  { label: "Mess", href: "/admin/mess", enabled: true },
  { label: "Attendance", href: "/admin/attendance", enabled: true },
  { label: "Requests", href: "/admin/requests", enabled: true },
  { label: "Transfer Requests", href: "/admin/transfer-requests", enabled: true },
  { label: "Notices", href: "/admin/notices", enabled: true },
  { label: "Audit Logs", href: "/admin/audit-logs", enabled: true },
];

const wardenItems: NavItem[] = [
  { label: "Dashboard", href: "/warden/dashboard", enabled: true },
  { label: "Students", href: "/warden/students", enabled: true },
  { label: "Leaves", href: "/warden/leaves", enabled: true },
  { label: "Permissions", href: "/warden/permissions", enabled: true },
  { label: "Visitors", href: "/warden/visitors", enabled: true },
  { label: "Maintenance", href: "/warden/maintenance", enabled: true },
  { label: "Complaints", href: "/warden/complaints", enabled: true },
  { label: "Electricity", href: "/warden/electricity", enabled: true },
  { label: "Mess", href: "/warden/mess", enabled: true },
  { label: "Attendance", href: "/warden/attendance", enabled: true },
  { label: "Requests", href: "/warden/requests", enabled: true },
  { label: "Transfer Requests", href: "/warden/transfer-requests", enabled: true },
  { label: "Allocations", href: "/warden/allocations", enabled: true },
  { label: "Notices", href: "/notices", enabled: true },
];

const studentItems: NavItem[] = [
  { label: "Dashboard", href: "/student/dashboard", enabled: true },
  { label: "Profile", href: "/student/profile", enabled: true },
  { label: "Leaves", href: "/student/leaves", enabled: true },
  { label: "Permissions", href: "/student/permissions", enabled: true },
  { label: "Visitors", href: "/student/visitors", enabled: true },
  { label: "Maintenance", href: "/student/maintenance", enabled: true },
  { label: "Complaints", href: "/student/complaints", enabled: true },
  { label: "Fees", href: "/student/fees", enabled: true },
  { label: "Electricity", href: "/student/electricity", enabled: true },
  { label: "Mess", href: "/student/mess", enabled: true },
  { label: "Attendance", href: "/student/attendance", enabled: true },
  { label: "Requests", href: "/student/requests", enabled: true },
  { label: "Transfer Request", href: "/student/transfer-request", enabled: true },
  { label: "Notices", href: "/notices", enabled: true },
];

export function navigationFor(role: Role): NavItem[] {
  let activeItems: NavItem[] = [];
  if (role === "ADMIN") {
    activeItems = adminItems;
  } else if (role === "WARDEN") {
    activeItems = wardenItems;
  } else if (role === "STUDENT") {
    activeItems = studentItems;
  }

  const activeLabels = new Set(activeItems.map((item) => item.label.toLowerCase()));
  const disabledItems: NavItem[] = comingSoon
    .filter((label) => !activeLabels.has(label.toLowerCase()))
    .map((label) => ({
      label,
      href: `/${role.toLowerCase()}/${label.toLowerCase()}`,
      enabled: false,
    }));

  return [...activeItems, ...disabledItems];
}
