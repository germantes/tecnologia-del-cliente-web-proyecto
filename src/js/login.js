// Redirect if already logged in
const role = sessionStorage.getItem("perfil");
if (role) {
  const redirectMap = {
    admin: "admin.html",
    manager: "manager.html",
    worker: "worker.html",
  };
  window.location.href = redirectMap[role] || "admin.html";
}

// Toggle password visibility
document.getElementById("toggle-password").addEventListener("click", () => {
  const passwordInput = document.getElementById("password");
  const icon = document.querySelector(".eye-icon");
  const isHidden = passwordInput.type === "password";

  icon.style.opacity = "0";

  setTimeout(() => {
    passwordInput.type = isHidden ? "text" : "password";
    icon.src = isHidden
      ? "resources/icons/eye-open.svg"
      : "resources/icons/eye-closed.svg";
    icon.alt = isHidden ? "Ocultar" : "Mostrar";
    icon.style.opacity = "1";
  }, 100);
});

// Handle login form submission
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const errorEl = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-btn");
  const btnText = submitBtn.querySelector("span");
  const spinner = submitBtn.querySelector(".btn-spinner");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Reset error state
  errorEl.hidden = true;

  // Validate inputs
  if (!username || !password) {
    errorEl.textContent = "Por favor, introduzca su usuario y contraseña";
    errorEl.hidden = false;
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  btnText.hidden = true;
  spinner.hidden = false;

  try {
    const data = await login(username, password);
    sessionStorage.setItem("token", data.token);
    sessionStorage.setItem("perfil", data.user.puesto);
    sessionStorage.setItem("usuario", JSON.stringify(data.user));

    const redirectMap = {
      admin: "admin.html",
      manager: "manager.html",
      worker: "worker.html",
    };
    window.location.href = redirectMap[data.user.puesto] || "admin.html";
  } catch (err) {
    let message = err.message;
    if (message.includes("Faltan") || message.includes("requerido")) {
      message = "Usuario y/o contraseña incorrectos";
    }
    errorEl.textContent = message;
    errorEl.hidden = false;

    submitBtn.disabled = false;
    btnText.hidden = false;
    spinner.hidden = true;
  }
});
