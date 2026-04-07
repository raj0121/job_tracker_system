import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { MapPin } from "lucide-react";

const DashboardCharts = ({ data = {} }) => {
  const {
    analytics = {},
    funnel = [],
    velocity = [],
    rejectionAnalytics = [],
    companyPerformance = [],
    locationInsights = [],
    sourcePerformance = [],
    pipelineAging = [],
    heatmapRows = [],
    heatmapMax = 1,
    statusLabels = []
  } = data;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem"
        }}
      >
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Monthly Application Trends</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={analytics?.monthlyApplications || []}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#trendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Interview Funnel</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={funnel}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem"
        }}
      >
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Application Velocity (Per Week)</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={velocity}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Rejection Analytics</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={rejectionAnalytics}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="rejected" fill="hsl(var(--status-error))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          marginTop: "1.5rem",
          padding: "1.5rem"
        }}
      >
        <h3 style={{ marginBottom: "0.9rem" }}>Status Movement Heatmap</h3>

        {heatmapRows.length === 0 ? (
          <p>No status movement recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0.35rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "0.3rem 0.4rem" }}>Day</th>
                  {statusLabels.map((status) => (
                    <th key={status} style={{ textAlign: "left", padding: "0.3rem 0.4rem" }}>
                      {status}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row) => (
                  <tr key={row.day}>
                    <td style={{ padding: "0.25rem 0.4rem", color: "hsl(var(--text-muted))" }}>{row.day}</td>
                    {statusLabels.map((status) => {
                      const value = Number(row[status] || 0);
                      const alpha = value ? 0.12 + (value / heatmapMax) * 0.72 : 0.08;

                      return (
                        <td
                          key={`${row.day}-${status}`}
                          style={{
                            minWidth: "74px",
                            textAlign: "center",
                            padding: "0.35rem",
                            borderRadius: "8px",
                            background: `hsl(200 92% 56% / ${alpha})`,
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.8rem"
                          }}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.5rem"
        }}
      >
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Company-Wise Performance</h3>
          <div style={{ height: 280, marginBottom: "0.8rem" }}>
            <ResponsiveContainer>
              <BarChart data={companyPerformance}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="company" tick={{ fill: "hsl(var(--text-muted))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="responseRate" fill="hsl(var(--status-info))" name="Response %" />
                <Bar dataKey="offerRate" fill="hsl(var(--status-success))" name="Offer %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "0.8rem" }}>Response and offer ratio across top companies by application volume.</p>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <MapPin size={16} /> Location-Based Insights
          </h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={locationInsights}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="location" tick={{ fill: "hsl(var(--text-muted))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Applications" />
                <Bar dataKey="successRate" fill="hsl(var(--status-success))" name="Success %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Pipeline Aging</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={pipelineAging}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--status-pending))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "0.8rem" }}>Aging distribution for active pipeline records.</p>
        </div>

        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Source Performance</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={sourcePerformance}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="source" tick={{ fill: "hsl(var(--text-muted))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--text-muted))", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="responseRate" fill="hsl(var(--status-info))" name="Response %" />
                <Bar dataKey="offerRate" fill="hsl(var(--accent))" name="Offer %" />
                <Bar dataKey="hiredRate" fill="hsl(var(--status-success))" name="Hired %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardCharts;
