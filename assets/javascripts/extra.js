(function () {
  const a = document.createElement("a");
  a.className = "fab-create-post";
  a.href = "/Pang-Homepage/admin/";
  a.setAttribute("aria-label", "Create a new post");

  a.style.background = "var(--md-accent-fg-color, #00bfa5)";
  a.style.color = "var(--md-accent-bg-color, #fff)";
  a.textContent = "+";

  document.body.appendChild(a);
})();
