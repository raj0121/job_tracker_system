import { UserCircle2 } from "lucide-react";

const ProfileCard = ({ profile, avatarUrl }) => {
  const roleLabel = (profile?.role || "unknown").toString().toUpperCase();

  return (
    <div className="glass-panel" style={{ padding: "1.4rem" }}>
      <div style={{ display: "flex", gap: "1.4rem", alignItems: "center" }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.08)"
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <UserCircle2 size={54} />
          )}
        </div>

        <div style={{ display: "grid", gap: "0.35rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h2>{profile?.name || "Your Name"}</h2>
            <span
              className="glass-card"
              style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", textTransform: "uppercase" }}
            >
              {roleLabel}
            </span>
          </div>
          <p style={{ color: "hsl(var(--text-muted))" }}>{profile?.email || "email@domain.com"}</p>
          <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-secondary))" }}>
            Status: {profile?.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "1.2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.8rem"
        }}
      >
        <div className="glass-card" style={{ padding: "0.7rem 0.9rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>Account Created</p>
          <p>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-"}</p>
        </div>
        <div className="glass-card" style={{ padding: "0.7rem 0.9rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-muted))" }}>Last Login</p>
          <p>{profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Not available"}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
