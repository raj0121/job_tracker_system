import { Lock } from "lucide-react";

const ChangePasswordForm = ({ form, onChange, onSubmit, isSaving, error, success }) => {
  return (
    <form className="glass-panel" style={{ padding: "1.4rem" }} onSubmit={onSubmit}>
      <h3 style={{ marginBottom: "0.6rem" }}>Security Settings</h3>
      <p style={{ fontSize: "0.85rem", color: "hsl(var(--text-muted))", marginBottom: "1rem" }}>
        Change your password to keep your account secure.
      </p>

      <div style={{ display: "grid", gap: "0.8rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Current Password</span>
          <input
            type="password"
            name="current_password"
            value={form.current_password}
            onChange={onChange}
            className="input-field"
            required
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>New Password</span>
          <input
            type="password"
            name="new_password"
            value={form.new_password}
            onChange={onChange}
            className="input-field"
            required
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Confirm Password</span>
          <input
            type="password"
            name="confirm_password"
            value={form.confirm_password}
            onChange={onChange}
            className="input-field"
            required
          />
        </label>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          <Lock size={16} /> Update Password
        </button>
        {success && <span style={{ color: "hsl(var(--status-success))" }}>{success}</span>}
        {error && <span style={{ color: "hsl(var(--status-error))" }}>{error}</span>}
      </div>
    </form>
  );
};

export default ChangePasswordForm;
