// IMPORTACIONES DE FIREBASE Y MÉTODOS DE FIRESTORE
import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc, deleteDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// SweetAlert2
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

// VARIABLES GLOBALES PARA GESTIONAR EMPLEADOS Y SOLICITUDES
let allEmployees = [];
let areaMap = {};   // { 'A1': 'Dirección General', ... }
let deptMap = {};   // { 'A1': { '01': 'Dirección General', ... }, ... }
let currentEmployeeDocId = null;
let currentEmpSolicitud = null; // Almacena el empleado seleccionado para la solicitud
let archivosAdjuntos = [];     // Almacena los archivos seleccionados en la solicitud

// CONSTANTES DE ÁREAS Y DEPARTAMENTOS
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

// ELEMENTOS DEL DOM
const employeesContainer = document.getElementById('employeesContainer');

// --- CARGA DINÁMICA DE ÁREAS Y DEPARTAMENTOS DESDE FIRESTORE ---
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
    const areaId = docSnap.id;
    const data = docSnap.data();
    deptMap[areaId] = {};
    for (const [deptName, deptId] of Object.entries(data)) {
      deptMap[areaId][deptId] = deptName;
    }
  });
}

async function fetchAllEmployees() {
  const empleadosRef = collection(db, "empleados");
  const snapshot = await getDocs(empleadosRef);
  allEmployees = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  allEmployees.sort((a, b) => a.nombre.localeCompare(b.nombre));
  window.allEmployees = allEmployees;
  renderEmployees(allEmployees);
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
    <!-- botón de borrar en esquina, con onclick y cerrado -->
    <button
      class="delete-btn"
      onclick="deleteEmployee('${id_usuario}')"
      title="Eliminar empleado">
      <!-- SVG de papelera -->
      <svg xmlns="http://www.w3.org/2000/svg"
           width="18" height="18"
           viewBox="0 0 16 16" fill="currentColor">
        <path d="M5.5 5.5A.5.5 0 0 1 6 5h4a.5.5 0 0 1 .5.5v8
                 a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-8z"/>
        <path fill-rule="evenodd"
              d="M4.118 4 4 4.059V13a2 2 0 0 0 2 2h4
                 a2 2 0 0 0 2-2V4.059L11.882 4H4.118z
                 M2.5 2a.5.5 0 0 1 .5-.5h10a.5.5
                 0 0 1 .5.5V3h-11V2z"/>
      </svg>
    </button>
        
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
          <li class="card-social__item" onclick="openModalSolicitud('${id_usuario}')" title="Solicitud de permiso">
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
async function deleteEmployee(id_usuario) {
  const emp = allEmployees.find(e => String(e.id_usuario) === String(id_usuario));
  if (!emp) { await Swal.fire('Error', 'Empleado no encontrado', 'error'); return; }
  const resp = await Swal.fire({
    title: `¿Eliminar a ${emp.nombre}?`, text: 'No hay vuelta atrás.', icon: 'warning',
    showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
  });
  if (resp.isConfirmed) {
    try {
      await deleteDoc(doc(db, 'empleados', emp.id));
      await Swal.fire('Eliminado', 'Empleado eliminado', 'success');
      await fetchAllEmployees();
    } catch (err) { console.error(err); await Swal.fire('Error', 'No se pudo eliminar', 'error'); }
  }
}
window.deleteEmployee = deleteEmployee;

async function buscarUsuario(queryText) {
  function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  if (!queryText) {
    renderEmployees(allEmployees);
    return;
  }

  const lowerQuery = removeDiacritics(queryText.toLowerCase());

  const empleadosRef = collection(db, "empleados");

  // Búsqueda por ID (coincidencias que comiencen con el texto)
  const idSnapshot = await getDocs(
    query(empleadosRef, where("id_usuario", ">=", queryText), where("id_usuario", "<=", queryText + "\uf8ff"))
  );

  // Búsqueda por nombre (ignora acentos y mayúsculas)
  const allSnapshot = await getDocs(empleadosRef);
  const empleadosNombre = allSnapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id }))
    .filter((emp) => {
      if (!emp.nombre) return false;
      const nombreNormalizado = removeDiacritics(emp.nombre.toLowerCase());
      return nombreNormalizado.includes(lowerQuery);
    });

  const empleadosPorId = idSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

  // Unir y eliminar duplicados por id_usuario
  const mapUnicos = new Map();
  [...empleadosPorId, ...empleadosNombre].forEach((emp) => {
    mapUnicos.set(emp.id_usuario, emp);
  });

  const resultados = Array.from(mapUnicos.values());
  resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));

  renderEmployees(resultados);
}


