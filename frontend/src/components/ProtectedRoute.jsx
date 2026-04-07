import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "./Layout";
import { getHomePathForRole, normalizeRole } from "../utils/roles";

const ProtectedRoute = ({
  allowedRoles = null,
  requiredPermissions = null,
  permission = null,
  layout: LayoutComponent = Layout
}) => {
  const { isAuthenticated, loading, user, hasPermission, permissionsLoading } = useAuth();

  if (loading || permissionsLoading) {
    return (
      <div className="loading-panel">
        <div className="loading-box">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const normalizedUserRole = normalizeRole(user?.role);
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.map((role) => normalizeRole(role))
    : [];

  if (normalizedAllowedRoles.length > 0 && !normalizedAllowedRoles.includes(normalizedUserRole)) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />;
  }

  const permissionsToCheck = permission
    ? [permission, ...(Array.isArray(requiredPermissions) ? requiredPermissions : [])]
    : requiredPermissions;

  if (permissionsToCheck && !hasPermission(permissionsToCheck)) {
    return <Navigate to={getHomePathForRole(user?.role)} replace />;
  }

  return (
    <LayoutComponent>
      <Outlet />
    </LayoutComponent>
  );
};

export default ProtectedRoute;

