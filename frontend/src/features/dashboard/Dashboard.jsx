import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Skeleton from "../../components/ui/Skeleton";
import Logo from "../../components/ui/Logo";
import useDashboardAnalytics from "../../hooks/useDashboardAnalytics";
import AdminView from "../../components/dashboard/AdminView";
import RecruiterView from "../../components/dashboard/RecruiterView";
import dashboardConfig from "../../components/dashboard/dashboardConfig.jsx";

const DashboardLoading = () => (
  <div className="dashboard-page">
    <div className="dashboard-shell">
      <div>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 mt-12" />
      </div>
      <div className="dashboard-metrics-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="dashboard-card dashboard-metric-card">
            <Skeleton className="h-10" />
            <Skeleton className="h-24 mt-12" />
          </Card>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Enterprise Dashboard Entry Point.
 * Orchestrates views, logic, and data flow.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    isSuperAdmin,
    loading,
    error,
    data,
    heatmapData
  } = useDashboardAnalytics();

  const config = isSuperAdmin ? dashboardConfig.admin : dashboardConfig.recruiter;

  const handleDashboardNavigate = (route, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.set(key, value);
      }
    });
    navigate(searchParams.toString() ? `${route}?${searchParams.toString()}` : route);
  };

  if (loading && !data) {
    return <DashboardLoading />;
  }

  if (error && !data) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <Card className="dashboard-card">
            <div className="page-header">
              <div className="page-branding">
                <Logo size="sm" framed className="page-brand-logo" />
                <div>
                  <h1 className="page-title">{isSuperAdmin ? "SuperAdmin ATS Dashboard" : "Recruiting Dashboard"}</h1>
                  <p className="page-description">
                    {error?.response?.data?.message || "Unable to load dashboard insights right now."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <Card className="dashboard-card">
          <div className="page-header">
            <div className="page-branding">
              <Logo size="sm" framed className="page-brand-logo" />
              <div>
                <h1 className="page-title">{config.title}</h1>
                <p className="page-description">
                  {config.description}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {isSuperAdmin ? (
          <AdminView 
            data={data} 
            loading={loading} 
            onNavigate={handleDashboardNavigate}
          />
        ) : (
          <RecruiterView 
            data={data} 
            heatmapData={heatmapData} 
            loading={loading} 
          />
        )}
      </div>
    </div>
  );
};


export default Dashboard;
