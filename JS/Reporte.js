import { db } from '../BD/firebaseConfig.js';
import { collection, query, where, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';


// Variables globales
let solicitudes = [];
let todasLasSolicitudes = [];
let tituloReporte = 'Seleccione "General" para ver el reporte de permisos.';
let empleados = [];
let empleadoSeleccionado = "";
let fechaInicio = "";
let fechaFin = "";
let areaCodes = {};
let departmentCodes = {};

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------
  // Sidebar
  // -----------------------------
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
  function bindDropdownToggles() {
    document.querySelectorAll(".dropdown-toggle").forEach(dt => {
      dt.addEventListener("click", e => {
        e.preventDefault();
        const dropdown = dt.closest(".dropdown-container");
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
  // Estado global
  // -----------------------------

  const primaryMenuEl = document.getElementById('primary-menu');
  const reporteContenidoEl = document.getElementById('reporte-contenido');

  // -----------------------------
  // Cargar estructura desde Firestore
  // -----------------------------
  async function cargarEstructuraAreasYDepartamentos() {
    try {
      const docRef = doc(db, 'areas', 'doc');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Define el orden deseado manualmente
        const ordenCorrecto = [
          'Dirección General',
          'Subdirección de planeación y vinculación',
          'Subdirección de servicios administrativos',
          'Subdirección académica',
          'Docentes'
        ];

        areaCodes = {};
        departmentCodes = {};

        for (const nombreArea of ordenCorrecto) {
          if (data[nombreArea]) {
            areaCodes[nombreArea] = data[nombreArea];
            departmentCodes[nombreArea] = {};
          }
        }

        const deptSnap = await getDocs(collection(db, 'departamentos'));
        deptSnap.forEach(doc => {
          const codigoArea = doc.id;
          const dataDeptos = doc.data();
          const nombreArea = Object.keys(areaCodes).find(k => areaCodes[k] === codigoArea);
          if (nombreArea) {
            for (const [nombreDepto, codigoDepto] of Object.entries(dataDeptos)) {
              departmentCodes[nombreArea][nombreDepto] = codigoDepto;
            }
          }
        });
      }
    } catch (error) {
      console.error("Error cargando áreas y departamentos desde Firestore:", error);
    }
  }

  // -----------------------------
  // Fetch de datos
  // -----------------------------

  function extractEmployeeNumbers(list) {
    return list.map(s => s.id_permiso.split('-')[1]);
  }
  async function fetchEmployees(employeeNumbers) {
    try {
      const snap = await getDocs(collection(db, 'empleados'));
      empleados = snap.docs
        .map(d => d.data())
        .filter(e => e.id_usuario && employeeNumbers.includes(e.id_usuario.toString()));
      renderReporteContent();
    } catch (e) {
      console.error("Error obteniendo empleados:", e);
    }
  }
  async function fetchSolicitudes(areaCode, departmentCode = null) {
    try {
      const ref = collection(db, 'solicitud');
      const q = departmentCode
        ? query(ref,
          where('id_permiso', '>=', `${areaCode}${departmentCode}`),
          where('id_permiso', '<', `${areaCode}${departmentCode}z`)
        )
        : query(ref,
          where('id_permiso', '>=', `${areaCode}`),
          where('id_permiso', '<', `${areaCode}z`)
        );

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => {
        const d = doc.data();
        // Convertir fecha a YYYY-MM-DD
        const fecha = new Date(d.fecha_solicitud);
        if (!isNaN(fecha.getTime())) {
          d.fecha_solicitud = fecha.toISOString().slice(0, 10);
        } else {
          d.fecha_solicitud = "0000-00-00";
        }
        // Extraer ID de usuario
        d.id_usuario = d.id_usuario || (d.id_permiso?.split('-')[1]) || '';
        return d;
      });

      solicitudes = data;
      todasLasSolicitudes = data;
      return data;
    } catch (e) {
      console.error("Error obteniendo solicitudes:", e);
    }
  }


  // -----------------------------
  // Handlers de menú
  // -----------------------------
  async function handleGeneralClick(area) {
    const code = areaCodes[area];
    const data = await fetchSolicitudes(code);
    if (data?.length) {
      await fetchEmployees(extractEmployeeNumbers(data));
      tituloReporte = `Reporte de Permisos - ${area}`;
    } else {
      tituloReporte = "No se encontraron solicitudes.";
      empleados = [];
    }
    empleadoSeleccionado = "";
    renderReporteContent();
  }
  async function handleDepartmentClick(area, dept) {
    const aCode = areaCodes[area];
    const dCode = departmentCodes[area]?.[dept] || null;
    const data = await fetchSolicitudes(aCode, dCode);
    if (data?.length) {
      await fetchEmployees(extractEmployeeNumbers(data));
      tituloReporte = `Reporte de Permisos - ${dept}`;
    } else {
      tituloReporte = "No se encontraron solicitudes.";
      empleados = [];
    }
    empleadoSeleccionado = "";
    renderReporteContent();
  }
  function handleEmployeeSelection(e) {
    empleadoSeleccionado = e.target.value;
    solicitudes = empleadoSeleccionado
      ? todasLasSolicitudes.filter(s => s.id_permiso.endsWith(`-${empleadoSeleccionado}`))
      : todasLasSolicitudes;
    updateMonthlyChart(empleadoSeleccionado);
    renderReporteContent();
  }
  function handleFiltrarPorFecha() {
    const inicio = document.getElementById('fechaInicio').value;
    const fin = document.getElementById('fechaFin').value;
    if (!inicio || !fin) return alert("Por favor, seleccione un rango de fechas válido.");
    fechaInicio = inicio; fechaFin = fin;
    const i = new Date(inicio), f = new Date(fin);
    solicitudes = todasLasSolicitudes.filter(s => {
      const fs = new Date(s.fecha_solicitud);
      return fs >= i && fs <= f;
    });
    renderReporteContent();
  }
  function exportToExcel() {
    if (!solicitudes.length) {
      Swal.fire("Sin datos", "No hay datos para exportar.", "info");
      return;
    }

    // Mapeo personalizado de campos
    const datosExportar = solicitudes.map(s => ({
  "ID Empleado": s.id_usuario || '',
  "Nombre": s.nombre_empleado || '',
  "Puesto": s.puesto_empleado || '',
  "Autorizó el Permiso": s.jefe_autoriza_permiso || '',
  "Motivo de Permiso": s.motivo_falta || '',
  "Rango de Fechas": s.rango_fechas ? `${s.rango_fechas.inicio} al ${s.rango_fechas.fin}` : '',
  "Tipo de Permiso": s.tipo_permiso || '',
  "Horario Laboral": s.horario_laboral || '',
  "Con/Sin Goce de Sueldo": s.autorizacion_goce_sueldo || '',
  "Horas de Falta": s.horas_falta?.trim() ? s.horas_falta : "N/A"
}));


    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Permisos");
    XLSX.writeFile(wb, "reporte_permisos.xlsx");



  }


  // ================================
  //   Render del menú lateral
  // ================================
  // Íconos asociados a las áreas (definido globalmente o justo antes de renderPrimaryMenu)
  const areaIcons = {
    'dirección general': 'account_balance',
    'subdirección de planeación y vinculación': 'insights',
    'subdirección de servicios administrativos': 'build',
    'subdirección académica': 'school',
    'docentes': 'groups'
  };

  // ================================
  //   Render del menú lateral
  // ================================
  function renderPrimaryMenu() {
    let html = '';

    for (const area in areaCodes) {
      const areaKey = area.trim().toLowerCase(); // Normalizar
      const icon = areaIcons[areaKey] || 'folder'; // Fallback si no existe

      html += `
      <li class="nav-item dropdown-container">
        <a href="#" class="nav-link dropdown-toggle">
          <span class="material-symbols-rounded">${icon}</span>
          <span class="nav-label">${area}</span>
          <span class="dropdown-icon material-symbols-rounded">keyboard_arrow_down</span>
        </a>
        <ul class="dropdown-menu">
          <li class="nav-item">
            <a href="javascript:void(0)" class="nav-link dropdown-link" onclick="handleGeneralClick('${area}')">
              General
            </a>
          </li>`;

      if (departmentCodes[area]) {
        for (const dept in departmentCodes[area]) {
          html += `
          <li class="nav-item">
            <a href="javascript:void(0)" class="nav-link dropdown-link" onclick="handleDepartmentClick('${area}','${dept}')">
              ${dept}
            </a>
          </li>`;
        }
      }

      html += `
        </ul>
      </li>`;
    }

    primaryMenuEl.innerHTML = html;
    bindDropdownToggles();
  }
  // ================================
  //   Render de tarjetas + gráficas
  // ================================
  function renderReporteContent() {
    let html = `<h3>${tituloReporte}</h3>`;

    html += `
    <div class="combobox-container">
      <label for="empleados-select">Seleccione un empleado:</label>
      <select id="empleados-select">
        <option value="">-- Todos --</option>`;
    empleados.forEach(e => {
      html += `<option value="${e.id_usuario}" ${empleadoSeleccionado === e.id_usuario ? 'selected' : ''}>${e.nombre}</option>`;
    });
    html += `
      </select>
    </div>
    <div class="filtros-container">
      <label>Fecha Inicio:</label>
      <input type="date" id="fechaInicio" value="${fechaInicio}">
      <label>Fecha Fin:</label>
      <input type="date" id="fechaFin" value="${fechaFin}">
      <button onclick="handleFiltrarPorFecha()" class="filtrar-button">Filtrar</button>
    </div>`;

    if (solicitudes.length) {
      html += `<ul class="solicitudes-lista">`;
      solicitudes.forEach(s => {
        html += `
<li class="solicitud-item">
  <p><strong>Nombre:</strong> ${s.nombre_empleado}</p>
  <p><strong>Motivo:</strong> ${s.motivo_falta}</p>
  <p><strong>Fecha:</strong> ${s.fecha_solicitud}</p>
  <p><strong>Tipo:</strong> ${s.tipo_permiso}</p>
  <p><strong>Horario:</strong> ${s.horario_laboral}</p>
  <p><strong>Jefe:</strong> ${s.jefe_autoriza_permiso}</p>
  <p><strong>Puesto:</strong> ${s.puesto_empleado}</p>
  ${Array.isArray(s.archivos_adjuntos) && s.archivos_adjuntos.length > 0
            ? `<button onclick='verArchivosAdjuntos(${JSON.stringify(s.archivos_adjuntos)})'>Ver archivo${s.archivos_adjuntos.length > 1 ? 's' : ''}</button>`
            : ''
          }
</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p class="mensaje-no-solicitudes">No hay solicitudes en el rango seleccionado.</p>`;
    }

    html += `<button id="btnExportarExcel" class="export-button">Exportar a Excel</button>`;

    html += `
    <div class="charts-bar-section">
      <div>
        <h4>Solicitudes por Área</h4>
        <canvas id="chartArea"></canvas>
      </div>
      <div>
        <h4>Permisos por Departamento</h4>
        <canvas id="chartDepartment"></canvas>
      </div>
      <div>
        <h4>Permisos Mensuales (Empleado)</h4>
        <label for="chartEmpleadoSelect">Empleado:</label>
        <select id="chartEmpleadoSelect"><option value="">-- Seleccione --</option></select>
        <canvas id="chartIndividual"></canvas>
      </div>
    </div>`;

    reporteContenidoEl.innerHTML = html;

    initCharts();
    document.getElementById('btnExportarExcel').addEventListener('click', exportToExcel);
  }


  // ================================
  //  Lógica real para poblar charts
  // ================================
  function getAreaFromIdPermiso(id) {
    const code = id.slice(0, 2);
    return Object.entries(areaCodes).find(([, c]) => c === code)?.[0] || 'Desconocido';
  }
  function getDepartmentFromIdPermiso(id) {
    const areaKey = getAreaFromIdPermiso(id);
    const dm = departmentCodes[areaKey] || {};
    const code = id.slice(2, 4);
    return Object.entries(dm).find(([, c]) => c === code)?.[0] || 'Desconocido';
  }
  function generateAreaReport(data) {
    const cnt = {};
    data.forEach(x => {
      const a = getAreaFromIdPermiso(x.id_permiso);
      cnt[a] = (cnt[a] || 0) + 1;
    });
    return { labels: Object.keys(cnt), values: Object.values(cnt) };
  }
  function generateDepartmentReport(data) {
    const cnt = {};
    data.forEach(x => {
      const d = getDepartmentFromIdPermiso(x.id_permiso);
      cnt[d] = (cnt[d] || 0) + 1;
    });
    return { labels: Object.keys(cnt), values: Object.values(cnt) };
  }
  function generateMonthlyReport(data) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const cnt = Array(12).fill(0);
    data.forEach(x => {
      const m = parseInt(x.fecha_solicitud.slice(5, 7), 10);
      if (m >= 1 && m <= 12) cnt[m - 1]++;
    });
    return { labels: meses, values: cnt };
  }

  let pieAreaChart, pieDeptChart, barEmpChart;

  function updateMonthlyChart(empId) {
    const filtered = empId
      ? todasLasSolicitudes.filter(s => s.id_permiso.endsWith(`-${empId}`))
      : [];
    const monthly = generateMonthlyReport(filtered);
    const newMax = Math.max(...monthly.values, 6);
    barEmpChart.data.datasets[0].data = monthly.values;
    barEmpChart.options.scales.y.max = newMax;
    barEmpChart.update();
  }

  function initCharts() {
    // 1) Gráfico de áreas
    const areaStats = generateAreaReport(todasLasSolicitudes);
    if (pieAreaChart) pieAreaChart.destroy();
    pieAreaChart = new Chart(
      document.getElementById('chartArea'), {
      type: 'pie',
      data: {
        labels: areaStats.labels,
        datasets: [{ data: areaStats.values, backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'] }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Solicitudes por Área' }
        }
      }
    }
    );

    // 2) Gráfico de departamentos
    const deptStats = generateDepartmentReport(todasLasSolicitudes);
    if (pieDeptChart) pieDeptChart.destroy();
    pieDeptChart = new Chart(
      document.getElementById('chartDepartment'), {
      type: 'pie',
      data: {
        labels: deptStats.labels,
        datasets: [{
          data: deptStats.values,
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#4D5360', '#C9CBCF', '#8A89A6', '#A1DE93']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Permisos por Departamento' }
        }
      }
    }
    );

    // 3) Gráfico de permisos mensuales por empleado
    const empty = generateMonthlyReport([]);
    if (barEmpChart) barEmpChart.destroy();
    barEmpChart = new Chart(
      document.getElementById('chartIndividual'), {
      type: 'bar',
      data: {
        labels: empty.labels,
        datasets: [{ label: 'Permisos', data: empty.values, backgroundColor: '#FFCE56' }]
      },
      options: {
        responsive: true,
        aspectRatio: 1,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Permisos Mensuales (Empleado)' }
        },
        scales: {
          x: { title: { display: true, text: 'Mes' } },
          y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } }
        }
      }
    }
    );

    // Manejo de selects
    const topSel = document.getElementById('empleados-select');
    const chartSel = document.getElementById('chartEmpleadoSelect');

    // Actualiza gráficos y solicitudes
    function onEmpChange(e) {
      const id = e.target.value;
      topSel.value = id;
      chartSel.value = id;
      empleadoSeleccionado = id;
      solicitudes = id
        ? todasLasSolicitudes.filter(s => s.id_permiso.endsWith(`-${id}`))
        : todasLasSolicitudes;
      updateMonthlyChart(id);
      renderTablaPermisos(); // ✅ Solo actualiza la tabla de solicitudes
    }


    topSel.addEventListener('change', onEmpChange);
    chartSel.addEventListener('change', onEmpChange);

    // Poblar opciones del segundo select
    chartSel.innerHTML = '<option value="">-- Seleccione --</option>';
    empleados.forEach(emp => {
      chartSel.innerHTML += `<option value="${emp.id_usuario}">${emp.nombre}</option>`;
    });

    // Marcar la selección actual si existe
    topSel.value = empleadoSeleccionado;
    chartSel.value = empleadoSeleccionado;
  }


  // -----------------------------
  // Exponer handlers
  // -----------------------------
  window.handleGeneralClick = handleGeneralClick;
  window.handleDepartmentClick = handleDepartmentClick;
  window.handleEmployeeSelection = handleEmployeeSelection;
  window.handleFiltrarPorFecha = handleFiltrarPorFecha;


  // Render inicial después de cargar Firestore
  cargarEstructuraAreasYDepartamentos().then(() => {
    renderPrimaryMenu();
    renderReporteContent();

    // -----------------------------
    // Portal dinámico (después del render)
    // -----------------------------
    let portal = document.getElementById("portal-submenu");
    if (!portal) {
      portal = document.createElement("div");
      portal.id = "portal-submenu";
      portal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;";
      document.body.appendChild(portal);
    }
    document.querySelectorAll(".dropdown-container").forEach(container => {
      const submenu = container.querySelector(".dropdown-menu");
      const pd = document.createElement("div");
      pd.className = "portal-dropdown";
      const clone = submenu.cloneNode(true);
      clone.style.display = "block";
      pd.appendChild(clone);
      pd.style.position = "fixed";
      pd.style.pointerEvents = "auto";
      pd.style.display = "none";
      portal.appendChild(pd);
      let hideTimeout;
      function show() {
        if (!document.querySelector(".sidebar").classList.contains("collapsed")) return;
        const r = container.getBoundingClientRect();
        let left = r.right - 2, top = r.top;
        pd.style.display = "block";
        const w = pd.offsetWidth, h = pd.offsetHeight;
        if (left + w > innerWidth) left = r.left - w + 2;
        if (top + h > innerHeight) top = innerHeight - h - 10;
        pd.style.left = `${Math.max(0, left)}px`;
        pd.style.top = `${Math.max(0, top)}px`;
      }
      function hide() { pd.style.display = "none"; }
      container.addEventListener("mouseenter", () => { clearTimeout(hideTimeout); show(); });
      container.addEventListener("mouseleave", () => { hideTimeout = setTimeout(hide, 200); });
      pd.addEventListener("mouseenter", () => { clearTimeout(hideTimeout); show(); });
      pd.addEventListener("mouseleave", () => { hideTimeout = setTimeout(hide, 200); });
    });
  });

  window.verArchivosAdjuntos = function (archivos) {
    archivos.forEach((archivo, index) => {
      const win = window.open();
      if (win) {
        win.document.title = archivo.nombre || `Archivo ${index + 1}`;
        win.document.body.innerHTML = `
        <h2>${archivo.nombre}</h2>
        ${archivo.tipo.includes("pdf")
            ? `<embed src="${archivo.contenido_base64}" type="application/pdf" width="100%" height="90%"/>`
            : `<img src="${archivo.contenido_base64}" style="max-width:100%; max-height:90vh;" />`
          }
      `;
      }
    });
  }
});
function renderTablaPermisos() {
  const listaEl = document.querySelector('.solicitudes-lista');
  if (!listaEl) return;

  if (!solicitudes.length) {
    listaEl.outerHTML = `<p class="mensaje-no-solicitudes">No hay solicitudes en el rango seleccionado.</p>`;
    return;
  }

  let html = '';
  solicitudes.forEach(s => {
    html += `
      <li class="solicitud-item">
        <p><strong>Nombre:</strong> ${s.nombre_empleado}</p>
        <p><strong>Motivo:</strong> ${s.motivo_falta}</p>
        <p><strong>Fecha:</strong> ${s.fecha_solicitud}</p>
        <p><strong>Tipo:</strong> ${s.tipo_permiso}</p>
        <p><strong>Horario:</strong> ${s.horario_laboral}</p>
        <p><strong>Jefe:</strong> ${s.jefe_autoriza_permiso}</p>
        <p><strong>Puesto:</strong> ${s.puesto_empleado}</p>
        ${Array.isArray(s.archivos_adjuntos) && s.archivos_adjuntos.length > 0
        ? `<button onclick='verArchivosAdjuntos(${JSON.stringify(s.archivos_adjuntos)})'>Ver archivo${s.archivos_adjuntos.length > 1 ? 's' : ''}</button>`
        : ''
      }
      </li>`;
  });

  listaEl.innerHTML = html;
}
