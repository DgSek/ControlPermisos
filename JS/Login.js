// JS/login.js

// Importamos lo que necesitamos
import { auth, db } from '../BD/firebaseConfig.js';
import {
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Esperamos a que el DOM cargue
document.addEventListener('DOMContentLoaded', () => {
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const errorMessage = document.getElementById('errorMessage');
  const loginButton = document.getElementById('loginButton');

  loginButton.addEventListener('click', async () => {
    // Limpiamos el mensaje de error
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      errorMessage.textContent = 'Por favor, completa ambos campos.';
      errorMessage.style.display = 'block';
      return;
    }

    try {
      // Autenticación con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Inicio de sesión exitoso:', user);

      // Consultar Firestore para obtener el tipo de usuario
      const empleadosRef = collection(db, 'empleados');
      const q = query(empleadosRef, where('correo', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Tomamos el primer documento que coincida
        const userData = querySnapshot.docs[0].data();
        console.log('Información del usuario desde Firestore:', userData);

        // Redireccionamos según el tipo de usuario
        const tipoUsuario = userData.tipo_usuario;
        if (tipoUsuario === 'admin') {
          // Pasar datos a la siguiente pantalla, por ejemplo usando query params
          window.location.href = `principalAdmin.html?nombre=${encodeURIComponent(userData.nombre)}`;
        } else if (tipoUsuario === 'usuario') {
          // Pasar el id_usuario en la URL
          window.location.href = `detallesEmpleadosU.html?id_usuario=${userData.id_usuario}`;
        } else {
          console.log('Tipo de usuario no reconocido');
          errorMessage.textContent = 'Tipo de usuario no reconocido.';
          errorMessage.style.display = 'block';
        }
      } else {
        errorMessage.textContent = 'Usuario no encontrado en la base de datos.';
        errorMessage.style.display = 'block';
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error.message);
      errorMessage.textContent = 'Error al iniciar sesión. Verifica tus credenciales.';
      errorMessage.style.display = 'block';
    }
  });
});
