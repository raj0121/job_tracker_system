import Card from "../ui/Card";
import DashboardSection from "./DashboardSection";
import Skeleton from "../ui/Skeleton";

const MetricCardSkeleton = () => (
  <div className="metric-grid">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="metric-card section">
        <Skeleton className="h-6 w-24 mb-2" />
        <Skeleton className="h-10 w-16" />
      </Card>
    ))}
  </div>
);

const MetricCards = ({ metrics = [], getIcon, loading }) => {
  return (
    <DashboardSection 
      loading={loading} 
      fallback={<MetricCardSkeleton />}
    >
      <div className="metric-grid">
        {metrics.map((metric) => (
          <Card key={metric.title} className="metric-card section">
            <div className="page-header">
              <p className="metric-label">{metric.title}</p>
              <div>{getIcon?.(metric.type)}</div>
            </div>
            <h2 className="metric-value">{metric.value}</h2>
          </Card>
        ))}
      </div>
    </DashboardSection>
  );
};

export default MetricCards;
