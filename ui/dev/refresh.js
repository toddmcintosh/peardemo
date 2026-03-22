/** @typedef {import('pear-interface')} */ /* global Pear */

if (Pear.config.dev) {
  const { hotmods } = await import("pear-hotmods");

  let timer;
  const lastReloadAt = Number(
    sessionStorage.getItem("hotmods:lastReloadAt") || "0",
  );
  const startupCooldownMs = 1200;

  hotmods({ paths: ["/app.js", "/index.html", "/css/tailwind.css"] }, () => {
    const now = Date.now();

    if (now - lastReloadAt < startupCooldownMs) {
      console.log("Skipping reload during startup cooldown");
      return;
    }

    clearTimeout(timer);
    timer = setTimeout(() => {
      sessionStorage.setItem("hotmods:lastReloadAt", String(Date.now()));
      console.log("Reloading UI...");
      location.reload();
    }, 150);
  });
}
