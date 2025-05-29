// Importamos los métodos de Firebase necesarios y la configuración
import { db } from '../BD/firebaseConfig.js';
import {
  collection, doc, getDoc, query, where,
  getDocs, deleteDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('detalles-empleados-container');
  const id_usuario = localStorage.getItem('idUsuario');
  if (!id_usuario) return container.innerHTML = `<p>No se encontró información del empleado.</p>`;

  // Dinámicamente cargamos jefes y puestos desde Firebase
  let jefesInmediatos = [];
  let puestosJefes = [];

  async function fetchJefesYPuestos() {
    try {
      const jefesSnap = await getDocs(collection(db, "jefesInmediatos"));
      jefesSnap.forEach(doc => {
        const data = doc.data();
        if (data.nombre) jefesInmediatos.push(data.nombre);
      });

      const puestosSnap = await getDocs(collection(db, "puestosJefes"));
      puestosSnap.forEach(doc => {
        Object.values(doc.data()).forEach(nombre => {
          if (typeof nombre === "string") puestosJefes.push(nombre);
        });
      });
    } catch (error) {
      console.error("Error obteniendo jefes o puestos:", error);
    }
  }

  await fetchJefesYPuestos();

  const formatearFecha = (fecha) => {
    if (fecha?.seconds) return new Date(fecha.seconds * 1000).toISOString().split("T")[0];
    if (typeof fecha === 'string') return new Date(fecha).toISOString().split("T")[0];
    return '';
  };

  const cargarReportes = async (id_usuario) => {
    const lista = document.getElementById('lista-reportes');
    lista.innerHTML = "<p>Cargando reportes...</p>";

    try {
      const q = query(collection(db, 'solicitud'), where('id_usuario', '==', id_usuario));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return lista.innerHTML = "<p>No se encontraron reportes.</p>";

      let html = '<ul>';
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const fecha = formatearFecha(data.fecha_solicitud);
        const verArchivoBtn = Array.isArray(data.archivos_adjuntos) && data.archivos_adjuntos.length > 0
          ? `<button onclick='verArchivosAdjuntos(${JSON.stringify(data.archivos_adjuntos)})'>📄</button>` : '';

        html += `
          <li class="reporte-item">
            <p><strong>Motivo:</strong> ${data.motivo_falta}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Tipo:</strong> ${data.tipo_permiso}</p>
            <button onclick="modificarReporte('${docSnap.id}')">✏️</button>
            <button onclick="eliminarReporte('${docSnap.id}')">🗑️</button>
            ${verArchivoBtn}
          </li>`;
      });
      html += '</ul>';
      lista.innerHTML = html;
    } catch (e) {
      console.error("Error al cargar reportes:", e);
      lista.innerHTML = "<p>Error al cargar reportes.</p>";
    }
  };

  window.verArchivosAdjuntos = (archivos) => {
    archivos.forEach((archivo, index) => {
      const win = window.open();
      win.document.title = archivo.nombre || `Archivo ${index + 1}`;
      win.document.body.innerHTML = archivo.tipo.includes("pdf")
        ? `<embed src="${archivo.contenido_base64}" type="application/pdf" width="100%" height="90%"/>`
        : `<img src="${archivo.contenido_base64}" style="max-width:100%; max-height:90vh;" />`;
    });
  };

  window.eliminarReporte = async (id) => {
    if (confirm("¿Eliminar este reporte?")) {
      try {
        await deleteDoc(doc(db, 'solicitud', id));
        await cargarReportes(id_usuario);
      } catch (e) {
        alert("Error al eliminar.");
      }
    }
  };

  document.getElementById('cerrar-modal-modificar').addEventListener('click', () => {
    document.getElementById('modalModificarPermiso').classList.add('hidden');
  });

  const llenarCombos = (combo, opciones, seleccionado) => {
    combo.innerHTML = '<option value="">Selecciona</option>';
    opciones.forEach(op => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = op;
      if (op === seleccionado) opt.selected = true;
      combo.appendChild(opt);
    });
  };

  window.modificarReporte = async (id) => {
    try {
      const docSnap = await getDoc(doc(db, 'solicitud', id));
      if (!docSnap.exists()) return alert("Reporte no encontrado");

      const data = docSnap.data();
      document.getElementById('modalModificarPermiso').classList.remove('hidden');

      document.getElementById('idPermisoModificar').value = id;
      document.getElementById('modMotivo').value = data.motivo_falta || '';
      document.getElementById('modTipo').value = data.tipo_permiso || '';
      document.getElementById('modHorario').value = data.horario_laboral || '';
      document.getElementById('modFechaInicio').value = formatearFecha(data.rango_fechas?.inicio);
      document.getElementById('modFechaFin').value = formatearFecha(data.rango_fechas?.fin);
      document.getElementById('modHorasFalta').value = data.horas_falta || '';
      document.getElementById('modNombreEmpleado').value = data.nombre_empleado || '';
      document.getElementById('modPuestoEmpleado').value = data.puesto_empleado || '';

      llenarCombos(document.getElementById('modNombreJefe'), jefesInmediatos, data.nombre_jefe_inmediato);
      llenarCombos(document.getElementById('modPuestoJefe'), puestosJefes, data.puesto_jefe_inmediato);
      llenarCombos(document.getElementById('modNombreAutoriza'), jefesInmediatos, data.jefe_autoriza_permiso);
      llenarCombos(document.getElementById('modPuestoAutoriza'), puestosJefes, data.puesto_jefe_autoriza);
      llenarCombos(document.getElementById('modAutorizacion'), ["Con goce de sueldo", "Sin goce de sueldo"], data.autorizacion_goce_sueldo);

      const tipoPermisoSelect = document.getElementById('modTipo');
      const horasInput = document.getElementById('modHorasFalta');
      horasInput.disabled = tipoPermisoSelect.value !== 'Parcial';
      tipoPermisoSelect.addEventListener('change', () => {
        horasInput.disabled = tipoPermisoSelect.value !== 'Parcial';
      });

    } catch (e) {
      console.error("Error al cargar datos del permiso:", e);
    }
  };

  document.getElementById('form-modificar-permiso').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('idPermisoModificar').value;

    try {
      await updateDoc(doc(db, 'solicitud', id), {
        motivo_falta: document.getElementById('modMotivo').value,
        tipo_permiso: document.getElementById('modTipo').value,
        horario_laboral: document.getElementById('modHorario').value,
        rango_fechas: {
          inicio: document.getElementById('modFechaInicio').value,
          fin: document.getElementById('modFechaFin').value,
        },
        horas_falta: document.getElementById('modHorasFalta').value,
        autorizacion_goce_sueldo: document.getElementById('modAutorizacion').value,
        nombre_empleado: document.getElementById('modNombreEmpleado').value,
        puesto_empleado: document.getElementById('modPuestoEmpleado').value,
        nombre_jefe_inmediato: document.getElementById('modNombreJefe').value,
        puesto_jefe_inmediato: document.getElementById('modPuestoJefe').value,
        jefe_autoriza_permiso: document.getElementById('modNombreAutoriza').value,
        puesto_jefe_autoriza: document.getElementById('modPuestoAutoriza').value
      });

      alert("Actualizado correctamente.");
      document.getElementById('modalModificarPermiso').classList.add('hidden');
      await cargarReportes(id_usuario);
    } catch (err) {
      alert("No se pudo actualizar el permiso.");
      console.error(err);
    }
  });

  const fetchEmployeeData = async () => {
    try {
      const qEmpleados = query(collection(db, 'empleados'), where('id_usuario', '==', id_usuario));
      const querySnapshot = await getDocs(qEmpleados);
      if (querySnapshot.empty) return container.innerHTML = `<p>No se encontró información del empleado.</p>`;

      const data = querySnapshot.docs[0].data();
      const area = await getDoc(doc(db, 'areas', 'doc'));
      const areaNombre = area.exists() ? Object.keys(area.data()).find(k => area.data()[k] === data.Area) : 'No disponible';

      const dep = await getDoc(doc(db, 'departamentos', data.Area));
      const departamentoNombre = dep.exists() ? Object.keys(dep.data()).find(k => dep.data()[k] === data.Departamento) : 'No disponible';

      const permisos = await contarSolicitud(id_usuario);
      renderEmployee(data, areaNombre, departamentoNombre, permisos);
    } catch (e) {
      container.innerHTML = `<p>Error al obtener datos.</p>`;
    }
  };

  const contarSolicitud = async (id_usuario) => {
    const q = query(collection(db, 'solicitud'), where('id_usuario', '==', id_usuario));
    const snap = await getDocs(q);
    const contadores = { Personal: 0, Sindical: 0, Parcial: 0, Salud: 0 };
    snap.forEach(doc => contadores[doc.data().tipo_permiso]++);
    return contadores;
  };
  async function getColor(usados, tipo) {
    try {
      const snap = await getDoc(doc(db, 'limitePermisos', 'global'));
      const limites = snap.exists() ? snap.data() : {};
      const limite = limites[tipo.toLowerCase()] || 1;
      const porcentaje = usados / limite;
      if (porcentaje >= 1) return 'rojo';
      if (porcentaje >= 0.5) return 'naranja';
      return 'verde';
    } catch (e) {
      console.error("Error al obtener límites:", e);
      return 'verde';
    }
  }


  const renderEmployee = async (empleado, area, depto, permisos) => {
    const fechaIngreso = formatearFecha(empleado.fecha_contratacion);
    const fotoCruda = empleado.Foto || empleado.foto || '';
    const fotoUrl = (typeof fotoCruda === 'string' && fotoCruda.trim().length > 5)
      ? fotoCruda.trim().replace(/^"|"$/g, '') // quita comillas dobles si están incrustadas
      : 'https://via.placeholder.com/150';
    const personalColor = await getColor(permisos.Personal, 'personal');
    const saludColor = await getColor(permisos.Salud, 'salud');
    const sindicalColor = await getColor(permisos.Sindical, 'sindical');
    const parcialColor = await getColor(permisos.Parcial, 'parcial');

    container.innerHTML = `
  <div class="detalles-empleados">
    <div class="encabezado"><h1>Perfil de Empleado</h1></div>
    <div class="perfil-contenedor">
      <div class="seccion info-general">
        <img src="${fotoUrl}" alt="Empleado" class="empleado-foto-grande">
        <p><strong>Nombre:</strong> ${empleado.nombre}</p>
      </div>
      <div class="seccion info-secundaria">
        <div class="info-subseccion">
          <h2>Información</h2>
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Departamento:</strong> ${depto}</p>
          <p><strong>Puesto:</strong> ${empleado.puesto}</p>
          <p><strong>Fecha de ingreso:</strong> ${fechaIngreso}</p>
        </div>
        <div class="info-subseccion">
          <h2>Permisos solicitados <span id="ver-reportes-icon" style="cursor:pointer;">🗂️</span></h2>

          <div class="indicadores-globales">
            <span>Disponible <span class="indicador verde"></span></span>
            <span>Advertencia <span class="indicador naranja"></span></span>
            <span>Límite <span class="indicador rojo"></span></span>
          </div>

          <p><strong>Personal:</strong> ${permisos.Personal} <span class="indicador ${personalColor}"></span></p>
<p><strong>Salud:</strong> ${permisos.Salud} <span class="indicador ${saludColor}"></span></p>
<p><strong>Sindical:</strong> ${permisos.Sindical} <span class="indicador ${sindicalColor}"></span></p>
<p><strong>Parcial:</strong> ${permisos.Parcial} <span class="indicador ${parcialColor}"></span></p>

        </div>
        <div class="info-subseccion">
          <h2>Contacto</h2>
          <p><strong>Teléfono:</strong> ${empleado.numero_telefono}</p>
          <p><strong>Correo:</strong> ${empleado.correo}</p>
        </div>
      </div>
    </div>
  </div>
`;


    document.getElementById('ver-reportes-icon').addEventListener('click', () => {
      document.getElementById('modal-reportes').classList.remove('hidden');
      cargarReportes(id_usuario);
    });

    document.getElementById('cerrar-modal-reportes').addEventListener('click', () => {
      document.getElementById('modal-reportes').classList.add('hidden');
    });
  };

  fetchEmployeeData();
});

document.addEventListener("DOMContentLoaded", () => {
  // Toggle de menú lateral
  const toggleDropdown = (dropdown, menu, isOpen) => {
    dropdown.classList.toggle("open", isOpen);
    menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
  };

  const closeAllDropdowns = () => {
    document.querySelectorAll(".dropdown-container.open").forEach(openDropdown => {
      const menu = openDropdown.querySelector(".dropdown-menu");
      toggleDropdown(openDropdown, menu, false);
    });
  };

  document.querySelectorAll(".sidebar-toggler, .sidebar-menu-button").forEach(button => {
    button.addEventListener("click", () => {
      closeAllDropdowns();
      document.querySelector(".sidebar").classList.toggle("collapsed");
    });
  });

  document.querySelectorAll(".dropdown-container").forEach(container => {
    const toggle = container.querySelector(".dropdown-toggle");
    const menu = container.querySelector(".dropdown-menu");

    toggle.addEventListener("click", e => {
      e.preventDefault();
      const isOpen = container.classList.contains("open");
      closeAllDropdowns();
      toggleDropdown(container, menu, !isOpen);
    });
  });
});
