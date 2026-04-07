import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

const RequirementOverview = ({ requirements = {}, onNavigate }) => {
  const requirementCards = [
    { title: "Open", value: requirements.open || 0, params: { status: "open" } },
    { title: "Urgent", value: requirements.urgent || 0, params: { priority: "urgent" } }
  ];

  return (
    <Card className="dashboard-card">
      <SectionHeader
        title="Requirements"
        description="Open roles that need attention."
        action={(
          <Button variant="secondary" onClick={() => onNavigate?.("/app/requirements")}>
            View All
          </Button>
        )}
      />

      <div className="dashboard-stat-grid dashboard-stat-grid--two">
        {requirementCards.map((item) => (
          <div
            key={item.title}
            className="dashboard-stat-card cursor-pointer"
            onClick={() => onNavigate?.("/app/requirements", item.params)}
          >
            <p className="dashboard-stat-card__label">{item.title}</p>
            <p className="dashboard-stat-card__value">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RequirementOverview;
