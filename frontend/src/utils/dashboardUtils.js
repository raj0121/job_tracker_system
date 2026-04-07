/**
 * Normalizes dashboard data to decouple UI from backend structure.
 * Ensures consistent field names and provides default values.
 */
export const normalizeDashboardData = (data, type = "admin") => {
  if (!data) return null;

  if (type === "admin") {
    const overview = data.overview || {};
    return {
      metrics: [
        { title: "Total Users", value: overview.totalUsers || 0, type: "users" },
        { title: "Total Candidates", value: overview.totalCandidates || 0, type: "candidates" },
        { title: "Total Requirements", value: overview.totalRequirements || 0, type: "requirements" },
        { title: "Total Enquiries", value: overview.totalEnquiries || 0, type: "enquiries" },
        { title: "Active Users Today", value: overview.activeToday || 0, type: "activeUsers" },
      ],
      raw: data,
    };
  }

  // Recruiter normalization
  const stats = data.stats || {};
  const analytics = data.analytics || {};
  const funnel = analytics.funnel || {};
  const timeMetrics = analytics.timeMetrics || {};
  const summary = analytics.summary || {};
  const monthlyTrend = analytics.monthlyTrend || {};

  return {
    metrics: [
      { 
        title: "Total Candidates", 
        value: Object.values(stats).reduce((sum, count) => sum + Number(count || 0), 0),
        type: "candidates"
      },
      { 
        title: "Interview Conversion", 
        value: `${funnel.applicationToInterviewRate || 0}%`,
        type: "conversion"
      },
      { 
        title: "Offer Conversion", 
        value: `${funnel.offerConversionRatio || 0}%`,
        type: "conversion"
      },
      { 
        title: "Time to Interview", 
        value: `${timeMetrics.avgDaysToInterview || 0} d`,
        type: "time"
      },
      { 
        title: "Time to Offer", 
        value: `${timeMetrics.avgDaysToOffer || 0} d`,
        type: "time"
      },
      { 
        title: "Pipeline Health", 
        value: `${summary.conversionHealthScore || 0}`,
        type: "health"
      },
      { 
        title: "MoM Pipeline Trend", 
        value: `${monthlyTrend.changePercent || 0}%`,
        type: "trend",
        trend: (monthlyTrend.changePercent || 0) >= 0 ? "up" : "down"
      },
    ],
    funnel: [
      { stage: "Applied", value: funnel.applied || 0 },
      { stage: "Interviewed", value: funnel.interviewed || 0 },
      { stage: "Offers", value: funnel.offers || 0 },
      { stage: "Hired", value: funnel.hired || 0 }
    ],
    velocity: (analytics.applicationVelocity || []).map((item) => ({
      ...item,
      week: `W${String(item.week).slice(-2)}`
    })),
    rejectionAnalytics: analytics.rejectionAnalytics || [],
    companyPerformance: (analytics.companyPerformance || []).slice(0, 8),
    locationInsights: (analytics.locationInsights || []).slice(0, 8),
    sourcePerformance: (analytics.sourcePerformance || []).slice(0, 8),
    pipelineAging: [
      { bucket: "0-7d", count: Number(analytics.pipelineAging?.age0To7Days || 0) },
      { bucket: "8-21d", count: Number(analytics.pipelineAging?.age8To21Days || 0) },
      { bucket: "22-45d", count: Number(analytics.pipelineAging?.age22To45Days || 0) },
      { bucket: "46d+", count: Number(analytics.pipelineAging?.age46PlusDays || 0) }
    ],
    heatmap: analytics.statusHeatmap || [],
    raw: data,
  };
};
