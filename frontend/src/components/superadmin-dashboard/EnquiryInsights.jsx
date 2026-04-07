import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

const EnquiryInsights = ({ enquiries = {}, onNavigate }) => {
  const sourceRows = enquiries.sources || [];
  const cards = [
    { title: "Total", value: enquiries.total || 0, params: {}, critical: true },
    { title: "Converted", value: enquiries.convertedToCandidates || 0, params: { status: "closed" } },
    { title: "Pending", value: enquiries.pending || 0, params: { status: "open" } }
  ].filter((item) => item.critical || item.value > 0);

  return (
    <Card className="dashboard-card dashboard-card--secondary">
      <SectionHeader
        title="Enquiries"
        description="Inbound demand and follow-up status."
        action={(
          <Button variant="secondary" onClick={() => onNavigate?.("/app/enquiry")}>
            View All
          </Button>
        )}
      />

      <div className="dashboard-panel-body">
        <div className="dashboard-stat-grid dashboard-stat-grid--three">
          {cards.map((item) => (
            <div
              key={item.title}
              className="dashboard-stat-card cursor-pointer"
              onClick={() => onNavigate?.("/app/enquiry", item.params)}
            >
              <p className="dashboard-stat-card__label">{item.title}</p>
              <p className="dashboard-stat-card__value">{item.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="dashboard-panel-title cursor-pointer" onClick={() => onNavigate?.("/app/enquiry")}>Sources</h3>
          <div className="dashboard-chart dashboard-chart--secondary">
            <ResponsiveContainer>
              <BarChart data={sourceRows} onClick={(state) => {
                const label = state?.activePayload?.[0]?.payload?.label;
                if (label) {
                  onNavigate?.("/app/enquiry", { search: label });
                }
              }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#64748b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EnquiryInsights;
