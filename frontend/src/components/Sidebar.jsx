import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { MENU_BY_ROLE } from "../config/sidebarMenu";
import Logo from "./ui/Logo";
import { normalizeRole } from "../utils/roles";

const Sidebar = () => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const normalizedRole = normalizeRole(user?.role);

  const filterMenuItems = (items) =>
    items.reduce((acc, item) => {
      if (item.permission && !hasPermission(item.permission)) {
        return acc;
      }

      if (item.children?.length) {
        const filteredChildren = filterMenuItems(item.children);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
          return acc;
        }

        if (item.path) {
          const rest = { ...item };
          delete rest.children;
          acc.push(rest);
        }

        return acc;
      }

      acc.push(item);
      return acc;
    }, []);

  const baseMenu = MENU_BY_ROLE[normalizedRole] || MENU_BY_ROLE.default || [];
  const menuItems = filterMenuItems(baseMenu);

  return (
    <aside className="layout-sidebar">
      <div className="sidebar-brand-block">
        <div className="sidebar-subtitle">Organization</div>
        <Logo size="md" framed className="sidebar-brand-logo" />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          if (item.children) {
            const hasActiveChild = item.children.some((child) => location.pathname === child.path);
            const isExpanded = expandedMenus[item.name] ?? hasActiveChild;
            const Icon = item.icon;

            return (
              <div key={item.name} className="nav-group">
                <button
                  type="button"
                  onClick={() => toggleMenu(item.name)}
                  className={`nav-link ${hasActiveChild ? "is-active" : ""}`.trim()}
                >
                  {Icon ? <Icon size={16} /> : null}
                  <span className="flex-grow-1">{item.name}</span>
                  <ChevronDown size={16} className={isExpanded ? "rotated" : ""} />
                </button>

                {isExpanded && (
                  <div className="nav-group-children">
                    {item.children
                      .filter((child) => !child.permission || hasPermission(child.permission))
                      .map((child) => {
                        const isChildActive = location.pathname === child.path;

                        return (
                          <Link
                            key={child.name}
                            to={child.path}
                            className={`nav-link ${isChildActive ? "is-active" : ""}`.trim()}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link key={item.name} to={item.path} className={`nav-link ${isActive ? "is-active" : ""}`.trim()}>
              {Icon ? <Icon size={16} /> : null}
              {item.name}
            </Link>
          );
        })}
      </nav>

      
      <div className="status-box">
        <div className="card-title sidebar-user-name">{user?.name}</div>
        <div className="card-subtitle mt-12">{normalizedRole}</div>
        <button type="button" className="btn-secondary" onClick={logout}>
          <LogOut size={14} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
