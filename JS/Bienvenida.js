document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bienvenida-container');
  
    // Verifica si hay un usuario almacenado en localStorage
    let user = null;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && (parsedUser.role === 'admin' || parsedUser.role === 'administrador')) {
          user = parsedUser;
        }
      }
    } catch (error) {
      console.error("Error al obtener el usuario de localStorage:", error);
    }
  
    // Funciones de navegación
    function handleRegistroClick() {
       window.location.href = './Login.html';
    }
  
    function handlePreguntasClick() {
      window.location.href = 'preguntasFrecuentes.html'; // Redirige a la pantalla de Preguntas Frecuentes
    }
  
    // Funciones opcionales para simular login y logout (puedes eliminarlas si ya cuentas con autenticación)
    function handleLogin() {
      const fakeUser = { username: 'usuarioEjemplo', role: 'admin' };
      localStorage.setItem('user', JSON.stringify(fakeUser));
      user = fakeUser;
      renderContent();
    }
  
    function handleLogout() {
      localStorage.removeItem('user');
      user = null;
      renderContent();
    }
  
    // Función para renderizar el contenido de la página
    function renderContent() {
      let html = `
        <!-- Encabezado -->
        <div class="header">
          <img src="https://www.puertopenasco.tecnm.mx/wp-content/uploads/2020/01/Encabezado-scaled.jpg" alt="Encabezado Institución">
        </div>
        
        <!-- Barra de navegación -->
        <div class="navbar">
      `;
  
      // Si el usuario existe y es administrador, mostrar el buscador
      if (user && (user.role === 'admin' || user.role === 'administrador')) {
        html += `
          <div class="search-container">
            <input type="text" placeholder="Buscar">
            <button type="submit"><i class="fa fa-search"></i></button>
          </div>
        `;
      }
      html += `
          <div class="nav-links">
            <a href="#contacto">CONTACTO</a>
            <button id="btnPreguntas">PREGUNTAS</button>
            <button class="register-button" id="btnRegistro">REGISTRO</button>
          </div>
        </div>
        
        <!-- Contenido de bienvenida -->
        <div class="welcome-content">
          <h1>Bienvenidos</h1>
          <p>
            Somos una institución educativa sin fines de lucro, de la sociedad y para la sociedad,
            que orgullosamente pertenece al Tecnológico Nacional de México.
          </p>
        </div>
        
        <!-- Logo ITSPP -->
        <div class="welcome-logo">
          <img src="https://www.puertopenasco.tecnm.mx/wp-content/uploads/2023/08/ITSPP-logotipo-colores.png" alt="Logo ITSPP">
        </div>
      `;
  
      container.innerHTML = html;
  
      // Asignar eventos a los botones
      const btnRegistro = document.getElementById('btnRegistro');
      if (btnRegistro) {
        btnRegistro.addEventListener('click', handleRegistroClick);
      }
      const btnPreguntas = document.getElementById('btnPreguntas');
      if (btnPreguntas) {
        btnPreguntas.addEventListener('click', handlePreguntasClick);
      }
    }
  
    // Renderizado inicial
    renderContent();
  });
  