function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const value = searchInput.value.trim();
  const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
  buscarUsuario(capitalizedValue);
}

// --- FUNCIONES PARA SIDEBAR Y DROPDOWNS ---
const toggleDropdown = (dropdown, menu, isOpen) => {
  dropdown.classList.toggle("open", isOpen);
  menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
};

const closeAllDropdowns = () => {
  document.querySelectorAll(".dropdown-container.open").forEach((openDropdown) => {
    toggleDropdown(openDropdown, openDropdown.querySelector(".dropdown-menu"), false);
  });
};

// --- FUNCIONES DEL MODAL DE SOLICITUD DE PERMISO ---
function openModalSolicitud(empId) {
  const emp = window.allEmployees.find(e => String(e.id_usuario) === String(empId));
  if (emp) {
    currentEmpSolicitud = emp;
    document.getElementById('empleadoNombre').value = emp.nombre || '';
    document.getElementById('empleadoPuesto').value = emp.puesto || '';
  }
  document.getElementById('modalSolicitud').style.display = 'block';
}

// --- FUNCIONES DEL MODAL DE AGREGAR/MODIFICAR EMPLEADO ---
function populateAreaSelect() {
  const selectArea = document.getElementById('areaSeleccionada');
  if (!selectArea) return;
  selectArea.innerHTML = '<option value="">Seleccione un área</option>';

  // Usar areaMap que tiene estructura: { 'A1': 'Dirección General', ... }
  Object.entries(areaMap).forEach(([areaId, areaName]) => {
    const option = document.createElement('option');
    option.value = areaId; // ahora se guarda el ID directamente
    option.textContent = areaName;
    selectArea.appendChild(option);
  });
}


