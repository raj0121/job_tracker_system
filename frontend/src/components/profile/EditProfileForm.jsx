import { Camera, Save, X } from "lucide-react";

const EditProfileForm = ({
  form,
  onChange,
  onSubmit,
  onCancel,
  onAvatarChange,
  isSaving,
  avatarPreview,
  avatarUrl,
  error,
  success
}) => {
  return (
    <form className="glass-panel" style={{ padding: "1.4rem" }} onSubmit={onSubmit}>
      <div style={{ display: "flex", gap: "1.2rem", alignItems: "center", marginBottom: "1rem" }}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.08)"
          }}
        >
          {avatarPreview || avatarUrl ? (
            <img
              src={avatarPreview || avatarUrl}
              alt="Profile avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Camera size={36} />
          )}
        </div>
        <label className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          <Camera size={16} /> Upload photo
          <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: "none" }} />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem"
        }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Full Name</span>
          <input name="name" value={form.name} onChange={onChange} className="input-field" required />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Phone Number</span>
          <input name="phone" value={form.phone} onChange={onChange} className="input-field" />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>LinkedIn URL</span>
          <input name="linkedin_url" value={form.linkedin_url} onChange={onChange} className="input-field" />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Location</span>
          <input name="location" value={form.location} onChange={onChange} className="input-field" />
        </label>
      </div>

      <label style={{ display: "grid", gap: "0.35rem", marginTop: "1rem" }}>
        <span>Bio</span>
        <textarea name="bio" value={form.bio} onChange={onChange} className="input-field" rows={4} />
      </label>

      <div style={{ marginTop: "1.2rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          <Save size={16} /> Save Changes
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSaving}>
          <X size={16} /> Cancel
        </button>
        {success && <span style={{ color: "hsl(var(--status-success))" }}>{success}</span>}
        {error && <span style={{ color: "hsl(var(--status-error))" }}>{error}</span>}
      </div>
    </form>
  );
};

export default EditProfileForm;
