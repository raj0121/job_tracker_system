import SummaryCards from "./superadmin-dashboard/SummaryCards";
import CandidatePipeline from "./superadmin-dashboard/CandidatePipeline";
import RequirementOverview from "./superadmin-dashboard/RequirementOverview";
import EnquiryInsights from "./superadmin-dashboard/EnquiryInsights";
import RecruiterPerformance from "./superadmin-dashboard/RecruiterPerformance";

const SuperAdminDashboardPanel = ({ adminStats, onNavigate }) => {
  const overview = adminStats?.overview || {};
  const candidates = adminStats?.candidates || {};
  const requirements = adminStats?.requirements || {};
  const enquiries = adminStats?.enquiries || {};
  const performance = adminStats?.performance || {};

  return (
    <div className="superadmin-dashboard">
      <SummaryCards overview={overview} onNavigate={onNavigate} />
      <div className="superadmin-dashboard-main">
        <div className="superadmin-dashboard-primary">
          <CandidatePipeline candidates={candidates} onNavigate={onNavigate} />
          <RequirementOverview requirements={requirements} onNavigate={onNavigate} />
        </div>
        <div className="superadmin-dashboard-secondary">
          <EnquiryInsights enquiries={enquiries} onNavigate={onNavigate} />
          <RecruiterPerformance performance={performance} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPanel;