async function actualizarDepartamentoModal() {
  const selectArea = document.getElementById('areaSeleccionada');
  const selectDepartamento = document.getElementById('departamentoSeleccionado');
  const campoDocente = document.getElementById('campoDocente');
  const selectDocente = document.getElementById('docenteSeleccionado');
  const area = selectArea.value;
  selectDepartamento.innerHTML = '<option value="">Seleccione un departamento</option>';
  if (area && deptMap[area]) {
    Object.entries(deptMap[area]).forEach(([depId, depName]) => {
      const option = document.createElement('option');
      option.value = depId;
      option.textContent = depName;
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

  // 1) Correo válido
  const correoVal = inputCorreo.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!correoVal || !emailRegex.test(correoVal)) {
    await Swal.fire("Correo inválido", "Ingresa un correo en formato válido.", "warning");
    return;
  }

  // 2) ID usuario numérico
  const idVal = inputIdUsuario.value.trim();
  if (!/^\d+$/.test(idVal)) {
    await Swal.fire("ID inválido", "El ID de usuario debe ser un número.", "warning");
    return;
  }

  // 3) Tipo de usuario
  if (!selectTipoUsuario.value) {
    await Swal.fire("Selecciona tipo", "Debes elegir un tipo de usuario.", "warning");
    return;
  }

  // 4) Nombre no vacío
  const nombreVal = inputNombre.value.trim();
  if (!nombreVal) {
    await Swal.fire("Falta nombre", "Ingresa el nombre del empleado.", "warning");
    return;
  }

  // 5) Fecha de contratación
  const fechaVal = inputFechaContratacion.value;
  if (!fechaVal) {
    await Swal.fire("Falta fecha", "Selecciona la fecha de contratación.", "warning");
    return;
  }

  // 6) Puesto no vacío
  const puestoVal = inputPuesto.value.trim();
  if (!puestoVal) {
    await Swal.fire("Falta puesto", "Ingresa el puesto del empleado.", "warning");
    return;
  }

  // 7) Teléfono en formato 638-104-6882 ó 638 104 6882 ó 6381046882
  const telVal = inputNumeroTelefono.value.trim();
  const telRegex = /^[0-9]{3}[- ]?[0-9]{3}[- ]?[0-9]{4}$/;
  if (!telRegex.test(telVal)) {
    await Swal.fire("Teléfono inválido", "Ingrese un teléfono de 10 dígitos (ej. 123-456-7890).", "warning");
    return;
  }

  // 8) Área y departamento
  if (!selectArea.value) {
    await Swal.fire("Falta área", "Selecciona un área.", "warning");
    return;
  }
  if (!selectDepartamento.value) {
    await Swal.fire("Falta departamento", "Selecciona un departamento.", "warning");
    return;
  }

  // 9) Si es Docente, debe seleccionar tipo de docente
  if (selectArea.value === 'Docentes' && !selectDocente.value) {
    await Swal.fire("Falta tipo de docente", "Selecciona el tipo de docente.", "warning");
    return;
  }

  // 10) Tipo de empleado
  if (!selectTipoEmpleado.value) {
    await Swal.fire("Falta tipo de empleado", "Selecciona el tipo de empleado.", "warning");
    return;
  }

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
    Area: selectArea.value,  // ya es el ID directamente
    Departamento: selectDepartamento.value,
    Docente: selectDocente.value || null,
    TipoEmpleado: selectTipoEmpleado.value,
  };

  try {
    if (currentEmployeeDocId) {
      await updateDoc(doc(db, "empleados", currentEmployeeDocId), empleadoData);
      await Swal.fire("Actualizado", "Empleado actualizado correctamente", "success");
    } else {
      await addDoc(collection(db, "empleados"), empleadoData);
      await Swal.fire("Agregado", "Empleado agregado correctamente", "success");
    }
    window.location.href = './principalAdmin.html';
  } catch (error) {
    console.error("Error al guardar el empleado:", error);
    await Swal.fire("Error", "Hubo un error al guardar el empleado.", "error");
  }
}


async function cargarEmpleado(emp) {
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

  // Establece el área
  const areaId = emp.Area || '';
  document.getElementById('areaSeleccionada').value = areaId;

  // Esperamos a que los departamentos se carguen según el área
  await actualizarDepartamentoModal(); // debe ser async también si carga opciones desde mapa

  // Luego seleccionamos el departamento por coincidencia exacta o por nombre
 // Seleccionamos el departamento por ID directamente
document.getElementById('departamentoSeleccionado').value = emp.Departamento || '';


  document.getElementById('docenteSeleccionado').value = emp.Docente || '';
  document.getElementById('tipoEmpleadoSeleccionado').value = emp.TipoEmpleado || '';
  currentEmployeeDocId = emp.id || null;
}



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

// --- EVENTOS DE INICIALIZACIÓN ---
// --- FUNCIONES PARA OBTENER JEFES Y PUESTOS DESDE FIRESTORE ---
async function fetchJefesYPuestos() {
  const jefes = [];
  const puestos = [];

  try {
    const jefesSnap = await getDocs(collection(db, "jefesInmediatos"));
    jefesSnap.forEach(doc => {
      const data = doc.data();
      if (data.nombre) jefes.push(data.nombre);
    });

    const puestosSnap = await getDocs(collection(db, "puestosJefes"));
    puestosSnap.forEach(doc => {
      Object.values(doc.data()).forEach(nombre => {
        if (typeof nombre === "string") puestos.push(nombre);
      });
    });

  } catch (error) {
    console.error("Error obteniendo jefes o puestos:", error);
  }

  return { jefes, puestos };
}

// --- EVENTOS DE INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {

  // Inicializar el select de áreas para el modal de empleado
  if (document.getElementById('areaSeleccionada')) {
    populateAreaSelect();
  }

  await fetchAreaMap();
  await fetchDeptMap();
  await fetchAllEmployees();

  // Configurar búsqueda en el listado
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  searchInput.addEventListener('input', handleSearch);
  searchButton.addEventListener('click', handleSearch);

  // Configurar cambio de área en el modal de empleado
  const selectAreaModal = document.getElementById('areaSeleccionada');
  if (selectAreaModal) {
    selectAreaModal.addEventListener('change', actualizarDepartamentoModal);
  }

  // Configurar eventos del sidebar y dropdowns
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

  // --- FUNCIONALIDAD DE SOLICITUD DE PERMISO ---
  // Función auxiliar para poblar selects con opciones
  const populateSelect = (selectId, options) => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '<option value="">Selecciona</option>';
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });
    }
  };

  const { jefes, puestos } = await fetchJefesYPuestos();
  populateSelect('nombreJefe', jefes);
  populateSelect('puestoJefe', puestos);
  populateSelect('jefeAutoriza', jefes);
  populateSelect('puestoJefeAutoriza', puestos);


  // Configurar el input de archivos adjuntos en la solicitud
  const fileInput = document.getElementById('fileAdjuntos');
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files);
      archivosAdjuntos = archivosAdjuntos.concat(files);
      mostrarListaArchivos();
    });

  }

  // Configurar el input de "horas de la falta"
  const horasFaltaInput = document.getElementById('horasFalta');
  if (horasFaltaInput) {
    horasFaltaInput.addEventListener('input', (e) => {
      let input = e.target.value;
      if (input.length === 2 || input.length === 8) {
        input += ":";
      }
      if (input.length === 5) {
        input += "-";
      }
      const regex = /^[0-9:-]*$/;
      if (regex.test(input)) {
        e.target.value = input;
      }
    });
  }

  // Habilitar/deshabilitar el campo "horasFalta" según el tipo de permiso
  const tipoPermisoSelect = document.getElementById('tipoPermiso');
  if (tipoPermisoSelect && horasFaltaInput) {
    tipoPermisoSelect.addEventListener('change', (e) => {
      const selectedTipo = e.target.value;
      if (selectedTipo !== "Parcial") {
        horasFaltaInput.value = "";
        horasFaltaInput.disabled = true;
      } else {
        horasFaltaInput.disabled = false;
      }
    });
  }
});
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result); // incluye tipo MIME
    reader.onerror = error => reject(error);
  });
}


