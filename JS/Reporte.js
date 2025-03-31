// Importa Firebase y la biblioteca XLSX desde CDN
import { db } from '../BD/firebaseConfig.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

document.addEventListener('DOMContentLoaded', () => {
  // Variables de estado
  let activeMenu = null;
  let solicitudes = [];
  let todasLasSolicitudes = [];
  let tituloReporte = 'Seleccione "General" para ver el reporte de permisos.';
  let empleados = [];
  let empleadoSeleccionado = "";
  let fechaInicio = "";
  let fechaFin = "";

  // Referencias a elementos DOM
  const menuLateralEl = document.getElementById('menu-lateral');
  const reporteContenidoEl = document.getElementById('reporte-contenido');

  // Códigos de áreas y departamentos
  const areaCodes = {
    'Dirección General': 'A1',
    'Subdirección de planeación y vinculación': 'A2',
    'Subdirección de servicios administrativos': 'A3',
    'Subdirección académica': 'A4',
    'Docentes': 'A5'
  };

  const departmentCodes = {
    'Dirección General': { 'Dirección General': '01', 'Innovación y calidad': '02' },
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

  // --- Funciones de Lógica ---

  // Alterna el menú activo
  function toggleMenu(menu) {
    activeMenu = (activeMenu === menu) ? null : menu;
    renderMenu();
  }

  // Extrae los números de empleado a partir de id_permiso (se asume formato "CODIGO-numero")
  function extractEmployeeNumbers(solicitudesList) {
    return solicitudesList.map(solicitud => {
      const parts = solicitud.id_permiso.split('-');
      return parts[1];
    });
  }

  // Consulta la colección "empleados" y filtra según los números extraídos
  async function fetchEmployees(employeeNumbers) {
    try {
      const empleadosRef = collection(db, 'empleados');
      const empleadosSnapshot = await getDocs(empleadosRef);
      const empleadosData = empleadosSnapshot.docs
        .map(doc => doc.data())
        .filter(empleado => empleado.id_usuario && employeeNumbers.includes(empleado.id_usuario.toString()));
      empleados = empleadosData;
      renderReporteContent(); // Actualiza el combobox y los nuevos reportes estadísticos
    } catch (error) {
      console.error("Error obteniendo empleados: ", error);
    }
  }

  // Consulta la colección "solicitud" según área y (opcional) departamento
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

  // Maneja el clic en "General" de un área
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

  // Maneja el clic en un departamento específico
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

  // Actualiza la selección de empleado y filtra las solicitudes
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

  // Filtra las solicitudes por rango de fechas
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

  // Exporta los datos actuales a un archivo Excel
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

  // --- Funciones de Renderizado ---

  // Renderiza el menú lateral
  function renderMenu() {
    let html = `
      <div class="menu-logo">
        <h2>Reportes</h2>
      </div>
      <ul class="menu-items">
    `;
    for (const area in areaCodes) {
      html += `<li class="menu-item" onclick="menuClickHandler('${area}')">
                 ${area}
                 ${activeMenu === area ? renderSubmenu(area) : ''}
               </li>`;
    }
    html += `</ul>`;
    menuLateralEl.innerHTML = html;
  }

  // Renderiza el submenú (opciones "General" y departamentos) para un área
  function renderSubmenu(area) {
    let submenuHtml = `<ul class="submenu">`;
    submenuHtml += `<li>
                      <button onclick="generalClickHandler('${area}')" class="submenu-button">
                        General
                      </button>
                    </li>`;
    if (departmentCodes[area]) {
      for (const department in departmentCodes[area]) {
        submenuHtml += `<li>
                          <button onclick="departmentClickHandler('${area}', '${department}')" class="submenu-button">
                            ${department}
                          </button>
                        </li>`;
      }
    }
    submenuHtml += `</ul>`;
    return submenuHtml;
  }

  // Renderiza el contenido del reporte (título, combobox, filtros, lista de solicitudes, botón de exportar y sección de reportes estadísticos)
  function renderReporteContent() {
    let html = `<h3>${tituloReporte}</h3>`;
    // Combobox de empleados
    html += `<div class="combobox-container">
               <label for="empleados-select">Seleccione un empleado:</label>
               <select id="empleados-select" onchange="employeeSelectionHandler(event)">
                 <option value="">-- Todos los empleados --</option>`;
    empleados.forEach(empleado => {
      html += `<option value="${empleado.id_usuario}" ${empleadoSeleccionado === empleado.id_usuario ? 'selected' : ''}>
                 ${empleado.nombre}
               </option>`;
    });
    html += `</select>
             </div>`;
    // Filtros por fecha
    html += `<div class="filtros-container">
               <label for="fechaInicio">Fecha Inicio:</label>
               <input type="date" id="fechaInicio" value="${fechaInicio}">
               <label for="fechaFin">Fecha Fin:</label>
               <input type="date" id="fechaFin" value="${fechaFin}">
               <button onclick="filtrarPorFechaHandler()" class="filtrar-button">Filtrar por Fecha</button>
             </div>`;
    // Lista de solicitudes
    if (solicitudes && solicitudes.length > 0) {
      html += `<ul class="solicitudes-lista">`;
      solicitudes.forEach(solicitud => {
        html += `<li class="solicitud-item">
                   <p><strong>Nombre Empleado:</strong> ${solicitud.nombre_empleado}</p>
                   <p><strong>Motivo Falta:</strong> ${solicitud.motivo_falta}</p>
                   <p><strong>Fecha Solicitud:</strong> ${solicitud.fecha_solicitud}</p>
                   <p><strong>Tipo Permiso:</strong> ${solicitud.tipo_permiso}</p>
                   <p><strong>Horario Laboral:</strong> ${solicitud.horario_laboral}</p>
                   <p><strong>Nombre Jefe Autoriza:</strong> ${solicitud.jefe_autoriza_permiso}</p>
                   <p><strong>Puesto Empleado:</strong> ${solicitud.puesto_empleado}</p>
                 </li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p class="mensaje-no-solicitudes">No se encontraron solicitudes en el rango de fechas seleccionado.</p>`;
    }
    // Botón de exportar a Excel
    html += `<button onclick="exportToExcelHandler()" class="export-button">Exportar a Excel</button>`;
    
    // --- Nueva Sección: Reportes Estadísticos ---
    html += `
      <div id="statistical-reports">
        <h3>Reportes Estadísticos</h3>
        <section id="reporte-area">
          <h4>Reporte por Área</h4>
          <canvas id="chartArea" width="400" height="400"></canvas>
        </section>
        <section id="reporte-departamento">
          <h4>Reporte por Departamento</h4>
          <canvas id="chartDepartment" width="400" height="400"></canvas>
        </section>
        <section id="reporte-individual">
          <h4>Reporte Individual</h4>
          <label for="empleadoSelectChart">Seleccione un empleado:</label>
          <select id="empleadoSelectChart">
            <option value="">-- Seleccione --</option>
          </select>
          <canvas id="chartIndividual" width="400" height="400"></canvas>
        </section>
      </div>
    `;
    
    reporteContenidoEl.innerHTML = html;
    
    // Inicializa los reportes estadísticos
    initStatisticalReports();
  }

  // --- Funciones de Reportes Estadísticos ---

  // Función para determinar el área a partir del id_permiso
  function getAreaFromIdPermiso(id_permiso) {
    for (const [area, code] of Object.entries(areaCodes)) {
      if (id_permiso.startsWith(code)) {
        return area;
      }
    }
    return "Desconocido";
  }

  // Función para determinar el departamento a partir del id_permiso
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

  // Genera datos para el reporte por área
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

  // Genera datos para el reporte por departamento
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

  // Genera datos para el reporte individual (agrupado por mes)
  function generateIndividualReport(data, empleadoId) {
    const monthlyCounts = {};
    data.forEach(item => {
      const parts = item.id_permiso.split('-');
      if (parts.length < 2) return; // Verifica que el formato sea el esperado
      const empNum = parseInt(parts[1], 10);
      if (empNum === parseInt(empleadoId, 10)) {
        // Verifica que exista fecha_solicitud y sea una cadena
        if (item.fecha_solicitud && typeof item.fecha_solicitud === 'string') {
          const month = item.fecha_solicitud.substr(5, 2); // Extrae el mes (MM)
          monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
      }
    });
    const labels = Object.keys(monthlyCounts).sort();
    const values = labels.map(label => monthlyCounts[label]);
    return { labels, values };
  }   

  // Función para crear un gráfico de pastel
  function createPieChart(ctx, labels, data) {
    return new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#66FF66', '#FF6666']
        }]
      },
      options: {}
    });
  }

  // Función para crear un gráfico de barras
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

  let individualChart; // Variable global para el gráfico individual

  // Actualiza o crea el gráfico individual según el empleado seleccionado
  function updateIndividualChart(empleadoId) {
    const ctxIndiv = document.getElementById('chartIndividual').getContext('2d');
    if (individualChart) {
      individualChart.destroy();
    }
    if (!empleadoId) {
      // Si no se selecciona empleado, se limpia el canvas
      ctxIndiv.clearRect(0, 0, ctxIndiv.canvas.width, ctxIndiv.canvas.height);
      return;
    }
    const indivReportData = generateIndividualReport(todasLasSolicitudes, empleadoId);
    individualChart = createBarChart(ctxIndiv, indivReportData.labels, indivReportData.values);
  }

  // Inicializa la sección de reportes estadísticos
  function initStatisticalReports() {
    const statContainer = document.getElementById('statistical-reports');
    if (!statContainer) return;

    // Inicializa el combobox para el reporte individual
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
      // Reporte por Área
      const areaReportData = generateAreaReport(todasLasSolicitudes);
      const ctxArea = document.getElementById('chartArea').getContext('2d');
      createPieChart(ctxArea, areaReportData.labels, areaReportData.values);

      // Reporte por Departamento
      const deptReportData = generateDepartmentReport(todasLasSolicitudes);
      const ctxDept = document.getElementById('chartDepartment').getContext('2d');
      createPieChart(ctxDept, deptReportData.labels, deptReportData.values);

      // Reporte Individual: inicializa con la opción seleccionada (si la hay)
      updateIndividualChart(selectEl.value);
    }
  }

  // --- Exponemos funciones para los manejadores inline ---
  window.menuClickHandler = (area) => {
    toggleMenu(area);
  };

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

  // Renderizado inicial
  renderMenu();
  renderReporteContent();
});
