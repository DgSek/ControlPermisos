// Importamos la configuración de Firebase y los métodos necesarios de Firestore
import { db } from '../BD/firebaseConfig.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('detalles-empleados-container');
  container.innerHTML = `<p>Cargando información del empleado...</p>`;

  const id_usuario = localStorage.getItem('idUsuario');
  if (!id_usuario) return container.innerHTML = `<p>ID de usuario no proporcionado.</p>`;

  async function fetchEmployeeData() {
    try {
      const qEmpleados = query(collection(db, 'empleados'), where('id_usuario', '==', id_usuario));
      const snapshot = await getDocs(qEmpleados);
      if (snapshot.empty) return container.innerHTML = `<p>No se encontró información del empleado.</p>`;

      const empleado = snapshot.docs[0].data();
      const areaNombre = await fetchAreaNombre(empleado.Area);
      const departamentoNombre = await fetchDepartamentoNombre(empleado.Area, empleado.Departamento);
      const contadores = await contarSolicitud(id_usuario);
      const limites = await fetchLimites();

      renderEmployee(empleado, areaNombre, departamentoNombre, contadores, limites);
    } catch (error) {
      console.error("Error al obtener datos:", error);
      container.innerHTML = `<p>Error al obtener información del empleado.</p>`;
    }
  }

  async function fetchAreaNombre(areaId) {
    try {
      const docSnap = await getDoc(doc(db, 'areas', 'doc'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return Object.keys(data).find(key => data[key] === areaId) || "No disponible";
      }
    } catch (e) { console.error("Área:", e); }
    return "No disponible";
  }

  async function fetchDepartamentoNombre(areaId, departamentoId) {
    try {
      const docRef = areaId === "A4"
        ? doc(db, 'departamentos', areaId, 'Docentes', 'A5')
        : doc(db, 'departamentos', areaId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return Object.keys(data).find(key => data[key] === departamentoId) || "No disponible";
      }
    } catch (e) { console.error("Departamento:", e); }
    return "No disponible";
  }

  async function contarSolicitud(id_usuario) {
    const contadores = { Personal: 0, Salud: 0, Sindical: 0, Parcial: 0 };
    try {
      const q = query(collection(db, 'solicitud'), where('id_usuario', '==', id_usuario));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => {
        const tipo = doc.data().tipo_permiso;
        if (contadores[tipo] !== undefined) contadores[tipo]++;
      });
    } catch (e) { console.error("Solicitudes:", e); }
    return contadores;
  }

  async function fetchLimites() {
    try {
      const docSnap = await getDoc(doc(db, 'limitePermisos', 'global'));
      if (docSnap.exists()) return docSnap.data();
    } catch (e) { console.error("Límites:", e); }
    return { personal: 3, salud: 3, sindical: 3, parcial: 3 }; // fallback
  }



  function renderEmployee(empleado, areaNombre, departamentoNombre, contadores, limites) {
  const defaultImage = 'ruta/a/imagen/predeterminada.jpg';
  const fechaIngreso = empleado.fecha_contratacion
    ? new Date(empleado.fecha_contratacion.seconds * 1000).toLocaleDateString()
    : "No disponible";

  // Función para obtener clase de color
  const getColorClass = (cantidad, limite) => {
    const ratio = cantidad / limite;
    if (ratio >= 1) return 'rojo';
    if (ratio >= 0.5) return 'naranja';
    return 'verde';
  };

  const personalColor = getColorClass(contadores.Personal, limites.personal);
  const saludColor = getColorClass(contadores.Salud, limites.salud);
  const sindicalColor = getColorClass(contadores.Sindical, limites.sindical);
  const parcialColor = getColorClass(contadores.Parcial, limites.parcial);

  document.getElementById('detalles-empleados-container').innerHTML = `
    <div class="detalles-empleados">
      <div class="encabezado"><h1>Perfil de Empleado</h1></div>
      <div class="perfil-contenedor">
        <div class="seccion info-general">
          <img src="${empleado.Foto || defaultImage}" alt="Foto" class="empleado-foto-grande">
          <p><strong>Nombre:</strong> ${empleado.nombre || "No disponible"}</p>
        </div>
        <div class="seccion info-secundaria">
          <div class="info-subseccion">
            <h2>Información</h2>
            <p><strong>Área:</strong> ${areaNombre}</p>
            <p><strong>Departamento:</strong> ${departamentoNombre}</p>
            <p><strong>Puesto:</strong> ${empleado.puesto || "No disponible"}</p>
            <p><strong>Fecha de Ingreso:</strong> ${fechaIngreso}</p>
          </div>
          <div class="info-subseccion">
            <h2>Permisos solicitados</h2>
            <div class="indicadores-globales">
              <span>Disponible <span class="indicador verde"></span></span>
              <span>Advertencia <span class="indicador naranja"></span></span>
              <span>Límite <span class="indicador rojo"></span></span>
            </div>
            <p><strong>Personal:</strong> ${contadores.Personal} <span class="indicador ${personalColor}"></span></p>
            <p><strong>Salud:</strong> ${contadores.Salud} <span class="indicador ${saludColor}"></span></p>
            <p><strong>Sindical:</strong> ${contadores.Sindical} <span class="indicador ${sindicalColor}"></span></p>
            <p><strong>Parcial:</strong> ${contadores.Parcial} <span class="indicador ${parcialColor}"></span></p>
          </div>
          <div class="info-subseccion">
            <h2>Contacto</h2>
            <p><strong>Teléfono:</strong> ${empleado.numero_telefono || "No disponible"}</p>
            <p><strong>Correo:</strong> ${empleado.correo || "No disponible"}</p>
          </div>
          <a href="/mnt/data/FORMATO-NVOPERMISO-2024.pdf" download class="btn-solicitar-permiso">Descargar Formato de Permiso</a>
        </div>
      </div>
    </div>
  `;
}


  fetchEmployeeData();
});
