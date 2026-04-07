import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import api, { extractData } from "../../services/api";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 6 }, (_, index) => currentYear - index);

const statCardStyle = {
  padding: "1rem",
  display: "grid",
  gap: "0.45rem"
};

const actionButtonStyle = {
  minWidth: "160px",
  justifyContent: "center"
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const buildCsv = (report) => {
  const rows = [
    ["Metric", "Value"],
    ["Year", report.year],
    ["Total Applications", report.summary.totalApplications],
    ["Number of Interviews", report.summary.totalInterviews],
    ["Number of Offers", report.summary.totalOffers],
    ["Number of Rejections", report.summary.totalRejections],
    ["Interview Rate", formatPercent(report.metrics.interviewRate)],
    ["Offer Rate", formatPercent(report.metrics.offerRate)],
    ["Rejection Rate", formatPercent(report.metrics.rejectionRate)],
    [],
    ["Month", "Applications"],
    ...report.monthlyBreakdown.map((month) => [month.label, month.applications])
  ];

  return rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
};

const triggerFileDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.setAttribute("download", fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
};

const openPdfPreview = (report) => {
  const preview = window.open("", "_blank", "width=960,height=720");
  if (!preview) {
    return false;
  }

  const monthlyRows = report.monthlyBreakdown
    .map((month) => `<tr><td>${month.label}</td><td>${month.applications}</td></tr>`)
    .join("");

  preview.document.write(`
    <html>
      <head>
        <title>Yearly Report ${report.year}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
          h1 { margin: 0 0 8px; }
          p { color: #475569; margin: 0; }
          .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 24px 0; }
          .card { border: 1px solid #cbd5e1; border-radius: 14px; padding: 16px; }
          .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; }
          .value { font-size: 28px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
          th { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Yearly Report ${report.year}</h1>
        <p>Generated ${new Date(report.generatedAt).toLocaleString()}</p>
        <div class="cards">
          <div class="card"><div class="label">Applications</div><div class="value">${report.summary.totalApplications}</div></div>
          <div class="card"><div class="label">Interviews</div><div class="value">${report.summary.totalInterviews}</div></div>
          <div class="card"><div class="label">Offers</div><div class="value">${report.summary.totalOffers}</div></div>
          <div class="card"><div class="label">Rejections</div><div class="value">${report.summary.totalRejections}</div></div>
        </div>
        <div class="cards">
          <div class="card"><div class="label">Interview Rate</div><div class="value">${formatPercent(report.metrics.interviewRate)}</div></div>
          <div class="card"><div class="label">Offer Rate</div><div class="value">${formatPercent(report.metrics.offerRate)}</div></div>
          <div class="card"><div class="label">Rejection Rate</div><div class="value">${formatPercent(report.metrics.rejectionRate)}</div></div>
        </div>
        <table>
          <thead>
            <tr><th>Month</th><th>Applications</th></tr>
          </thead>
          <tbody>${monthlyRows}</tbody>
        </table>
      </body>
    </html>
  `);
  preview.document.close();
  preview.focus();
  preview.print();
  return true;
};

const MetricCard = ({ title, value, helper, icon }) => (
  <div className="glass-card" style={statCardStyle}>
    <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>{title}</span>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
      <strong style={{ fontSize: "2rem" }}>{value}</strong>
      <span style={{ color: "hsl(var(--primary))" }}>{icon}</span>
    </div>
    <span style={{ color: "hsl(var(--text-muted))", fontSize: "0.88rem" }}>{helper}</span>
  </div>
);

const RateCard = ({ title, value, icon, background }) => (
  <div className="glass-card" style={{ ...statCardStyle, background }}>
    <span style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: "hsl(var(--text-muted))" }}>
      {icon} {title}
    </span>
    <strong style={{ fontSize: "1.95rem" }}>{value}</strong>
  </div>
);

