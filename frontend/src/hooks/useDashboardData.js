import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api, { extractData } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { isSuperAdminRole } from "../utils/roles";

const defaultStats = {
  Applied: 0,
  Screening: 0,
  Interviewing: 0,
  "Technical Test": 0,
  "Final Round": 0,
  Rejected: 0,
  Offer: 0,
  Hired: 0
};

const defaultRecruiterStats = {
  stats: defaultStats,
  analytics: {},
  funnelData: [],
  velocityData: []
};

export const useDashboardData = () => {
  const { user } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const recruiterEnabled = Boolean(user && !isSuperAdmin);

  const adminQuery = useQuery({
    queryKey: ["dashboard", "admin"],
    queryFn: () => api.get("/admin/dashboard-stats").then(extractData),
    enabled: isSuperAdmin,
    staleTime: 60 * 1000
  });

  const statsQuery = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => api.get("/jobs/stats").then(extractData),
    enabled: recruiterEnabled,
    keepPreviousData: true,
    staleTime: 60 * 1000
  });

  const analyticsQuery = useQuery({
    queryKey: ["dashboard", "analytics", 6],
    queryFn: () => api.get("/jobs/analytics", { params: { months: 6 } }).then(extractData),
    enabled: recruiterEnabled,
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000
  });

  const stats = useMemo(() => statsQuery.data || defaultStats, [statsQuery.data]);
  const analytics = useMemo(() => analyticsQuery.data || {}, [analyticsQuery.data]);
  const adminStats = adminQuery.data || null;

  const funnelData = useMemo(() => {
    const funnel = analytics.funnel || {};

    return [
      { stage: "Applied", value: funnel.applied || 0 },
      { stage: "Interviewed", value: funnel.interviewed || 0 },
      { stage: "Offers", value: funnel.offers || 0 },
      { stage: "Hired", value: funnel.hired || 0 }
    ];
  }, [analytics]);

  const velocityData = useMemo(
    () => (analytics.applicationVelocity || []).map((item) => ({
      ...item,
      week: `W${String(item.week).slice(-2)}`
    })),
    [analytics]
  );

  const recruiterStats = useMemo(
    () => ({
      stats,
      analytics,
      funnelData,
      velocityData
    }),
    [stats, analytics, funnelData, velocityData]
  );

  const loading = isSuperAdmin
    ? adminQuery.isLoading
    : statsQuery.isLoading || analyticsQuery.isLoading;

  const error = isSuperAdmin
    ? adminQuery.error || null
    : statsQuery.error || analyticsQuery.error || null;

  return {
    isSuperAdmin,
    loading,
    error,
    adminStats,
    recruiterStats: recruiterEnabled ? recruiterStats : defaultRecruiterStats
  };
};

export default useDashboardData;
