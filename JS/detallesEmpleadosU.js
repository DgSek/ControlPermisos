// Importamos la configuración de Firebase y los métodos necesarios de Firestore
import { db } from '../BD/firebaseConfig.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('detalles-empleados-container');
  container.innerHTML = `<p>Cargando información del empleado...</p>`;

  // Se obtiene el id_usuario desde la query string, ej: ?id_usuario=123
  const params = new URLSearchParams(window.location.search);
  const id_usuario = params.get('id_usuario');

  if (!id_usuario) {
    container.innerHTML = `<p>ID de usuario no proporcionado.</p>`;
    return;
  }

  // Función principal para obtener y renderizar la información del empleado
  async function fetchEmployeeData() {
    try {
      const qEmpleados = query(
        collection(db, 'empleados'),
        where('id_usuario', '==', id_usuario)
      );
      const querySnapshotEmpleados = await getDocs(qEmpleados);
      if (querySnapshotEmpleados.empty) {
        container.innerHTML = `<p>No se encontró información del empleado.</p>`;
        return;
      }
      const empleadoData = querySnapshotEmpleados.docs[0].data();

      // Obtener nombres de área y departamento
      const areaNombre = await fetchAreaNombre(empleadoData.Area);
      const departamentoNombre = await fetchDepartamentoNombre(empleadoData.Area, empleadoData.Departamento);

      // Contar permisos solicitados por tipo
      const contadores = await contarSolicitud(id_usuario);

      renderEmployee(empleadoData, areaNombre, departamentoNombre, contadores);
    } catch (error) {
      console.error("Error al obtener datos del empleado:", error);
      container.innerHTML = `<p>Error al obtener información del empleado.</p>`;
    }
  }

  // Función para obtener el nombre del área consultando el documento 'areas/doc'
  async function fetchAreaNombre(areaId) {
    try {
      const areaDoc = await getDoc(doc(db, 'areas', 'doc'));
      if (areaDoc.exists()) {
        const areaData = areaDoc.data();
        const nombreArea = Object.keys(areaData).find(key => areaData[key] === areaId);
        return nombreArea || "No disponible";
      }
    } catch (error) {
      console.error("Error al obtener el nombre del área:", error);
    }
    return "No disponible";
  }

  // Función para obtener el nombre del departamento según el área y departamento
  async function fetchDepartamentoNombre(areaId, departamentoId) {
    try {
      let nombreDepartamento = "No disponible";
      if (areaId === "A4") {
        // Caso especial para área "A4"
        const docenteDoc = await getDoc(doc(db, 'departamentos', areaId, 'Docentes', 'A5'));
        if (docenteDoc.exists()) {
          const docenteData = docenteDoc.data();
          nombreDepartamento = Object.keys(docenteData).find(key => docenteData[key] === departamentoId) || "No disponible";
        }
      } else {
        const departamentoDoc = await getDoc(doc(db, 'departamentos', areaId));
        if (departamentoDoc.exists()) {
          const departamentoData = departamentoDoc.data();
          nombreDepartamento = Object.keys(departamentoData).find(key => departamentoData[key] === departamentoId) || "No disponible";
        }
      }
      return nombreDepartamento;
    } catch (error) {
      console.error("Error al obtener el nombre del departamento:", error);
    }
    return "No disponible";
  }

  // Función para contar los permisos solicitados por tipo
  async function contarSolicitud(id_usuario) {
    try {
      const qSolicitudes = query(
        collection(db, 'solicitud'),
        where('id_usuario', '==', id_usuario)
      );
      const querySnapshotSolicitud = await getDocs(qSolicitudes);
      const contadores = { Personal: 0, Sindical: 0, Parcial: 0 };
      querySnapshotSolicitud.forEach(docSnap => {
        const data = docSnap.data();
        if (contadores[data.tipo_permiso] !== undefined) {
          contadores[data.tipo_permiso]++;
        }
      });
      return contadores;
    } catch (error) {
      console.error("Error al contar solicitudes:", error);
      return { Personal: 0, Sindical: 0, Parcial: 0 };
    }
  }

  // Función para renderizar la información del empleado en el DOM
  function renderEmployee(empleado, areaNombre, departamentoNombre, contadores) {
    const defaultImage = 'ruta/a/imagen/predeterminada.jpg';
    const fechaIngreso = empleado.fecha_contratacion
      ? new Date(empleado.fecha_contratacion.seconds * 1000).toLocaleDateString()
      : "No disponible";

    container.innerHTML = `
      <div class="detalles-empleados">
        <div class="encabezado">
          <h1>Perfil de Empleado</h1>
        </div>
        <div class="perfil-contenedor">
          <div class="seccion info-general">
            <h2>Información general</h2>
            <div class="info-item">
              <img src="${empleado.Foto || defaultImage}" alt="Foto del Empleado" class="empleado-foto-grande">
              <p class="empleado-nombre"><strong>Nombre:</strong> ${empleado.nombre || "No disponible"}</p>
            </div>
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
              <p><strong>Personal:</strong> ${contadores.Personal}</p>
              <p><strong>Sindical:</strong> ${contadores.Sindical}</p>
              <p><strong>Parcial:</strong> ${contadores.Parcial}</p>
            </div>
            <div class="info-subseccion">
              <h2>Información de contacto</h2>
              <p><strong>Teléfono:</strong> ${empleado.numero_telefono || "No disponible"}</p>
              <p><strong>Correo electrónico:</strong> ${empleado.correo || "No disponible"}</p>
            </div>
            <a href="/mnt/data/FORMATO-NVOPERMISO-2024.pdf" download="FORMATO-NVOPERMISO-2024.pdf" class="btn-solicitar-permiso">
              Descargar Formato de Permiso
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // Ejecutar la función principal para cargar y renderizar la información del empleado
  fetchEmployeeData();
});
