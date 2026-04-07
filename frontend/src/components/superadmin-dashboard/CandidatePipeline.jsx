import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../ui/Card";
import Button from "../ui/Button";
import SectionHeader from "../ui/SectionHeader";

const CandidatePipeline = ({ candidates = {}, onNavigate }) => {
  const pipeline = candidates.pipeline || {};
  const funnelData = [
    { stage: "Applied", value: pipeline.applied || 0, params: {} },
    { stage: "Screening", value: pipeline.screening || 0, params: { stage: "screening" } },
    { stage: "Interview", value: pipeline.interview || 0, params: { stage: "interview" } },
    { stage: "Offer", value: pipeline.offer || 0, params: {} },
    { stage: "Hired", value: pipeline.hired || 0, params: { stage: "hired" } }
  ].filter((item) => item.value > 0);

  return (
    <Card className="dashboard-card dashboard-card--primary">
      <SectionHeader
        title="Candidate Pipeline"
        description="Stage-wise candidate volume."
        action={(
          <Button variant="secondary" onClick={() => onNavigate?.("/app/candidates")}>
            View All
          </Button>
        )}
      />

      {funnelData.length ? (
        <div className="dashboard-panel-body">
          <h3 className="dashboard-panel-title">Pipeline</h3>
          <div className="dashboard-chart dashboard-chart--primary">
            <ResponsiveContainer>
              <BarChart data={funnelData} onClick={(state) => {
                if (state?.activePayload?.[0]?.payload?.params) {
                  onNavigate?.("/app/candidates", state.activePayload[0].payload.params);
                }
              }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#475569" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="dashboard-empty-state">
          No active pipeline data.
        </div>
      )}
    </Card>
  );
};

export default CandidatePipeline;
