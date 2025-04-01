import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Variables globales para el listado de empleados y mapeos
let allEmployees = [];
let areaMap = {};
let deptMap = {};

// Variable para almacenar el id del documento del empleado actual (para actualizar)
let currentEmployeeDocId = null;

// Constantes para áreas y departamentos (usadas en el modal)
const areaCodes = {
  'Dirección General': 'A1',
  'Subdirección de planeación y vinculación': 'A2',
  'Subdirección de servicios administrativos': 'A3',
  'Subdirección académica': 'A4',
  'Docentes': 'A5'
};

const departmentCodes = {
  'Dirección General': {
    'Dirección General': '01',
    'Innovación y calidad': '02',
  },
  'Subdirección de planeación y vinculación': {
    'Subdirección de planeación y vinculación': '01',
    'Departamento de servicios escolares': '02',
    'Departamento de vinculación y extensión': '04',
    'Biblioteca': '05',
    'Médico General': '06',
  },
  'Subdirección de servicios administrativos': {
    'Subdirección de servicios administrativos': '01',
    'Departamento de recursos financieros': '02',
    'Departamento de recursos humanos': '03',
    'Departamento del centro de cómputo': '04',
    'Laboratorio': '05',
    'Departamento de recursos materiales y servicios generales': '06',
    'Archivos generales': '07',
    'Mantenimiento e intendencia': '08',
    'Vigilante': '09',
  },
  'Subdirección académica': {
    'Subdirección académica': '01',
    'Jefes de división': '02',
    'Departamento de psicología': '03',
    'Trabajo social': '04',
    'Laboratorios': '05',
  },
  'Docentes': {
    'Ingeniería Industrial': '01',
    'Lic. Administración': '02',
    'Ing. Sistemas computacionales': '03',
    'Ing. Civil': '04',
    'Extraescolares': '05',
    'Coordinación de lenguas': '06',
  },
};

// Elemento contenedor del listado de empleados
const employeesContainer = document.getElementById('employeesContainer');

// Función para poblar el select de áreas en el modal
function populateAreaSelect() {
  const selectArea = document.getElementById('areaSeleccionada');
  if (!selectArea) return;
  selectArea.innerHTML = '<option value="">Seleccione un área</option>';
  Object.keys(areaCodes).forEach(areaName => {
    const option = document.createElement('option');
    option.value = areaName; // Usamos el nombre para facilitar la comparación
    option.textContent = areaName;
    selectArea.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Si el modal existe, poblar el select de área
  if (document.getElementById('areaSeleccionada')) {
    populateAreaSelect();
  }
  
  // Carga de mapeos y listado de empleados
  await fetchAreaMap();
  await fetchDeptMap();
  await fetchAllEmployees();

  // Eventos para el buscador del listado de empleados
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  searchInput.addEventListener('input', handleSearch);
  searchButton.addEventListener('click', handleSearch);

  // Actualiza el select de departamentos en el modal al cambiar el área
  const selectAreaModal = document.getElementById('areaSeleccionada');
  if (selectAreaModal) {
    selectAreaModal.addEventListener('change', actualizarDepartamentoModal);
  }

  // Función para ver detalles (redirige a otra página)
  window.verDetalles = function (idUsuario) {
    window.location.href = `detallesEmpleados.html?id_usuario=${idUsuario}`;
  };

  // Eventos para el sidebar y dropdowns
  document.querySelectorAll(".sidebar-toggler, .sidebar-menu-button").forEach((button) => {
    button.addEventListener("click", () => {
      closeAllDropdowns();
      document.querySelector(".sidebar").classList.toggle("collapsed");
    });
  });
  document.querySelectorAll(".dropdown-toggle").forEach((dropdownToggle) => {
    dropdownToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const dropdown = dropdownToggle.closest(".dropdown-container");
      const menu = dropdown.querySelector(".dropdown-menu");
      const isOpen = dropdown.classList.contains("open");
      closeAllDropdowns();
      toggleDropdown(dropdown, menu, !isOpen);
    });
  });
  if (window.innerWidth <= 1024) {
    document.querySelector(".sidebar").classList.add("collapsed");
  }
});

// --- Funciones del listado de empleados ---
async function fetchAreaMap() {
  const docRef = doc(db, "areas", "doc");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    for (const [areaName, areaId] of Object.entries(data)) {
      areaMap[areaId] = areaName;
    }
  }
}

async function fetchDeptMap() {
  const deptCollectionRef = collection(db, "departamentos");
  const snapshot = await getDocs(deptCollectionRef);
  snapshot.forEach(docSnap => {
    const docId = docSnap.id;
    const data = docSnap.data();
    deptMap[docId] = {};
    for (const [deptName, deptId] of Object.entries(data)) {
      deptMap[docId][deptId] = deptName;
    }
  });
}

async function fetchAllEmployees() {
  const empleadosRef = collection(db, "empleados");
  const snapshot = await getDocs(empleadosRef);
  // Aquí incluimos el id del documento en cada objeto
  allEmployees = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  allEmployees.sort((a, b) => a.nombre.localeCompare(b.nombre));
  window.allEmployees = allEmployees;
  renderEmployees(allEmployees);
}

