import { Activity, AlertTriangle, Clock3 } from "lucide-react";
import Card from "../ui/Card";
import SectionHeader from "../ui/SectionHeader";

const SystemHealth = ({ system = {} }) => {
  const cards = [
    {
      title: "API Response Time",
      value: `${system.apiResponse || 0} ms`,
      icon: <Clock3 size={18} className="text-blue-600" />
    },
    {
      title: "Queue Pending",
      value: system.queuePending || 0,
      icon: <Activity size={18} className="text-amber-600" />
    },
    {
      title: "Error Count",
      value: system.errors || 0,
      icon: <AlertTriangle size={18} className="text-rose-600" />
    }
  ];

  return (
    <Card>
      <SectionHeader
        title="System Health"
        description="Keep monitoring lightweight and focused on the health indicators that matter operationally."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              {card.icon}
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default SystemHealth;
