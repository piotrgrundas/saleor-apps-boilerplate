export function AboutView() {
  const { APP_NAME, APP_VERSION } = window.env;

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h1>{APP_NAME}</h1>
      <p style={{ color: "#666" }}>Version {APP_VERSION}</p>
    </div>
  );
}
