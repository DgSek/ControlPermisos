import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

let allEmployees = [];
let areaMap = {};
let deptMap = {};

const employeesContainer = document.getElementById('employeesContainer');

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  // Cargar mapeos y empleados
  await fetchAreaMap();
  await fetchDeptMap();
  await fetchAllEmployees();

  // Eventos para la búsqueda
  searchInput.addEventListener('input', handleSearch);
  searchButton.addEventListener('click', handleSearch);

  // Exponer función para ver detalles (utilizada en las tarjetas)
  window.verDetalles = function (idUsuario) {
    window.location.href = `detallesEmpleados.html?id_usuario=${idUsuario}`;
  };

  // Sidebar: eventos para togglear y dropdowns
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

  // Colapsar el sidebar en pantallas pequeñas
  if (window.innerWidth <= 1024) {
    document.querySelector(".sidebar").classList.add("collapsed");
  }
});

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
  allEmployees = snapshot.docs.map(doc => doc.data());
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
  
  const resultadosUnicos = Array.from(mapUnicos.values());
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
          <li class="card-social__item" onclick="window.location.href='detallesEmpleados.html?id_usuario=${id_usuario}'" title="Detalles del empleado">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
            </svg>
          </li>
          <li class="card-social__item" onclick="window.location.href='solicitudPermiso.html'" title="Solicitud de permiso">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-medical" viewBox="0 0 16 16">
              <path d="M7.5 5.5a.5.5 0 0 0-1 0v.634l-.549-.317a.5.5 0 1 0-.5.866L6 7l-.549.317a.5.5 0 1 0 .5.866l.549-.317V8.5a.5.5 0 1 0 1 0v-.634l.549.317a.5.5 0 1 0 .5-.866L8 7l.549-.317a.5.5 0 1 0-.5-.866l-.549.317zm-2 4.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zm0 2a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z"/>
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/>
            </svg>
          </li>
          <li class="card-social__item" onclick="window.location.href='agregarEmpleado.html'" title="Agregar empleado">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
            </svg>
          </li>
        </ul>
      </div>
    `;
  });
  employeesContainer.innerHTML = html;
}


// Funciones para el manejo de dropdowns en el sidebar
const toggleDropdown = (dropdown, menu, isOpen) => {
  dropdown.classList.toggle("open", isOpen);
  menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
};

const closeAllDropdowns = () => {
  document.querySelectorAll(".dropdown-container.open").forEach((openDropdown) => {
    toggleDropdown(openDropdown, openDropdown.querySelector(".dropdown-menu"), false);
  });
};
