import { auth, db } from '../BD/firebaseConfig.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

import {
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const loginButton = document.getElementById('loginButton');
  const signupButton = document.getElementById('signupButton');

  loginButton.addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!email || !password) {
      Swal.fire('Campos vacíos', 'Completa todos los campos para iniciar sesión.', 'warning');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const empleadosRef = collection(db, 'empleados');
      const q = query(empleadosRef, where('correo', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const tipoUsuario = userData.tipo_usuario;

        await Swal.fire('Bienvenido', 'Inicio de sesión exitoso.', 'success');

        if (tipoUsuario === 'admin') {
          window.location.href = `principalAdmin.html?nombre=${encodeURIComponent(userData.nombre)}`;
        } else if (tipoUsuario === 'usuario') {
          window.location.href = `detallesEmpleadosU.html?id_usuario=${userData.id_usuario}`;
        } else {
          Swal.fire('Error', 'Tipo de usuario no reconocido.', 'error');
        }
      } else {
        Swal.fire('Usuario no encontrado', 'Este usuario no está registrado en la base de datos.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error.message);
      Swal.fire('Error', 'Error al iniciar sesión. Verifica tus datos.', 'error');
    }
  });

  signupButton.addEventListener('click', async () => {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordInput').value.trim();

    if (!email || !password || !confirmPassword) {
      Swal.fire('Campos vacíos', 'Completa todos los campos para registrarte.', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      Swal.fire('Contraseñas no coinciden', 'Verifica las contraseñas ingresadas.', 'warning');
      return;
    }

    try {
      const empleadosRef = collection(db, 'empleados');
      const q = query(empleadosRef, where('correo', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Swal.fire('Correo no permitido', 'Este correo no está registrado como empleado.', 'error');
        return;
      }

      await createUserWithEmailAndPassword(auth, email, password);
      await Swal.fire('¡Registro exitoso!', 'Cuenta creada correctamente. Ahora puedes iniciar sesión.', 'success');

      // Limpiar campos
      document.getElementById('signupEmail').value = '';
      document.getElementById('signupPassword').value = '';
      document.getElementById('confirmPasswordInput').value = '';

      // Cambiar de nuevo al formulario de login
      document.getElementById('toggleCreateAccount').checked = false;
    } catch (error) {
      console.error('Signup error:', error.message);
      Swal.fire('Error', 'Error al crear la cuenta. Intenta nuevamente.', 'error');
    }
  });
});
