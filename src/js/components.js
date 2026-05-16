class AppHeader extends HTMLElement {
    connectedCallback() {
        const user = JSON.parse(sessionStorage.getItem('usuario') || '{}');
        const isLoggedIn = !!user.nombreUsuario;

        this.innerHTML = `
      <header class="navbar">
        <a href="index.html" class="navbar-brand">
          <span class="navbar-icon">🏦</span>
          BancoSol
        </a>
        ${isLoggedIn ? `
          <ul class="navbar-nav">
            ${user.puesto === 'admin' ? `<li><a href="admin.html">Admin</a></li>` : ''}
            ${user.puesto === 'manager' ? `<li><a href="manager.html">Manager</a></li>` : ''}
            ${user.puesto === 'worker' ? `<li><a href="worker.html">Worker</a></li>` : ''}
            <li><a href="viewer.html">Visor de Datos</a></li>
          </ul>
          <div class="navbar-right">
            <div class="user-chip">
              <div class="user-avatar avatar-${user.puesto}">
                ${user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
              </div>
              <span>${user.nombre || user.nombreUsuario}</span>
            </div>
            <button id="logout-btn" class="btn btn-outline btn-sm">Salir</button>
          </div>
        ` : ''}
      </header>
    `;

        const logoutBtn = this.querySelector('#logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('usuario');
                sessionStorage.removeItem('perfil');
                window.location.href = 'index.html';
            });
        }
    }
}

class AppFooter extends HTMLElement {
    connectedCallback() {
        const currentYear = new Date().getFullYear();
        this.innerHTML = `
      <footer class="app-footer">
        <p>&copy; ${currentYear} BancoSol MVP - Aplicación Web. Todos los derechos reservados.</p>
      </footer>
    `;
    }
}

customElements.define('app-header', AppHeader);
customElements.define('app-footer', AppFooter);