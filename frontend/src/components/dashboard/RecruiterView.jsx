import { lazy, Suspense } from "react";
import MetricCards from "./MetricCards";
import DashboardSection from "./DashboardSection";
import dashboardConfig from "./dashboardConfig.jsx";

const DashboardCharts = lazy(() => import("../DashboardCharts"));

/**
 * Enterprise Recruiter Dashboard View.
 * Renders sections based on configuration.
 */
const RecruiterView = ({ data, heatmapData, loading }) => {
  const config = dashboardConfig.recruiter;

  return (
    <>
      {config.sections.map((section) => {
        if (section.id === "metrics") {
          return (
            <MetricCards 
              key={section.id}
              metrics={data?.metrics} 
              getIcon={config.getIcon}
              loading={loading}
            />
          );
        }

        if (section.id === "charts") {
          return (
            <DashboardSection 
              key={section.id}
              loading={loading}
              errorMessage="Unable to load analytics charts."
            >
              <Suspense fallback={<div className="h-64 flex items-center justify-center">Loading charts...</div>}>
                <DashboardCharts 
                  data={{
                    analytics: data?.raw?.analytics,
                    funnel: data?.funnel,
                    velocity: data?.velocity,
                    rejectionAnalytics: data?.rejectionAnalytics,
                    companyPerformance: data?.companyPerformance,
                    locationInsights: data?.locationInsights,
                    sourcePerformance: data?.sourcePerformance,
                    pipelineAging: data?.pipelineAging,
                    heatmapRows: heatmapData?.rows,
                    heatmapMax: heatmapData?.max,
                    statusLabels: heatmapData?.labels
                  }} 
                />
              </Suspense>
            </DashboardSection>
          );
        }

        return null;
      })}
    </>
  );
};

export default RecruiterView;
