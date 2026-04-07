import { useMemo } from "react";
import useDashboardData from "./useDashboardData";
import { normalizeDashboardData } from "../utils/dashboardUtils";

export const useDashboardAnalytics = () => {
  const {
    isSuperAdmin,
    loading,
    error,
    adminStats,
    recruiterStats
  } = useDashboardData();

  // Preparation for filtering (can be extended to filter data based on filters object)
  const memoizedData = useMemo(() => {
    if (isSuperAdmin) {
      return normalizeDashboardData(adminStats, "admin");
    }
    return normalizeDashboardData(recruiterStats, "recruiter");
  }, [isSuperAdmin, adminStats, recruiterStats]);

  // Handle heatmap processing
  const heatmapData = useMemo(() => {
    if (!memoizedData?.heatmap || memoizedData.heatmap.length === 0) return { rows: [], max: 1, labels: [] };

    const rows = memoizedData.heatmap;
    const labels = [...new Set(rows.map((item) => item.status))];
    const days = [...new Set(rows.map((item) => item.day))].slice(-14);
    
    const byDayStatus = rows.reduce((acc, item) => {
      acc[`${item.day}:${item.status}`] = Number(item.count || 0);
      return acc;
    }, {});

    const heatmapRows = days.map((day) => {
      const item = { day };
      labels.forEach((status) => {
        item[status] = byDayStatus[`${day}:${status}`] || 0;
      });
      return item;
    });

    const values = rows.map((item) => Number(item.count || 0));
    const heatmapMax = Math.max(1, ...values);

    return { rows: heatmapRows, max: heatmapMax, labels };
  }, [memoizedData]);

  // Pipeline velocity logic
  const latestVelocity = useMemo(() => {
    const velocity = memoizedData?.velocity || [];
    return velocity.length ? velocity[velocity.length - 1].count : 0;
  }, [memoizedData]);

  return {
    isSuperAdmin,
    loading,
    error,
    data: memoizedData,
    heatmapData,
    latestVelocity
  };
};

export default useDashboardAnalytics;