// --- FUNCIONES PARA ENVIAR SOLICITUD ---
async function enviarSolicitud() {
  const btn = document.getElementById("btnEnviarSolicitud");
  btn.disabled = true;

  // 1) Validaciones...
  const motivoFalta = document.getElementById('motivoFalta').value.trim();
  const inicioDate = document.getElementById('fechaInicio').value;
  const finDate = document.getElementById('fechaFin').value;
  const tipoPerm = document.getElementById('tipoPermiso').value;
  const horasFalt = tipoPerm === "Parcial"
    ? document.getElementById('horasFalta').value.trim()
    : null;
  const autoriz = document.getElementById('autorizacion').value;
  const nomJ = document.getElementById('nombreJefe').value;
  const puestoJ = document.getElementById('puestoJefe').value;
  const nomA = document.getElementById('jefeAutoriza').value;
  const puestoA = document.getElementById('puestoJefeAutoriza').value;
  const horaIni = document.getElementById('horarioInicio').value;
  const horaFin = document.getElementById('horarioFin').value;

  if (!motivoFalta) {
    await Swal.fire("Falta motivo", "Ingresa el motivo de la falta.", "warning");
    btn.disabled = false; return;
  }
  if (!inicioDate || !finDate) {
    await Swal.fire("Falta fechas", "Selecciona fecha de inicio y fin.", "warning");
    btn.disabled = false; return;
  }
  if (new Date(inicioDate) > new Date(finDate)) {
    await Swal.fire("Fechas inválidas", "La fecha de inicio no puede superar a la de fin.", "warning");
    btn.disabled = false; return;
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horaIni) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin)) {
    await Swal.fire("Formato horario", "Usa HH:mm para inicio y fin.", "warning");
    btn.disabled = false; return;
  }
  if (!tipoPerm) {
    await Swal.fire("Falta tipo", "Selecciona un tipo de permiso.", "warning");
    btn.disabled = false; return;
  }
  if (tipoPerm === "Parcial" &&
    !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(horasFalt)) {
    await Swal.fire("Horario parcial", "Usa formato HH:mm-HH:mm.", "warning");
    btn.disabled = false; return;
  }
  if (!autoriz) {
    await Swal.fire("Falta autorización", "Selecciona el tipo de autorización.", "warning");
    btn.disabled = false; return;
  }
  if (!nomJ || !puestoJ) {
    await Swal.fire("Falta jefe inmediato", "Selecciona nombre y puesto.", "warning");
    btn.disabled = false; return;
  }
  if (!nomA || !puestoA) {
    await Swal.fire("Falta quien autoriza", "Selecciona nombre y puesto.", "warning");
    btn.disabled = false; return;
  }
  if (archivosAdjuntos.length === 0) {
    await Swal.fire("Sin adjuntos", "Agrega al menos un PDF o JPG.", "warning");
    btn.disabled = false; return;
  }
  for (const f of archivosAdjuntos) {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg'].includes(ext)) {
      await Swal.fire("Tipo inválido", "Solo PDF o JPG.", "warning");
      btn.disabled = false; return;
    }
  }

  // 2) Construcción de los datos a enviar
  const numPerm = "1";
  const { id_usuario, Area, Departamento } = currentEmpSolicitud;
  const idPermiso = `${Area}${Departamento}${numPerm}-${id_usuario}`;
  const fechaSol = new Date().toLocaleString("en-US", { timeZone: "America/Hermosillo" });
  const archivos = await Promise.all(
    archivosAdjuntos.map(async file => ({
      nombre: file.name,
      tipo: file.type,
      contenido_base64: await fileToBase64(file)
    }))
  );

  // 3) Envío a Firestore
  try {
    await addDoc(collection(db, "solicitud"), {
      id_permiso: idPermiso,
      id_usuario,
      nombre_empleado: currentEmpSolicitud.nombre,
      puesto_empleado: currentEmpSolicitud.puesto,
      motivo_falta: motivoFalta,
      rango_fechas: { inicio: inicioDate, fin: finDate },
      horario_laboral: `${horaIni}-${horaFin}`,
      tipo_permiso: tipoPerm,
      horas_falta: horasFalt,
      autorizacion_goce_sueldo: autoriz,
      nombre_jefe_inmediato: nomJ,
      puesto_jefe_inmediato: puestoJ,
      jefe_autoriza_permiso: nomA,
      puesto_jefe_autoriza: puestoA,
      archivos_adjuntos: archivos,
      fecha_solicitud: fechaSol
    });
    await Swal.fire("¡Listo!", "Solicitud enviada correctamente.", "success");
    document.getElementById('form-permiso').reset();
    archivosAdjuntos = [];
    document.getElementById('horasFalta').disabled = true;
    closeModalSolicitud();
  } catch (err) {
    console.error(err);
    await Swal.fire("Error", "No se pudo enviar la solicitud.", "error");
  } finally {
    btn.disabled = false;
  }
}

