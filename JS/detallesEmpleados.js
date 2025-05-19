// Importamos los métodos de Firebase necesarios y la configuración
import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('detalles-empleados-container');
  container.innerHTML = `<p>Cargando información del empleado...</p>`;

  // Obtener el id_usuario desde la query string
  const id_usuario = localStorage.getItem('idUsuario');

  if (!id_usuario) {
    container.innerHTML = `<p>No se encontró información del empleado.</p>`;
    return;
  }

  // Función principal para obtener los datos del empleado
  async function fetchEmployeeData() {
    try {
      // Consultar la colección 'empleados' por id_usuario
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

      // Obtener el nombre del área
      const areaNombre = await fetchAreaNombre(empleadoData.Area);
      // Obtener el nombre del departamento
      const departamentoNombre = await fetchDepartamentoNombre(empleadoData.Area, empleadoData.Departamento);
      // Contar las solicitudes por tipo
      const contadores = await contarSolicitud(id_usuario);

      renderEmployee(empleadoData, areaNombre, departamentoNombre, contadores);
    } catch (error) {
      console.error("Error al obtener datos:", error);
      container.innerHTML = `<p>Error al obtener información del empleado.</p>`;
    }
  }

  // Función para obtener el nombre del área
  async function fetchAreaNombre(areaId) {
    try {
      const areaDoc = await getDoc(doc(db, 'areas', 'doc'));
      if (areaDoc.exists()) {
        const areaData = areaDoc.data();
        const areaNombre = Object.keys(areaData).find(key => areaData[key] === areaId);
        return areaNombre || "No disponible";
      }
    } catch (error) {
      console.error("Error al obtener el nombre del área:", error);
    }
    return "No disponible";
  }

  // Función para obtener el nombre del departamento
  async function fetchDepartamentoNombre(areaId, departamentoId) {
    try {
      let departamentoNombre = "No disponible";

      if (areaId === "A4") {
        const docenteDoc = await getDoc(doc(db, 'departamentos', areaId, 'Docentes', 'A5'));
        if (docenteDoc.exists()) {
          const docenteData = docenteDoc.data();
          departamentoNombre = Object.keys(docenteData).find(key => docenteData[key] === departamentoId) || "No disponible";
        }
      } else {
        const departamentoDoc = await getDoc(doc(db, 'departamentos', areaId));
        if (departamentoDoc.exists()) {
          const departamentoData = departamentoDoc.data();
          departamentoNombre = Object.keys(departamentoData).find(key => departamentoData[key] === departamentoId) || "No disponible";
        }
      }
      return departamentoNombre;
    } catch (error) {
      console.error("Error al obtener el nombre del departamento:", error);
    }
    return "No disponible";
  }

  // Función para contar las solicitudes de permiso por tipo
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
    // Calcular el número de permiso a asignar
    const numeroPermiso = contadores.Personal + contadores.Sindical + contadores.Parcial + 1;

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
          </div>
        </div>
      </div>
    `;

    // Evento para redirigir a la pantalla de solicitud de permiso
    const btn = document.getElementById('btn-solicitar-permiso');
if (btn) {
  btn.addEventListener('click', () => {
    const params = new URLSearchParams();
    params.set('id_usuario', empleado.id_usuario);
    params.set('nombre', empleado.nombre);
    params.set('puesto', empleado.puesto);
    params.set('areaId', empleado.Area);
    params.set('departamentoId', empleado.Departamento);
    params.set('numeroPermiso', numeroPermiso);
    window.location.href = `solicitudPermiso.html?${params.toString()}`;
  });
}

  }

  // Ejecutar la función principal para obtener y renderizar la información
  fetchEmployeeData();
});
