import { db } from '../BD/firebaseConfig.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------
  // Funcionalidad del Sidebar Global (estática)
  // -----------------------------
  const toggleDropdown = (dropdown, menu, isOpen) => {
    dropdown.classList.toggle("open", isOpen);
    menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
  };

  const closeAllDropdowns = () => {
    document.querySelectorAll(".dropdown-container.open").forEach((openDropdown) => {
      const menu = openDropdown.querySelector(".dropdown-menu");
      toggleDropdown(openDropdown, menu, false);
    });
  };

  // Abrir/cerrar el sidebar
  document.querySelectorAll(".sidebar-toggler, .sidebar-menu-button").forEach((button) => {
    button.addEventListener("click", () => {
      closeAllDropdowns();
      document.querySelector(".sidebar").classList.toggle("collapsed");
    });
  });

  // Enlazar eventos de click a los dropdown-toggle (en modo expandido)
  function bindDropdownToggles() {
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
  }

  if (window.innerWidth <= 1024) {
    document.querySelector(".sidebar").classList.add("collapsed");
  }

  // -----------------------------
  // Funcionalidad del Reporte (consultas, renderizado, etc.)
  // -----------------------------
  let solicitudes = [];
  let todasLasSolicitudes = [];
  let tituloReporte = 'Seleccione "General" para ver el reporte de permisos.';
  let empleados = [];
  let empleadoSeleccionado = "";
  let fechaInicio = "";
  let fechaFin = "";

  const primaryMenuEl = document.getElementById('primary-menu');
  const reporteContenidoEl = document.getElementById('reporte-contenido');

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
      'Innovación y calidad': '02'
    },
    'Subdirección de planeación y vinculación': {
      'Subdirección de planeación y vinculación': '01',
      'Departamento de servicios escolares': '02',
      'Departamento de vinculación y extensión': '04',
      'Biblioteca': '05',
      'Médico General': '06'
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
      'Vigilante': '09'
    },
    'Subdirección académica': {
      'Subdirección académica': '01',
      'Jefes de división': '02',
      'Departamento de psicología': '03',
      'Trabajo social': '04',
      'Laboratorios': '05'
    },
    'Docentes': {
      'Ingeniería Industrial': '01',
      'Lic. Administración': '02',
      'Ing. Sistemas computacionales': '03',
      'Ing. Civil': '04',
      'Extraescolares': '05',
      'Coordinación de lenguas': '06'
    }
  };

  function extractEmployeeNumbers(solicitudesList) {
    return solicitudesList.map(solicitud => {
      const parts = solicitud.id_permiso.split('-');
      return parts[1];
    });
  }

  async function fetchEmployees(employeeNumbers) {
    try {
      const empleadosRef = collection(db, 'empleados');
      const empleadosSnapshot = await getDocs(empleadosRef);
      const empleadosData = empleadosSnapshot.docs
        .map(doc => doc.data())
        .filter(empleado => empleado.id_usuario && employeeNumbers.includes(empleado.id_usuario.toString()));
      empleados = empleadosData;
      renderReporteContent();
    } catch (error) {
      console.error("Error obteniendo empleados: ", error);
    }
  }

  async function fetchSolicitudes(areaCode, departmentCode = null) {
    try {
      const solicitudesRef = collection(db, 'solicitud');
      let solicitudesQuery;
      if (departmentCode) {
        solicitudesQuery = query(
          solicitudesRef,
          where('id_permiso', '>=', `${areaCode}${departmentCode}`),
          where('id_permiso', '<', `${areaCode}${departmentCode}z`)
        );
      } else {
        solicitudesQuery = query(
          solicitudesRef,
          where('id_permiso', '>=', `${areaCode}`),
          where('id_permiso', '<', `${areaCode}z`)
        );
      }
      const solicitudesSnapshot = await getDocs(solicitudesQuery);
      const solicitudesData = solicitudesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        if (data.fecha_solicitud && data.fecha_solicitud.seconds) {
          data.fecha_solicitud = new Date(data.fecha_solicitud.seconds * 1000)
            .toISOString()
            .slice(0, 10);
        }
        return data;
      });
      solicitudes = solicitudesData;
      todasLasSolicitudes = solicitudesData;
      return solicitudesData;
    } catch (error) {
      console.error("Error obteniendo solicitudes: ", error);
    }
  }

  async function handleGeneralClick(area) {
    const areaCode = areaCodes[area];
    const solicitudesData = await fetchSolicitudes(areaCode);
    if (solicitudesData && solicitudesData.length > 0) {
      const employeeNumbers = extractEmployeeNumbers(solicitudesData);
      await fetchEmployees(employeeNumbers);
      tituloReporte = `Reporte de Permisos - ${area}`;
    } else {
      tituloReporte = "No se encontraron solicitudes.";
      empleados = [];
    }
    renderReporteContent();
  }

  async function handleDepartmentClick(area, department) {
    const areaCode = areaCodes[area];
    const departmentCode = departmentCodes[area] ? departmentCodes[area][department] : null;
    const solicitudesData = await fetchSolicitudes(areaCode, departmentCode);
    if (solicitudesData && solicitudesData.length > 0) {
      const employeeNumbers = extractEmployeeNumbers(solicitudesData);
      await fetchEmployees(employeeNumbers);
      tituloReporte = `Reporte de Permisos - ${department}`;
    } else {
      tituloReporte = "No se encontraron solicitudes.";
      empleados = [];
    }
    renderReporteContent();
  }

  function handleEmployeeSelection(e) {
    empleadoSeleccionado = e.target.value;
    if (empleadoSeleccionado === "") {
      solicitudes = todasLasSolicitudes;
    } else {
      solicitudes = todasLasSolicitudes.filter(solicitud =>
        solicitud.id_permiso.endsWith(`-${empleadoSeleccionado}`)
      );
    }
    renderReporteContent();
  }

  function handleFiltrarPorFecha() {
    const fechaInicioInput = document.getElementById('fechaInicio').value;
    const fechaFinInput = document.getElementById('fechaFin').value;
    if (!fechaInicioInput || !fechaFinInput) {
      alert("Por favor, seleccione un rango de fechas válido.");
      return;
    }
    fechaInicio = fechaInicioInput;
    fechaFin = fechaFinInput;
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const solicitudesFiltradas = todasLasSolicitudes.filter(solicitud => {
      const fechaSolicitud = new Date(solicitud.fecha_solicitud);
      return fechaSolicitud >= inicio && fechaSolicitud <= fin;
    });
    solicitudes = solicitudesFiltradas;
    renderReporteContent();
  }

  function exportToExcel() {
    if (!solicitudes || solicitudes.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(solicitudes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reporte_permisos.xlsx");
  }

  // --- Renderizar el menú principal (áreas + departamentos) ---
  function renderPrimaryMenu() {
    let html = '';
    for (const area in areaCodes) {
      html += `
        <li class="nav-item dropdown-container">
          <a href="#" class="nav-link dropdown-toggle">
            <span class="material-symbols-rounded">folder</span>
            <span class="nav-label">${area}</span>
            <span class="dropdown-icon material-symbols-rounded">keyboard_arrow_down</span>
          </a>
          <ul class="dropdown-menu">
            <li class="nav-item">
              <a href="#" class="nav-link dropdown-link" onclick="generalClickHandler('${area}')">
                General
              </a>
            </li>
      `;
      if (departmentCodes[area]) {
        for (const department in departmentCodes[area]) {
          html += `
            <li class="nav-item">
              <a href="#" class="nav-link dropdown-link"
                 onclick="departmentClickHandler('${area}', '${department}')">
                ${department}
              </a>
            </li>
          `;
        }
      }
      html += `
          </ul>
        </li>
      `;
    }
    primaryMenuEl.innerHTML = html;
    bindDropdownToggles();
  }

  // --- Renderizar el contenido del reporte (con mejoras en el área de gráficas) ---
  function renderReporteContent() {
    let html = `<h3>${tituloReporte}</h3>`;
    html += `
      <div class="combobox-container">
        <label for="empleados-select">Seleccione un empleado:</label>
        <select id="empleados-select" onchange="employeeSelectionHandler(event)">
          <option value="">-- Todos los empleados --</option>
    `;
    empleados.forEach(empleado => {
      html += `
          <option value="${empleado.id_usuario}" ${empleadoSeleccionado === empleado.id_usuario ? 'selected' : ''}>
            ${empleado.nombre}
          </option>
      `;
    });
    html += `
        </select>
      </div>
      <div class="filtros-container">
        <label for="fechaInicio">Fecha Inicio:</label>
        <input type="date" id="fechaInicio" value="${fechaInicio}">
        <label for="fechaFin">Fecha Fin:</label>
        <input type="date" id="fechaFin" value="${fechaFin}">
        <button onclick="filtrarPorFechaHandler()" class="filtrar-button">
          Filtrar por Fecha
        </button>
      </div>
    `;

    if (solicitudes && solicitudes.length > 0) {
      html += `<ul class="solicitudes-lista">`;
      solicitudes.forEach(solicitud => {
        html += `
          <li class="solicitud-item">
            <p><strong>Nombre Empleado:</strong> ${solicitud.nombre_empleado}</p>
            <p><strong>Motivo Falta:</strong> ${solicitud.motivo_falta}</p>
            <p><strong>Fecha Solicitud:</strong> ${solicitud.fecha_solicitud}</p>
            <p><strong>Tipo Permiso:</strong> ${solicitud.tipo_permiso}</p>
            <p><strong>Horario Laboral:</strong> ${solicitud.horario_laboral}</p>
            <p><strong>Nombre Jefe Autoriza:</strong> ${solicitud.jefe_autoriza_permiso}</p>
            <p><strong>Puesto Empleado:</strong> ${solicitud.puesto_empleado}</p>
          </li>
        `;
      });
      html += `</ul>`;
    } else {
      html += `
        <p class="mensaje-no-solicitudes">
          No se encontraron solicitudes en el rango de fechas seleccionado.
        </p>
      `;
    }

    html += `
      <button onclick="exportToExcelHandler()" class="export-button">
        Exportar a Excel
      </button>
    `;

    // Sección de gráficas organizada en tarjetas
    html += `
      <div class="charts-section">
        <div class="row">
          <!-- Tarjeta para la gráfica de Pie (Reporte por Área) -->
          <div class="col-md-6">
            <div class="card chart-card">
              <div class="card-header chart-header-pie">
                <h4>Pie Chart</h4>
              </div>
              <div class="card-body">
                <canvas id="chartArea" width="400" height="400"></canvas>
              </div>
            </div>
          </div>

          <!-- Tarjeta para la gráfica de Barras (Reporte por Departamento) -->
          <div class="col-md-6">
            <div class="card chart-card">
              <div class="card-header chart-header-bar">
                <h4>Stacked Bar Chart</h4>
              </div>
              <div class="card-body">
                <canvas id="chartDepartment" width="400" height="400"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Segunda fila: Gráfica Individual -->
        <div class="row" style="margin-top: 1rem;">
          <div class="col-md-12">
            <div class="card chart-card">
              <div class="card-header chart-header-individual">
                <h4>Reporte Individual</h4>
              </div>
              <div class="card-body">
                <label for="empleadoSelectChart">Seleccione un empleado:</label>
                <select id="empleadoSelectChart">
                  <option value="">-- Seleccione --</option>
                </select>
                <canvas id="chartIndividual" width="400" height="400"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    reporteContenidoEl.innerHTML = html;
    initStatisticalReports();
  }

  // --- Funciones de Reportes Estadísticos ---
  function getAreaFromIdPermiso(id_permiso) {
    for (const [area, code] of Object.entries(areaCodes)) {
      if (id_permiso.startsWith(code)) {
        return area;
      }
    }
    return "Desconocido";
  }

  function getDepartmentFromIdPermiso(id_permiso) {
    for (const [area, deptMapping] of Object.entries(departmentCodes)) {
      const areaCode = areaCodes[area];
      if (id_permiso.startsWith(areaCode)) {
        const deptCode = id_permiso.substr(areaCode.length, 2);
        for (const [deptName, code] of Object.entries(deptMapping)) {
          if (deptCode === code) {
            return deptName;
          }
        }
      }
    }
    return "Desconocido";
  }

  function generateAreaReport(data) {
    const areaCounts = {};
    data.forEach(item => {
      const area = getAreaFromIdPermiso(item.id_permiso);
      areaCounts[area] = (areaCounts[area] || 0) + 1;
    });
    return {
      labels: Object.keys(areaCounts),
      values: Object.values(areaCounts)
    };
  }

  function generateDepartmentReport(data) {
    const deptCounts = {};
    data.forEach(item => {
      const dept = getDepartmentFromIdPermiso(item.id_permiso);
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return {
      labels: Object.keys(deptCounts),
      values: Object.values(deptCounts)
    };
  }

  function generateIndividualReport(data, empleadoId) {
    const monthlyCounts = {};
    data.forEach(item => {
      const parts = item.id_permiso.split('-');
      if (parts.length < 2) return;
      const empNum = parseInt(parts[1], 10);
      if (empNum === parseInt(empleadoId, 10)) {
        if (item.fecha_solicitud && typeof item.fecha_solicitud === 'string') {
          const month = item.fecha_solicitud.substr(5, 2);
          monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
      }
    });
    const labels = Object.keys(monthlyCounts).sort();
    const values = labels.map(label => monthlyCounts[label]);
    return { labels, values };
  }

  function createPieChart(ctx, labels, data) {
    return new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56',
            '#4BC0C0', '#9966FF', '#66FF66', '#FF6666'
          ]
        }]
      },
      options: {}
    });
  }

  function createBarChart(ctx, labels, data) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Permisos',
          data: data,
          backgroundColor: '#36A2EB'
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  let individualChart;

  function updateIndividualChart(empleadoId) {
    const ctxIndiv = document.getElementById('chartIndividual').getContext('2d');
    if (individualChart) {
      individualChart.destroy();
    }
    if (!empleadoId) {
      ctxIndiv.clearRect(0, 0, ctxIndiv.canvas.width, ctxIndiv.canvas.height);
      return;
    }
    const indivReportData = generateIndividualReport(todasLasSolicitudes, empleadoId);
    individualChart = createBarChart(ctxIndiv, indivReportData.labels, indivReportData.values);
  }

  function initStatisticalReports() {
    const selectEl = document.getElementById('empleadoSelectChart');
    if (selectEl) {
      selectEl.innerHTML = `<option value="">-- Seleccione --</option>`;
      empleados.forEach(empleado => {
        selectEl.innerHTML += `<option value="${empleado.id_usuario}">${empleado.nombre}</option>`;
      });
      selectEl.addEventListener('change', () => {
        updateIndividualChart(selectEl.value);
      });
    }
    if (todasLasSolicitudes && todasLasSolicitudes.length > 0) {
      const areaReportData = generateAreaReport(todasLasSolicitudes);
      const ctxArea = document.getElementById('chartArea').getContext('2d');
      createPieChart(ctxArea, areaReportData.labels, areaReportData.values);
      const deptReportData = generateDepartmentReport(todasLasSolicitudes);
      const ctxDept = document.getElementById('chartDepartment').getContext('2d');
      createPieChart(ctxDept, deptReportData.labels, deptReportData.values);
      updateIndividualChart(selectEl.value);
    }
  }

  // --- Exponer funciones para los manejadores inline ---
  window.generalClickHandler = (area) => {
    handleGeneralClick(area);
  };

  window.departmentClickHandler = (area, department) => {
    handleDepartmentClick(area, department);
  };

  window.employeeSelectionHandler = (event) => {
    handleEmployeeSelection(event);
  };

  window.filtrarPorFechaHandler = () => {
    handleFiltrarPorFecha();
  };

  window.exportToExcelHandler = () => {
    exportToExcel();
  };

  // Renderizados iniciales
  renderPrimaryMenu();
  renderReporteContent();

  // -----------------------------
  // SOLUCIÓN DINÁMICA: Portal para submenús en modo colapsado
  // -----------------------------
  let portal = document.getElementById("portal-submenu");
  if (!portal) {
    portal = document.createElement("div");
    portal.id = "portal-submenu";
    portal.style.position = "fixed";
    portal.style.top = "0";
    portal.style.left = "0";
    portal.style.width = "100%";
    portal.style.height = "100%";
    portal.style.pointerEvents = "none";
    document.body.appendChild(portal);
  }

  document.querySelectorAll(".dropdown-container").forEach((container) => {
    const submenu = container.querySelector(".dropdown-menu");
    const portalDropdown = document.createElement("div");
    portalDropdown.className = "portal-dropdown";
    const clonedMenu = submenu.cloneNode(true);
    clonedMenu.style.display = "block";
    portalDropdown.appendChild(clonedMenu);
    portalDropdown.style.position = "fixed";
    portalDropdown.style.display = "none";
    portalDropdown.style.pointerEvents = "auto";
    portal.appendChild(portalDropdown);

    let hideTimeout;
    const showDropdown = () => {
      if (!document.querySelector(".sidebar").classList.contains("collapsed")) return;
      const rect = container.getBoundingClientRect();
      let leftPos = rect.right - 2;
      let topPos = rect.top;
      portalDropdown.style.display = "block";
      const ddWidth = portalDropdown.offsetWidth;
      const ddHeight = portalDropdown.offsetHeight;
      if (leftPos + ddWidth > window.innerWidth) {
        leftPos = rect.left - ddWidth + 2;
        if (leftPos < 0) leftPos = 0;
      }
      if (topPos + ddHeight > window.innerHeight) {
        topPos = window.innerHeight - ddHeight - 10;
        if (topPos < 0) topPos = 0;
      }
      portalDropdown.style.left = leftPos + "px";
      portalDropdown.style.top = topPos + "px";
      portalDropdown.style.display = "block";
    };
    const hideDropdown = () => {
      portalDropdown.style.display = "none";
    };

    container.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      showDropdown();
    });
    container.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(hideDropdown, 200);
    });
    portalDropdown.addEventListener("mouseenter", () => {
      clearTimeout(hideTimeout);
      showDropdown();
    });
    portalDropdown.addEventListener("mouseleave", () => {
      hideTimeout = setTimeout(hideDropdown, 200);
    });
  });
});
