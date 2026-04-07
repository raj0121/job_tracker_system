import logoImage from "../../rovex-helix.png";

const SIZE_CLASS_MAP = {
  sm: "app-logo--sm",
  md: "app-logo--md",
  lg: "app-logo--lg"
};

const Logo = ({ size = "md", alt = "Rovex - Recruit Apex", className = "", framed = false }) => {
  const sizeClass = SIZE_CLASS_MAP[size] || SIZE_CLASS_MAP.md;
  const classes = ["app-logo", sizeClass, framed ? "app-logo-surface" : "", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <img src={logoImage} alt={alt} className="app-logo-image" loading="eager" decoding="async" />
    </div>
  );
};

export default Logo;
