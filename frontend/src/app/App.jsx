import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import { normalizeRole } from "../utils/roles";
import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import Dashboard from "../features/dashboard/Dashboard";
import BillingPortalPage from "../pages/billing/PortalPage";
import ProfilePage from "../pages/profile/ProfilePage";
import Companies from "../features/companies/Companies";
import Reports from "../features/reports/Reports";
import SuperAdminLayout from "../layouts/SuperAdminLayout";
import SuperAdminUsers from "../pages/platform/masters/Users";
import MasterManagement from "../pages/platform/masters/MasterManagement";
import Departments from "../pages/platform/masters/Departments";
import Designations from "../pages/platform/masters/Designations";
import Employees from "../pages/platform/masters/Employees";
import EnquiryListPage from "../pages/platform/enquiry/EnquiryListPage";
import CreateEnquiryPage from "../pages/platform/enquiry/CreateEnquiryPage";
import EditEnquiryPage from "../pages/platform/enquiry/EditEnquiryPage";
import RequirementsListPage from "../pages/platform/requirements/RequirementsListPage";
import CreateRequirementPage from "../pages/platform/requirements/CreateRequirementPage";
import EditRequirementPage from "../pages/platform/requirements/EditRequirementPage";
import PlatformCandidates from "../pages/platform/candidates/Candidates";
import AddCandidate from "../pages/platform/candidates/AddCandidate";
import QueryAuthGate from "./QueryAuthGate";
import ToastProvider from "../components/ui/ToastProvider";
import SimpleMasterPage from "../components/master/SimpleMasterPage";

const HomeRedirect = () => {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
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

  const normalizedRole = normalizeRole(user?.role);

  if (normalizedRole === "superadmin") {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (normalizedRole === "recruiter") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

const LegacyMasterRedirect = () => {
  const { type } = useParams();
  return <Navigate to={`/app/admin/masters/${type || "departments"}`} replace />;
};

const LegacyEnquiryEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/enquiry/edit/${id}`} replace />;
};

const LegacyRequirementEditRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/app/requirements/edit/${id}`} replace />;
};

const legacyAppRedirects = [
  { path: "/platform", to: "/app/dashboard" },
  { path: "/platform/dashboard", to: "/app/dashboard" },
  { path: "/platform/users", to: "/app/admin/users" },
  { path: "/platform/masters", to: "/app/admin/masters/departments" },
  { path: "/platform/masters/departments", to: "/app/admin/masters/departments" },
  { path: "/platform/masters/designations", to: "/app/admin/masters/designations" },
  { path: "/platform/masters/employees", to: "/app/admin/masters/employees" },
  { path: "/platform/masters/locations", to: "/app/admin/masters/locations" },
  { path: "/platform/masters/skills", to: "/app/admin/masters/skills" },
  { path: "/platform/masters/sources", to: "/app/admin/masters/sources" },
  { path: "/platform/masters/roles", to: "/app/admin/masters/roles" },
  { path: "/platform/masters/permissions", to: "/app/admin/masters/permissions" },
  { path: "/platform/enquiry", to: "/app/enquiry" },
  { path: "/platform/enquiry/create", to: "/app/enquiry/create" },
  { path: "/platform/requirements", to: "/app/requirements" },
  { path: "/platform/requirements/create", to: "/app/requirements/create" },
  { path: "/platform/candidates", to: "/app/candidates" },
  { path: "/platform/candidates/add", to: "/app/candidates/create" },
  { path: "/platform/candidates/create", to: "/app/candidates/create" },
  { path: "/platform/candidates/list", to: "/app/candidates" },
  { path: "/recruiter", to: "/app/dashboard" },
  { path: "/recruiter/dashboard", to: "/app/dashboard" },
  { path: "/recruiter/companies", to: "/app/companies" },
  { path: "/recruiter/reports", to: "/app/reports" },
  { path: "/recruiter/profile", to: "/profile" },
  { path: "/app/candidates/manage", to: "/app/candidates" },
  { path: "/app/candidates/list", to: "/app/candidates" },
  { path: "/app/candidates/add", to: "/app/candidates/create" }
];

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryAuthGate>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route element={<ProtectedRoute />}>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/billing/portal" element={<BillingPortalPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/app/dashboard" element={<Dashboard />} />
                <Route path="/app/companies" element={<Companies />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["reports:read:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/reports" element={<Reports />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["candidates:read:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/candidates" element={<PlatformCandidates />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["enquiries:read:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/enquiry" element={<EnquiryListPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["requirements:read:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/requirements" element={<RequirementsListPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["candidates:write:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/candidates/create" element={<AddCandidate />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["enquiries:write:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/enquiry/create" element={<CreateEnquiryPage />} />
                <Route path="/app/enquiry/edit/:id" element={<EditEnquiryPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["requirements:write:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/requirements/create" element={<CreateRequirementPage />} />
                <Route path="/app/requirements/edit/:id" element={<EditRequirementPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin"]}
                    requiredPermissions={["analytics:read:any"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                <Route path="/app/admin/users" element={<SuperAdminUsers />} />
              </Route>

              <Route
                element={(
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    requiredPermissions={["masters:read:any"]}
                    layout={SuperAdminLayout}
                  />
                )}
              >
                <Route path="/app/admin" element={<Navigate to="/app/admin/masters/departments" replace />} />
                <Route path="/app/admin/masters" element={<Navigate to="/app/admin/masters/departments" replace />} />
                <Route path="/app/admin/masters/departments" element={<Departments />} />
                <Route path="/app/admin/masters/designations" element={<Designations />} />
                <Route path="/app/admin/masters/employees" element={<Employees />} />
                <Route
                  path="/app/admin/masters/locations"
                  element={(
                    <SimpleMasterPage
                      title="Locations"
                      description="Manage office branches and hiring locations."
                      endpoint="/masters/locations"
                      queryKey={["masters", "locations"]}
                    />
                  )}
                />
                <Route
                  path="/app/admin/masters/skills"
                  element={(
                    <SimpleMasterPage
                      title="Skills"
                      description="Manage the reusable tech stack and skill library."
                      endpoint="/masters/skills"
                      queryKey={["masters", "skills"]}
                    />
                  )}
                />
                <Route
                  path="/app/admin/masters/sources"
                  element={(
                    <SimpleMasterPage
                      title="Sources"
                      description="Manage reusable candidate source values."
                      endpoint="/masters/sources"
                      queryKey={["masters", "sources"]}
                    />
                  )}
                />
                <Route path="/app/admin/masters/roles" element={<MasterManagement forcedType="roles" />} />
                <Route path="/app/admin/masters/permissions" element={<MasterManagement forcedType="permissions" />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={["superadmin", "admin", "hr", "recruiter"]}
                    layout={SuperAdminLayout}
                  />
                }
              >
                {legacyAppRedirects.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={<Navigate to={route.to} replace />}
                  />
                ))}
                <Route path="/platform/masters/:type" element={<LegacyMasterRedirect />} />
                <Route path="/platform/enquiry/edit/:id" element={<LegacyEnquiryEditRedirect />} />
                <Route path="/platform/requirements/edit/:id" element={<LegacyRequirementEditRedirect />} />
              </Route>

              <Route path="/" element={<HomeRedirect />} />
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </ToastProvider>
        </QueryAuthGate>
      </AuthProvider>
    </Router>
  );
}

export default App;
