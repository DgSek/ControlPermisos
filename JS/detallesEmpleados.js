// Importamos Firebase y Firestore
import { db } from '../BD/firebaseConfig.js';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container  = document.getElementById('detalles-empleados-container');
  const id_usuario = localStorage.getItem('idUsuario');
  if (!id_usuario) {
    container.innerHTML = `<p>No se encontró información del empleado.</p>`;
    return;
  }

  // ————— Preparamos cierres de modales —————
  const cerrarReportesBtn = document.getElementById('cerrar-modal-reportes');
  if (cerrarReportesBtn) {
    cerrarReportesBtn.addEventListener('click', () => {
      document.getElementById('modal-reportes')
        .classList.add('hidden');
    });
  }

  const cerrarModificarBtn = document.getElementById('cerrar-modal-modificar');
  if (cerrarModificarBtn) {
    cerrarModificarBtn.addEventListener('click', () => {
      document.getElementById('modalModificarPermiso')
        .classList.add('hidden');
    });
  }

  // ————— Cargo jefes y puestos para los <select> —————
  let jefesInmediatos = [];
  let puestosJefes     = [];
  async function fetchJefesYPuestos() {
    try {
      const jSnap = await getDocs(collection(db, 'jefesInmediatos'));
      jSnap.forEach(d => {
        const nm = d.data().nombre;
        if (nm) jefesInmediatos.push(nm);
      });
      const pSnap = await getDocs(collection(db, 'puestosJefes'));
      pSnap.forEach(d => {
        Object.values(d.data()).forEach(nm => {
          if (typeof nm === 'string') puestosJefes.push(nm);
        });
      });
    } catch (e) {
      console.error('Error cargando jefes/puestos:', e);
    }
  }
  await fetchJefesYPuestos();

  // ————— Helpers —————
  const formatearFecha = f => {
    if (f?.seconds) return new Date(f.seconds * 1000)
                          .toISOString().split('T')[0];
    if (typeof f === 'string')
      return new Date(f).toISOString().split('T')[0];
    return '';
  };

  // ————— Listado de reportes —————
  const cargarReportes = async uid => {
    const lista = document.getElementById('lista-reportes');
    lista.innerHTML = '<p>Cargando reportes...</p>';
    try {
      const qSnap = await getDocs(
        query(collection(db, 'solicitud'),
              where('id_usuario', '==', uid))
      );
      if (qSnap.empty) {
        lista.innerHTML = '<p>No se encontraron reportes.</p>';
        return;
      }
      let html = '<ul>';
      qSnap.forEach(docSnap => {
        const d     = docSnap.data();
        const fecha = formatearFecha(d.fecha_solicitud);
        const btn   = Array.isArray(d.archivos_adjuntos) && d.archivos_adjuntos.length
          ? `<button onclick='verArchivosAdjuntos(${JSON.stringify(d.archivos_adjuntos)})'>📄</button>`
          : '';
        html += `
          <li class="reporte-item">
            <p><strong>Motivo:</strong> ${d.motivo_falta}</p>
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Tipo:</strong> ${d.tipo_permiso}</p>
            <button onclick="modificarReporte('${docSnap.id}')">✏️</button>
            <button onclick="eliminarReporte('${docSnap.id}')">🗑️</button>
            ${btn}
          </li>`;
      });
      html += '</ul>';
      lista.innerHTML = html;
    } catch (e) {
      console.error('Error cargando reportes:', e);
      lista.innerHTML = '<p>Error al cargar reportes.</p>';
    }
  };

  window.verArchivosAdjuntos = archivos => {
    archivos.forEach((archivo, i) => {
      const win = window.open();
      win.document.title = archivo.nombre || `Archivo ${i+1}`;
      win.document.body.innerHTML = archivo.tipo.includes('pdf')
        ? `<embed src="${archivo.contenido_base64}"
                  type="application/pdf"
                  width="100%" height="90%"/>`
        : `<img src="${archivo.contenido_base64}"
                style="max-width:100%;max-height:90vh;"/>`;
    });
  };

  window.eliminarReporte = async id => {
    if (!confirm('¿Eliminar este reporte?')) return;
    try {
      await deleteDoc(doc(db, 'solicitud', id));
      await cargarReportes(id_usuario);
    } catch {
      alert('Error al eliminar.');
    }
  };

  // ————— Abre el modal de modificación y carga datos —————
  window.modificarReporte = async id => {
  try {
    const snap = await getDoc(doc(db, 'solicitud', id));
    if (!snap.exists()) return alert('Reporte no encontrado');
    const d = snap.data();

    // abrimos el modal
    const modal = document.getElementById('modalModificarPermiso');
    modal.classList.remove('hidden');

    // llenamos campos básicos
    document.getElementById('idPermisoModificar').value   = id;
    document.getElementById('modMotivo').value           = d.motivo_falta         || '';
    document.getElementById('modTipo').value             = d.tipo_permiso         || '';
    const [hi = '', hf = ''] = (d.horario_laboral || '').split('-');
    document.getElementById('modHorarioInicio').value    = hi;
    document.getElementById('modHorarioFin').value       = hf;
    document.getElementById('modFechaInicio').value      = formatearFecha(d.rango_fechas?.inicio);
    document.getElementById('modFechaFin').value         = formatearFecha(d.rango_fechas?.fin);
    document.getElementById('modHorasFalta').value       = d.horas_falta         || '';
    document.getElementById('modNombreEmpleado').value   = d.nombre_empleado     || '';
    document.getElementById('modPuestoEmpleado').value   = d.puesto_empleado     || '';

    // llenado de <select>
    const llenarCombos = (sel, opciones, actual) => {
      sel.innerHTML = '<option value="">Selecciona</option>';
      opciones.forEach(o => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = o;
        if (o === actual) opt.selected = true;
        sel.appendChild(opt);
      });
    };
    llenarCombos(document.getElementById('modNombreJefe'),     jefesInmediatos, d.nombre_jefe_inmediato);
    llenarCombos(document.getElementById('modPuestoJefe'),     puestosJefes,    d.puesto_jefe_inmediato);
    llenarCombos(document.getElementById('modNombreAutoriza'), jefesInmediatos, d.jefe_autoriza_permiso);
    llenarCombos(document.getElementById('modPuestoAutoriza'), puestosJefes,    d.puesto_jefe_autoriza);
    llenarCombos(document.getElementById('modAutorizacion'),   ['Con goce de sueldo','Sin goce de sueldo'], d.autorizacion_goce_sueldo);

    // ————————————————
    // Formateo y habilitado de “Horas de la falta”
    // ————————————————
    const horasFaltaInput = document.getElementById('modHorasFalta');
    const tipoPermisoMod  = document.getElementById('modTipo');

    if (horasFaltaInput && tipoPermisoMod) {
      // a) Auto‐formateo a "HH:mm-HH:mm"
      horasFaltaInput.addEventListener('input', e => {
        let d   = e.target.value.replace(/\D/g, '').slice(0,8);
        let out = '';

        if (d.length <= 4) {
          // "HHmm" → "HH:mm"
          out = d.length >= 2
            ? d.slice(0,2) + ':' + d.slice(2)
            : d;
        } else {
          // "HHmmHHmm" → "HH:mm-HH:mm"
          const a  = d.slice(0,4), b = d.slice(4);
          const p1 = a.slice(0,2) + ':' + a.slice(2);
          const p2 = b.length >= 2
            ? b.slice(0,2) + ':' + b.slice(2)
            : b;
          out = p1 + '-' + p2;
        }
        e.target.value = out;
      });

      // b) Habilitar / deshabilitar según el tipo de permiso
      const actualizarHoras = () => {
        const esParcial = tipoPermisoMod.value === 'Parcial';
        horasFaltaInput.disabled = !esParcial;
        if (!esParcial) horasFaltaInput.value = '';
      };

      // Ejecutar al abrir el modal y al cambiar el select
      actualizarHoras();
      tipoPermisoMod.addEventListener('change', actualizarHoras);
    }

  } catch (e) {
    console.error('Error al cargar datos del permiso:', e);
  }
};


  // ————— Submit de la modificación —————
  document
    .getElementById('form-modificar-permiso')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('idPermisoModificar').value;
      const hi = document.getElementById('modHorarioInicio').value;
      const hf = document.getElementById('modHorarioFin').value;

      try {
        await updateDoc(doc(db, 'solicitud', id), {
          motivo_falta:             document.getElementById('modMotivo').value,
          tipo_permiso:             document.getElementById('modTipo').value,
          horario_laboral:          `${hi}-${hf}`,
          rango_fechas: {
            inicio: document.getElementById('modFechaInicio').value,
            fin:    document.getElementById('modFechaFin').value
          },
          horas_falta:              document.getElementById('modHorasFalta').value,
          autorizacion_goce_sueldo: document.getElementById('modAutorizacion').value,
          nombre_jefe_inmediato:    document.getElementById('modNombreJefe').value,
          puesto_jefe_inmediato:    document.getElementById('modPuestoJefe').value,
          jefe_autoriza_permiso:    document.getElementById('modNombreAutoriza').value,
          puesto_jefe_autoriza:     document.getElementById('modPuestoAutoriza').value
        });

        alert('Actualizado correctamente.');
        document.getElementById('modalModificarPermiso')
          .classList.add('hidden');
        await cargarReportes(id_usuario);

      } catch (err) {
        console.error(err);
        alert('No se pudo actualizar el permiso.');
      }
    });

  // ————— Carga y render del perfil de empleado + añadir “🗂️” —————
  const fetchEmployeeData = async () => {
    try {
      const qEmpl = query(
        collection(db, 'empleados'),
        where('id_usuario','==', id_usuario)
      );
      const snap   = await getDocs(qEmpl);
      if (snap.empty) {
        container.innerHTML = `<p>No se encontró información del empleado.</p>`;
        return;
      }
      const data = snap.docs[0].data();

      // obtengo área y departamento
      const areaSnap = await getDoc(doc(db, 'areas', 'doc'));
      const areaNombre = areaSnap.exists()
        ? Object.keys(areaSnap.data())
              .find(k=>areaSnap.data()[k]===data.Area)
        : 'No disponible';
      const depSnap = await getDoc(doc(db, 'departamentos', data.Area));
      const deptoNombre = depSnap.exists()
        ? Object.keys(depSnap.data())
              .find(k=>depSnap.data()[k]===data.Departamento)
        : 'No disponible';

      // cuento permisos
      const contarSolicitud = async uid => {
        const s = await getDocs(
          query(collection(db, 'solicitud'),
                where('id_usuario','==', uid))
        );
        const c = { Personal:0, Salud:0, Sindical:0, Parcial:0 };
        s.forEach(d=>c[d.data().tipo_permiso]++);
        return c;
      };
      const permisos = await contarSolicitud(id_usuario);

      // renderizo
      const fechaIngreso = formatearFecha(data.fecha_contratacion);
      const fotoCruda    = data.Foto || data.foto || '';
      const fotoUrl      = typeof fotoCruda==='string' && fotoCruda.trim().length>5
        ? fotoCruda.replace(/^"|"$/g,'')
        : 'https://via.placeholder.com/150';

      // colores
      const getColor = async (usados,tipo) => {
        try {
          const limSnap = await getDoc(doc(db,'limitePermisos','global'));
          const lims    = limSnap.exists()?limSnap.data():{};
          const l       = lims[tipo.toLowerCase()]||1;
          const p       = usados/l;
          return p>=1 ? 'rojo' : p>=0.5 ? 'naranja' : 'verde';
        } catch {
          return 'verde';
        }
      };
      const personalColor  = await getColor(permisos.Personal,'personal');
      const saludColor     = await getColor(permisos.Salud,'salud');
      const sindicalColor  = await getColor(permisos.Sindical,'sindical');
      const parcialColor   = await getColor(permisos.Parcial,'parcial');

      container.innerHTML = `
        <div class="detalles-empleados">
          <div class="encabezado"><h1>Perfil de Empleado</h1></div>
          <div class="perfil-contenedor">
            <div class="seccion info-general">
              <img src="${fotoUrl}" alt="Empleado">
              <p><strong>Nombre:</strong> ${data.nombre}</p>
            </div>
            <div class="seccion info-secundaria">
              <div class="info-subseccion">
                <h2>Información</h2>
                <p><strong>Área:</strong> ${areaNombre}</p>
                <p><strong>Departamento:</strong> ${deptoNombre}</p>
                <p><strong>Puesto:</strong> ${data.puesto}</p>
                <p><strong>Fecha de ingreso:</strong> ${fechaIngreso}</p>
              </div>
              <div class="info-subseccion">
                <h2>
                  Permisos solicitados
                  <span id="ver-reportes-icon" style="cursor:pointer">🗂️</span>
                </h2>
                <div class="indicadores-globales">
                  <span>Disponible <span class="indicador verde"></span></span>
                  <span>Advertencia <span class="indicador naranja"></span></span>
                  <span>Límite <span class="indicador rojo"></span></span>
                </div>
                <p><strong>Personal:</strong> ${permisos.Personal}
                   <span class="indicador ${personalColor}"></span>
                </p>
                <p><strong>Salud:</strong> ${permisos.Salud}
                   <span class="indicador ${saludColor}"></span>
                </p>
                <p><strong>Sindical:</strong> ${permisos.Sindical}
                   <span class="indicador ${sindicalColor}"></span>
                </p>
                <p><strong>Parcial:</strong> ${permisos.Parcial}
                   <span class="indicador ${parcialColor}"></span>
                </p>
              </div>
              <div class="info-subseccion">
                <h2>Contacto</h2>
                <p><strong>Teléfono:</strong> ${data.numero_telefono}</p>
                <p><strong>Correo:</strong> ${data.correo}</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // abro modal de reportes
      const verIcon = document.getElementById('ver-reportes-icon');
      if (verIcon) {
        verIcon.addEventListener('click', () => {
          document.getElementById('modal-reportes')
            .classList.remove('hidden');
          cargarReportes(id_usuario);
        });
      }

    } catch (e) {
      container.innerHTML = `<p>Error al obtener datos.</p>`;
      console.error(e);
    }
  };

  // disparamos la carga inicial
  fetchEmployeeData();
});

// ————— Sidebar toggles ————— (igual que antes)
document.addEventListener("DOMContentLoaded", () => {
  const toggleDropdown = (dropdown, menu, isOpen) => {
    dropdown.classList.toggle("open", isOpen);
    menu.style.height = isOpen ? `${menu.scrollHeight}px` : 0;
  };
  const closeAllDropdowns = () => {
    document.querySelectorAll(".dropdown-container.open")
      .forEach(openDropdown => {
        const menu = openDropdown.querySelector(".dropdown-menu");
        toggleDropdown(openDropdown, menu, false);
      });
  };
  document.querySelectorAll(".sidebar-toggler, .sidebar-menu-button")
    .forEach(btn => {
      btn.addEventListener("click", () => {
        closeAllDropdowns();
        document.querySelector(".sidebar").classList.toggle("collapsed");
      });
    });
  document.querySelectorAll(".dropdown-container")
    .forEach(container => {
      const toggle = container.querySelector(".dropdown-toggle");
      const menu   = container.querySelector(".dropdown-menu");
      toggle.addEventListener("click", e => {
        e.preventDefault();
        const isOpen = container.classList.contains("open");
        closeAllDropdowns();
        toggleDropdown(container, menu, !isOpen);
      });
    });
});