async function buscarUsuario(queryText) {
  if (!queryText) {
    renderEmployees(allEmployees);
    return;
  }
  const empleadosRef = collection(db, "empleados");
  const idSnapshot = await getDocs(query(empleadosRef, where('id_usuario', '>=', queryText), where('id_usuario', '<=', queryText + '\uf8ff')));
  const nombreSnapshot = await getDocs(query(empleadosRef, where('nombre', '>=', queryText), where('nombre', '<=', queryText + '\uf8ff')));
  
  const usuariosPorId = idSnapshot.docs.map(doc => doc.data());
  const usuariosPorNombre = nombreSnapshot.docs.map(doc => doc.data());
  
  const mapUnicos = new Map();
  [...usuariosPorId, ...usuariosPorNombre].forEach(usuario => {
    mapUnicos.set(usuario.id_usuario, usuario);
  });
  
  let resultadosUnicos = Array.from(mapUnicos.values());
  resultadosUnicos.sort((a, b) => a.nombre.localeCompare(b.nombre));
  renderEmployees(resultadosUnicos);
}

function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const value = searchInput.value.trim();
  const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
  buscarUsuario(capitalizedValue);
}

function renderEmployees(employeesList) {
  if (!employeesContainer) return;
  if (!employeesList || employeesList.length === 0) {
    employeesContainer.innerHTML = '<p>No se encontraron usuarios</p>';
    return;
  }
  
  let html = '';
  employeesList.forEach(usuario => {
    const { nombre, Area, Departamento, Foto, id_usuario } = usuario;
    const areaName = areaMap[Area] || `Área desconocida (${Area})`;
    let deptName = `Departamento desconocido`;
    if (deptMap[Area]) {
      deptName = deptMap[Area][Departamento] || `Depto. desconocido (${Departamento})`;
    }
    
    html += `
      <div class="card">
        <div class="card-info">
          <div class="card-avatar">
            ${Foto ? `<img src="${Foto}" alt="${nombre}">` : ''}
          </div>
          <div class="card-title">${nombre || "Sin nombre"}</div>
          <div class="card-subtitle">
            <p>Área: ${areaName}</p>
            <p>Departamento: ${deptName}</p>
          </div>
        </div>
        <ul class="card-social">
          <li class="card-social__item" onclick="window.verDetalles('${id_usuario}')" title="Detalles del empleado">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
            </svg>
          </li>
          <li class="card-social__item" onclick="openModalSolicitud()" title="Solicitud de permiso">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-medical" viewBox="0 0 16 16">
              <path d="M7.5 5.5a.5.5 0 0 0-1 0v.634l-.549-.317a.5.5 0 1 0-.5.866L6 7l-.549.317a.5.5 0 1 0 .5.866l.549-.317V8.5a.5.5 0 1 0 1 0v-.634l.549.317a.5.5 0 1 0 .5-.866L8 7l.549-.317a.5.5 0 1 0-.5-.866l-.549.317z"/>
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
            </svg>
          </li>
          <li class="card-social__item" onclick="openModalEmpleado('${id_usuario}')" title="Modificar Datos">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
            </svg>
          </li>
        </ul>
      </div>
    `;
  });
  employeesContainer.innerHTML = html;
}

// --- Funciones para dropdowns y sidebar ---
const toggleDropdown = (dropdown, menu, isOpen) => {
  dropdown.classList.toggle("open", isOpen);
  menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
};

const closeAllDropdowns = () => {
  document.querySelectorAll(".dropdown-container.open").forEach((openDropdown) => {
    toggleDropdown(openDropdown, openDropdown.querySelector(".dropdown-menu"), false);
  });
};

// --- Funciones para el modal de Agregar/Modificar Empleado ---
// Actualiza el select de departamentos según el área seleccionada en el modal
function actualizarDepartamentoModal() {
  const selectArea = document.getElementById('areaSeleccionada');
  const selectDepartamento = document.getElementById('departamentoSeleccionado');
  const campoDocente = document.getElementById('campoDocente');
  const selectDocente = document.getElementById('docenteSeleccionado');
  const area = selectArea.value;
  selectDepartamento.innerHTML = '<option value="">Seleccione un departamento</option>';
  if (area && departmentCodes[area]) {
    Object.keys(departmentCodes[area]).forEach(dep => {
      const option = document.createElement('option');
      option.value = dep;
      option.textContent = dep;
      selectDepartamento.appendChild(option);
    });
  }
  if (area === 'Docentes') {
    campoDocente.style.display = 'block';
  } else {
    campoDocente.style.display = 'none';
    selectDocente.value = "";
  }
}

