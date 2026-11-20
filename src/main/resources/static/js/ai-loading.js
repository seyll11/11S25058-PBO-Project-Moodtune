document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ai-request-form").forEach((form) => {
    form.addEventListener("submit", () => {
      const button = form.querySelector(".ai-submit-button");
      const loading = form.querySelector(".ai-loading");
      if (!(button instanceof HTMLButtonElement) || !loading) return;

      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      loading.hidden = false;
      form.setAttribute("aria-busy", "true");
    });
  });
});
