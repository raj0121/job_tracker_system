import { Activity, BriefcaseBusiness, Clock3, Target, TrendingUp, Users } from "lucide-react";

export const dashboardConfig = {
  admin: {
    title: "SuperAdmin Dashboard",
    description: "Key ATS activity at a glance.",
    sections: [
      {
        id: "panel",
        type: "admin-panel",
        component: "SuperAdminDashboardPanel",
      },
    ],
    getIcon: (type) => ({
      users: <Users size={20} color="#2563eb" />,
      candidates: <BriefcaseBusiness size={20} color="#0f172a" />,
      requirements: <TrendingUp size={20} color="#16a34a" />,
      enquiries: <Activity size={20} color="#f59e0b" />,
      activeUsers: <Users size={20} color="#2563eb" />,
    }[type] || <Activity size={20} />)
  },
  recruiter: {
    title: "Recruiting Dashboard",
    description: "Candidate flow, interview velocity, conversion, and sourcing performance in one control panel.",
    sections: [
      {
        id: "metrics",
        type: "metric-grid",
        component: "MetricCards",
      },
      {
        id: "charts",
        type: "charts",
        component: "DashboardCharts",
      },
    ],
    getIcon: (type) => ({
      candidates: <BriefcaseBusiness size={20} color="#2563eb" />,
      conversion: <TrendingUp size={20} color="#16a34a" />,
      target: <Target size={20} color="#0f172a" />,
      time: <Clock3 size={20} color="#f59e0b" />,
      velocity: <TrendingUp size={20} color="#2563eb" />,
      trend: <TrendingUp size={20} color="#16a34a" />,
      health: <Target size={20} color="#0f172a" />,
    }[type] || <TrendingUp size={20} />)
  }
};

export default dashboardConfig;
