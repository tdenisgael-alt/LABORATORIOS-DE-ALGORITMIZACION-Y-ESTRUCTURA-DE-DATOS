(() => {
  // Manejo de tema (modo oscuro / claro)
  const themeBtn = document.getElementById("btnThemeToggle");

  const syncTheme = () => {
    const isDark = document.documentElement.classList.contains("dark-mode");
    document.body.classList.toggle("dark-mode", isDark);
    if (themeBtn) {
      themeBtn.textContent = isDark ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
      themeBtn.setAttribute("aria-pressed", String(isDark));
    }
  };

  themeBtn?.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    syncTheme();
  });

  syncTheme();

  // Comprobación de estado del servidor Java mediante GET /lab4
  const serverStatus = document.getElementById("server-status");
  const apiBase = window.API_BASE || "http://localhost:8080";

  async function checkServer() {
    if (!serverStatus) return;
    try {
      const response = await fetch(`${apiBase}/lab4`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      serverStatus.textContent = "● Servidor Java conectado";
      serverStatus.className = "server-status online";
    } catch {
      serverStatus.textContent = "● Servidor Java desconectado";
      serverStatus.className = "server-status offline";
    }
  }

  checkServer();
})();

