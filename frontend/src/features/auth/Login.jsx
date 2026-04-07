import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Lock, Loader2, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../components/ui/Logo";
import { getHomePathForRole } from "../../utils/roles";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLocalLoading(true);

    try {
      const loggedInUser = await login(email, password);
      const targetPath = getHomePathForRole(loggedInUser?.role);
      navigate(targetPath, { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Too many login attempts from this browser. Please wait 15 minutes and try again.");
      } else {
        setError(err.response?.data?.message || err.message || "Invalid credentials. Please try again.");
      }
    } finally {
      setLocalLoading(false);
    }
  };

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
          top: "20%",
          left: "30%",
          width: "300px",
          height: "300px",
          background: "hsl(var(--primary) / 0.15)",
          filter: "blur(80px)",
          borderRadius: "50%"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "30%",
          width: "300px",
          height: "300px",
          background: "hsl(var(--accent) / 0.15)",
          filter: "blur(80px)",
          borderRadius: "50%"
        }}
      />

      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "3rem",
          zIndex: 1
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <Logo size="lg" framed className="auth-logo" />
          <p
            style={{
              margin: "0.9rem 0 0.35rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "hsl(var(--text-secondary))"
            }}
          >
            Rovex ATS
          </p>
          <h1
            style={{
              fontSize: "2rem",
              marginBottom: "0.5rem",
              background: "var(--primary-gradient)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: "0.9rem" }}> Job Tracking & Intelligence</p>
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
              Email Address
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
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={{ paddingLeft: "3rem" }}
                required
              />
            </div>
          </div>

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
                <LogIn size={20} /> Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.9rem" }}>
          <p>
            Don&apos;t have an account?{" "}
            <Link to="/register" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