const Reports = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadYearlyReport = async (year, options = {}) => {
    const showGenerating = Boolean(options.showGenerating);
    setError("");
    setSuccess("");

    if (showGenerating) {
      setGenerating(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get("/reports/yearly", { params: { year } });
      const payload = extractData(response);
      setReport(payload);
      setSuccess(`Yearly report for ${year} is ready.`);
    } catch (requestError) {
      setReport(null);
      setError(requestError.response?.data?.message || "Failed to load yearly report.");
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  useEffect(() => {
    loadYearlyReport(selectedYear);
  }, [selectedYear]);

  const handleCsvDownload = () => {
    if (!report) {
      return;
    }

    const csv = buildCsv(report);
    triggerFileDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `yearly_report_${report.year}.csv`);
  };

  const handlePdfDownload = () => {
    if (!report) {
      return;
    }

    const opened = openPdfPreview(report);
    if (!opened) {
      setError("Popup blocked. Please allow popups to export the PDF.");
    }
  };

  const summary = report?.summary || {
    totalApplications: 0,
    totalInterviews: 0,
    totalOffers: 0,
    totalRejections: 0
  };

  const metrics = report?.metrics || {
    interviewRate: 0,
    offerRate: 0,
    rejectionRate: 0
  };

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "end", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ marginBottom: "0.35rem" }}>Yearly Reports</h1>
          <p style={{ maxWidth: "720px", color: "hsl(var(--text-muted))" }}>
            Track your yearly hiring performance with a focused summary of applications, interviews, offers, rejections, and monthly activity.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "0.9rem", display: "flex", gap: "0.75rem", alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: "0.35rem", minWidth: "180px" }}>
            <span style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>Year Selector</span>
            <select className="input-field" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <button
            className="btn-primary"
            type="button"
            style={actionButtonStyle}
            onClick={() => loadYearlyReport(selectedYear, { showGenerating: true })}
            disabled={loading || generating}
          >
            <Download size={16} /> {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </section>

      {error && (
        <div className="glass-card" style={{ borderColor: "hsl(var(--status-error) / 0.4)", color: "hsl(var(--status-error))", padding: "0.75rem" }}>
          {error}
        </div>
      )}

      {success && (
        <div className="glass-card" style={{ borderColor: "hsl(var(--status-success) / 0.4)", color: "hsl(var(--status-success))", padding: "0.75rem" }}>
          {success}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <MetricCard
          title="Total Applications"
          value={summary.totalApplications}
          helper={`Applications submitted in ${selectedYear}`}
          icon={<FileSpreadsheet size={20} />}
        />
        <MetricCard
          title="Interviews"
          value={summary.totalInterviews}
          helper="Interview activity scheduled during the year"
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          title="Offers"
          value={summary.totalOffers}
          helper="Offers and hires reached in the pipeline"
          icon={<Trophy size={20} />}
        />
        <MetricCard
          title="Rejections"
          value={summary.totalRejections}
          helper="Applications that ended in rejection"
          icon={<TrendingDown size={20} />}
        />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: "1rem" }}>
        <div className="glass-panel" style={{ padding: "1.1rem", minHeight: "360px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ marginBottom: "0.25rem" }}>Monthly Breakdown</h3>
              <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem" }}>
                Applications submitted month by month.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button className="btn-secondary" type="button" style={actionButtonStyle} onClick={handleCsvDownload} disabled={!report}>
                <FileSpreadsheet size={16} /> Download CSV
              </button>
              <button className="btn-primary" type="button" style={actionButtonStyle} onClick={handlePdfDownload} disabled={!report}>
                <FileText size={16} /> Download PDF
              </button>
            </div>
          </div>

          {loading ? (
            <p>Loading yearly report...</p>
          ) : !report ? (
            <p>No report data is available for this year yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={report.monthlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" stroke="hsl(var(--text-muted))" />
                <YAxis allowDecimals={false} stroke="hsl(var(--text-muted))" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.22)",
                    borderRadius: "14px"
                  }}
                />
                <Bar dataKey="applications" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-panel" style={{ padding: "1.1rem", display: "grid", gap: "0.8rem", alignContent: "start" }}>
          <div>
            <h3 style={{ marginBottom: "0.25rem" }}>Key Metrics</h3>
            <p style={{ color: "hsl(var(--text-muted))", fontSize: "0.9rem" }}>
              Conversion rates based on total applications.
            </p>
          </div>

          <RateCard
            title="Interview Rate"
            value={formatPercent(metrics.interviewRate)}
            icon={<TrendingUp size={16} />}
            background="linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(30, 41, 59, 0.22))"
          />
          <RateCard
            title="Offer Rate"
            value={formatPercent(metrics.offerRate)}
            icon={<Trophy size={16} />}
            background="linear-gradient(135deg, rgba(22, 163, 74, 0.18), rgba(30, 41, 59, 0.22))"
          />
          <RateCard
            title="Rejection Rate"
            value={formatPercent(metrics.rejectionRate)}
            icon={<TrendingDown size={16} />}
            background="linear-gradient(135deg, rgba(220, 38, 38, 0.18), rgba(30, 41, 59, 0.22))"
          />

          {report && (
            <p style={{ fontSize: "0.8rem", color: "hsl(var(--text-muted))" }}>
              Generated on {new Date(report.generatedAt).toLocaleString()}.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Reports;
