import { Link, useSearchParams } from "react-router-dom";
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getHomePathForRole } from "../../utils/roles";

const PortalPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const homePath = getHomePathForRole(user?.role);

  const tenant = searchParams.get("tenant");
  const token = searchParams.get("token");
  const returnTo = searchParams.get("returnTo") || homePath;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem"
      }}
    >
      <div className="glass-panel" style={{ width: "min(720px, 100%)", padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ color: "hsl(var(--primary))" }}>
            <CreditCard size={22} />
          </div>
          <div>
            <h1 style={{ marginBottom: "0.2rem" }}>Billing Portal</h1>
            <p style={{ color: "hsl(var(--text-muted))" }}>
              Simulated billing portal for subscription management.
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "1rem", display: "grid", gap: "0.5rem" }}>
          <p>
            <strong>Tenant:</strong> {tenant || "Unknown"}
          </p>
          <p>
            <strong>Portal token:</strong> {token ? `${token.slice(0, 12)}...` : "Unavailable"}
          </p>
          <p style={{ color: "hsl(var(--text-muted))" }}>
            This route exists so users are not redirected to a missing page after opening billing.
          </p>
        </div>

        <div className="glass-card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
          <p style={{ display: "flex", alignItems: "center", gap: "0.45rem", color: "#fff" }}>
            <ShieldCheck size={16} /> Billing actions should be completed here or replaced with a real provider portal.
          </p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link className="btn-primary" to={returnTo}>
              Return To Dashboard
            </Link>
            <Link className="btn-secondary" to={homePath}>
              <ExternalLink size={16} /> Go To Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalPage;