// --- FUNCIONES PARA CERRAR MODALES ---
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
  currentEmployeeDocId = null;
}

window.addEventListener('click', function (event) {
  if (event.target.id === 'modalSolicitud') {
    closeModalSolicitud();
  }
  if (event.target.id === 'modalEmpleado') {
    closeModalEmpleado();
  }
});

// --- OTRAS FUNCIONES Y ASIGNACIÓN DE EVENTOS GLOBALES ---
window.verDetalles = function (idUsuario) {
  localStorage.setItem("idUsuario", idUsuario);
  window.location.href = "detallesEmpleados.html";
};


window.openModalEmpleado = openModalEmpleado;
window.openModalSolicitud = openModalSolicitud;
window.closeModalEmpleado = closeModalEmpleado;
window.closeModalSolicitud = closeModalSolicitud;
window.guardarEmpleado = guardarEmpleado;
window.enviarSolicitud = enviarSolicitud;

function mostrarListaArchivos() {
  const lista = document.getElementById('listaArchivos');
  lista.innerHTML = '';
  archivosAdjuntos.forEach((archivo, index) => {
    const li = document.createElement('li');
    // Nombre del archivo
    const texto = document.createTextNode(archivo.name + ' ');
    // Botón de eliminar sin disparar submit
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Eliminar';
    btn.addEventListener('click', () => eliminarArchivo(index));
    // Montaje
    li.appendChild(texto);
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

function eliminarArchivo(index) {
  const archivoEliminado = archivosAdjuntos.splice(index, 1)[0];  // elimina y obtiene el archivo
  mostrarListaArchivos();                                        // re-renderiza la lista
  Swal.fire("Archivo eliminado", `${archivoEliminado.name} ha sido removido.`, "info");
}


const auth = getAuth();

document.getElementById('btnCerrarSesion').addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    await signOut(auth);
    await Swal.fire("Sesión cerrada", "Has cerrado sesión correctamente", "success");
    window.location.href = "Login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    await Swal.fire("Error", "No se pudo cerrar la sesión. Intenta de nuevo.", "error");
  }
});


