/* Derma-Safe AI — API base when frontend and backend run as two processes. */
(function () {
  const separate = location.port === "5173";
  const stored = localStorage.getItem("dermaApi");
  window.DERMA_API = stored || (separate ? "http://127.0.0.1:8000" : "");
})();
