import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  MessageCircleQuestion,
  Settings,
  UserCircle2,
  Users,
} from "lucide-react";

export const DEFAULT_MENU = [
  { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
  {
    name: "Masters",
    icon: Settings,
    children: [
      { name: "Departments", path: "/app/admin/masters/departments", permission: "masters:read:any" },
      { name: "Designations", path: "/app/admin/masters/designations", permission: "masters:read:any" },
      { name: "Employees", path: "/app/admin/masters/employees", permission: "masters:read:any" },
      { name: "Roles", path: "/app/admin/masters/roles", permission: "masters:read:any" },
      { name: "Locations", path: "/app/admin/masters/locations", permission: "masters:read:any" },
      { name: "Skills", path: "/app/admin/masters/skills", permission: "masters:read:any" },
      { name: "Sources", path: "/app/admin/masters/sources", permission: "masters:read:any" }
    ]
  },
  { name: "Reports", path: "/app/reports", icon: BarChart3, permission: "reports:read:any" },
  { name: "Manage Candidates", path: "/app/candidates", icon: Users, permission: "candidates:read:any" },
  { name: "Manage Enquiry", path: "/app/enquiry", icon: MessageCircleQuestion, permission: "enquiries:read:any" },
  { name: "Manage Requirements", path: "/app/requirements", icon: ClipboardCheck, permission: "requirements:read:any" },
  { name: "Profile", path: "/profile", icon: UserCircle2 }
];

export const MENU_BY_ROLE = {
  default: DEFAULT_MENU
};