// Modal: Guardar (agregar o actualizar) empleado
async function guardarEmpleado() {
  const inputCorreo = document.getElementById('correo');
  const inputIdUsuario = document.getElementById('idUsuario');
  const selectTipoUsuario = document.getElementById('tipoUsuario');
  const inputNombre = document.getElementById('nombre');
  const inputFechaContratacion = document.getElementById('fechaContratacion');
  const inputPuesto = document.getElementById('puesto');
  const inputFoto = document.getElementById('foto');
  const inputNumeroTelefono = document.getElementById('numeroTelefono');
  const selectArea = document.getElementById('areaSeleccionada');
  const selectDepartamento = document.getElementById('departamentoSeleccionado');
  const selectDocente = document.getElementById('docenteSeleccionado');
  const selectTipoEmpleado = document.getElementById('tipoEmpleadoSeleccionado');

  const empleadoData = {
    id_usuario: inputIdUsuario.value.trim(),
    nombre: inputNombre.value.trim(),
    correo: inputCorreo.value.trim(),
    tipo_usuario: selectTipoUsuario.value,
    fecha_contratacion: inputFechaContratacion.value
      ? Timestamp.fromDate(new Date(inputFechaContratacion.value + 'T00:00:00'))
      : null,
    puesto: inputPuesto.value.trim(),
    Foto: inputFoto.value.trim(),
    numero_telefono: inputNumeroTelefono.value.trim(),
    Area: areaCodes[selectArea.value] || '',
    Departamento: (departmentCodes[selectArea.value] || {})[selectDepartamento.value] || '',
    Docente: selectDocente.value || null,
    TipoEmpleado: selectTipoEmpleado.value,
  };

  try {
    // Si currentEmployeeDocId existe, actualizamos directamente
    if (currentEmployeeDocId) {
      await updateDoc(doc(db, "empleados", currentEmployeeDocId), empleadoData);
      alert("Empleado actualizado correctamente");
    } else {
      await addDoc(collection(db, "empleados"), empleadoData);
      alert("Empleado agregado correctamente");
    }
    window.location.href = '/PrincipalAdmin.html';
  } catch (error) {
    console.error("Error al guardar el empleado:", error);
    alert("Hubo un error al guardar el empleado.");
  }
}

// Modal: Cargar datos del empleado en el formulario (para modificar)
function cargarEmpleado(emp) {
  document.getElementById('correo').value = emp.correo || '';
  document.getElementById('idUsuario').value = emp.id_usuario || '';
  document.getElementById('tipoUsuario').value = emp.tipo_usuario || 'usuario';
  document.getElementById('nombre').value = emp.nombre || '';
  if (emp.fecha_contratacion) {
    let fecha = '';
    if (emp.fecha_contratacion.toDate) {
      fecha = emp.fecha_contratacion.toDate().toISOString().split('T')[0];
    } else {
      fecha = emp.fecha_contratacion;
    }
    document.getElementById('fechaContratacion').value = fecha;
  } else {
    document.getElementById('fechaContratacion').value = '';
  }
  document.getElementById('puesto').value = emp.puesto || '';
  document.getElementById('foto').value = emp.Foto || '';
  document.getElementById('numeroTelefono').value = emp.numero_telefono || '';
  const areaEncontrada = Object.keys(areaCodes).find(key => areaCodes[key] === emp.Area) || '';
  document.getElementById('areaSeleccionada').value = areaEncontrada;
  actualizarDepartamentoModal();
  document.getElementById('departamentoSeleccionado').value = Object.keys(departmentCodes[areaEncontrada] || {}).find(
    key => departmentCodes[areaEncontrada][key] === emp.Departamento
  ) || '';
  document.getElementById('docenteSeleccionado').value = emp.Docente || '';
  document.getElementById('tipoEmpleadoSeleccionado').value = emp.TipoEmpleado || '';
  // Guardamos el id del documento para actualizar en guardarEmpleado()
  currentEmployeeDocId = emp.id || null;
}

// Modal: Abrir el modal de Agregar/Modificar y cargar datos (para modificar)
function openModalEmpleado(empId) {
  const emp = window.allEmployees.find(e => String(e.id_usuario) === String(empId));
  if (emp) {
    populateAreaSelect();
    cargarEmpleado(emp);
  } else {
    console.log("Empleado no encontrado para id:", empId);
  }
  document.getElementById("modalEmpleado").style.display = "block";
}

// --- Funciones para abrir/cerrar modales ---
function openModalSolicitud() {
  document.getElementById("modalSolicitud").style.display = "block";
}

function closeModalSolicitud() {
  document.getElementById("modalSolicitud").style.display = "none";
}

function closeModalEmpleado() {
  const modal = document.getElementById("modalEmpleado");
  modal.style.display = "none";
  const form = document.getElementById("formEmpleado");
  if (form) {
    form.reset();
  }
  // Reiniciamos la variable del documento
  currentEmployeeDocId = null;
}

window.addEventListener('click', function(event) {
  if (event.target.id === 'modalSolicitud') {
    closeModalSolicitud();
  }
  if (event.target.id === 'modalEmpleado') {
    closeModalEmpleado();
  }
});

// Exponer funciones globalmente para uso en HTML
window.openModalEmpleado = openModalEmpleado;
window.openModalSolicitud = openModalSolicitud;
window.closeModalEmpleado = closeModalEmpleado;
window.closeModalSolicitud = closeModalSolicitud;
window.guardarEmpleado = guardarEmpleado;
