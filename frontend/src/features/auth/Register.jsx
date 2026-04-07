import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { UserPlus, Mail, Lock, User, Loader2 } from "lucide-react";
import { normalizeRole } from "../../utils/roles";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "recruiter",
    invite_code: "",
    tenant_name: "",
    tenant_slug: ""
  });
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLocalLoading(true);

    try {
      const payload = {
        ...formData,
        role: normalizeRole(formData.role)
      };

      if (!payload.invite_code) {
        delete payload.invite_code;
      }
      if (!payload.tenant_name) {
        delete payload.tenant_name;
      }
      if (!payload.tenant_slug) {
        delete payload.tenant_slug;
      }

      await api.post("/auth/register", payload);
      navigate("/login", { state: { message: "Account created! Please sign in." } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  const requiresInviteCode = formData.role === "superadmin";

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--bg-main))",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "20%",
          width: "400px",
          height: "400px",
          background: "hsl(var(--primary) / 0.1)",
          filter: "blur(100px)",
          borderRadius: "50%"
        }}
      />

      <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "3rem", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              marginBottom: "0.5rem",
              background: "var(--primary-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Job Tracker
          </h1>
          <p style={{ fontSize: "0.9rem" }}>Start tracking your career journey.</p>
        </div>

        {error && (
          <div
            style={{
              padding: "0.8rem",
              background: "hsl(var(--status-error) / 0.1)",
              border: "1px solid hsl(var(--status-error) / 0.3)",
              borderRadius: "var(--radius-sm)",
              color: "hsl(var(--status-error))",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              textAlign: "center"
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                color: "hsl(var(--text-secondary))"
              }}
            >
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={18}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "hsl(var(--text-muted))"
                }}
              />
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ paddingLeft: "3rem" }}
                required
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                color: "hsl(var(--text-secondary))"
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "hsl(var(--text-muted))"
                }}
              />
              <input
                type="email"
                className="input-field"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ paddingLeft: "3rem" }}
                required
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                marginBottom: "0.5rem",
                color: "hsl(var(--text-secondary))"
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "hsl(var(--text-muted))"
                }}
              />
              <input
                type="password"
                className="input-field"
                placeholder="********"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingLeft: "3rem" }}
                required
              />
            </div>
          </div>

          {/* {formData.role !== "superadmin" && (
            <>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem",
                    color: "hsl(var(--text-secondary))"
                  }}
                >
                  Workspace / Company Name (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Acme Hiring Team"
                  value={formData.tenant_name}
                  onChange={(e) => setFormData({ ...formData, tenant_name: e.target.value })}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.85rem",
                    marginBottom: "0.5rem",
                    color: "hsl(var(--text-secondary))"
                  }}
                >
                  Join Existing Workspace Slug (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="existing-workspace-slug"
                  value={formData.tenant_slug}
                  onChange={(e) => setFormData({ ...formData, tenant_slug: e.target.value })}
                />
              </div>
            </>
          )} */}

          {requiresInviteCode && (
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                  color: "hsl(var(--text-secondary))"
                }}
              >
                Invite Code
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="SUPERADMIN invite code"
                value={formData.invite_code}
                onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                required
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={localLoading}
            style={{ marginTop: "1rem", width: "100%", justifyContent: "center" }}
          >
            {localLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <UserPlus size={20} /> Register
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem" }}>
          <p>
            Already have an account?{" "}
            <Link
              to="/login"
              style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
