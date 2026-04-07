import SuperAdminDashboardPanel from "../SuperAdminDashboardPanel";
import DashboardSection from "./DashboardSection";
import dashboardConfig from "./dashboardConfig.jsx";

/**
 * Enterprise Admin Dashboard View.
 * Renders sections based on configuration.
 */
const AdminView = ({ data, loading, onNavigate }) => {
  const config = dashboardConfig.admin;

  return (
    <>
      {config.sections.map((section) => {
        if (section.id === "panel") {
          return (
            <DashboardSection 
              key={section.id}
              loading={loading}
              errorMessage="Unable to load Admin Panel."
            >
              <SuperAdminDashboardPanel 
                adminStats={data?.raw || {}} 
                onNavigate={onNavigate} 
              />
            </DashboardSection>
          );
        }

        return null;
      })}
    </>
  );
};

export default AdminView;
