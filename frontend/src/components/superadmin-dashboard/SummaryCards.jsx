import { BriefcaseBusiness, ClipboardList, MessageSquareText, UserCheck, Users } from "lucide-react";
import Card from "../ui/Card";

const SummaryCards = ({ overview = {}, onNavigate }) => {
  const cards = [
    {
      title: "Candidates",
      value: overview.totalCandidates || 0,
      icon: <UserCheck size={18} className="text-slate-600" />,
      iconClassName: "bg-slate-100",
      navigation: { route: "/app/candidates" }
    },
    {
      title: "Requirements",
      value: overview.totalRequirements || 0,
      icon: <BriefcaseBusiness size={18} className="text-slate-600" />,
      iconClassName: "bg-slate-100",
      navigation: { route: "/app/requirements" }
    },
    {
      title: "Enquiries",
      value: overview.totalEnquiries || 0,
      icon: <MessageSquareText size={18} className="text-slate-700" />,
      iconClassName: "bg-slate-100",
      navigation: { route: "/app/enquiry" }
    },
    {
      title: "Users",
      value: overview.totalUsers || 0,
      icon: <Users size={18} className="text-slate-700" />,
      iconClassName: "bg-slate-100",
      navigation: { route: "/app/admin/users" }
    },
    {
      title: "Active Today",
      value: overview.activeToday || 0,
      icon: <ClipboardList size={18} className="text-slate-600" />,
      iconClassName: "bg-slate-100",
      navigation: { route: "/app/admin/users" }
    }
  ];

  return (
    <div className="dashboard-metrics-grid">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`dashboard-card dashboard-metric-card ${card.navigation ? "cursor-pointer" : ""}`.trim()}
          role={card.navigation ? "button" : undefined}
          tabIndex={card.navigation ? 0 : undefined}
          onClick={card.navigation ? () => onNavigate?.(card.navigation.route, card.navigation.params) : undefined}
          onKeyDown={card.navigation ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onNavigate?.(card.navigation.route, card.navigation.params);
            }
          } : undefined}
        >
          <div className="dashboard-metric-card__content">
            <div>
              <p className="dashboard-metric-card__label">{card.title}</p>
              <h3 className="dashboard-metric-card__value">{card.value}</h3>
            </div>
            <div className={`dashboard-metric-card__icon ${card.iconClassName}`}>{card.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default SummaryCards;
