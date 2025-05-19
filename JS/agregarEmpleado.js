// Importar configuración y métodos de Firebase Firestore
import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDocs, query, where, updateDoc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('agregar-empleado-container');

  // Constantes para áreas y departamentos
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

  // Variables de estado
  let busqueda = "";
  let empleadoEncontrado = false;
  let documentoId = null;

  // Renderizamos la interfaz
  container.innerHTML = `
    <div class="agregar-empleado-container">
      <h2>Agregar o Modificar Empleado</h2>
      <div class="buscador">
        <input type="text" id="busqueda" placeholder="Buscar por ID de usuario">
        <button type="button" id="btnBuscar">Buscar</button>
      </div>
      <div id="mensajeEmpleado"></div>
      <form id="formEmpleado">
        <div class="campo">
          <label>Correo:</label>
          <input type="email" id="correo" required>
        </div>
        <div class="campo">
          <label>ID Usuario:</label>
          <input type="text" id="idUsuario" required>
        </div>
        <div class="campo">
          <label>Tipo de Usuario:</label>
          <select id="tipoUsuario">
            <option value="usuario">Usuario</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="campo">
          <label>Nombre:</label>
          <input type="text" id="nombre" required>
        </div>
        <div class="campo">
          <label>Fecha de Contratación:</label>
          <input type="date" id="fechaContratacion" required>
        </div>
        <div class="campo">
          <label>Puesto:</label>
          <input type="text" id="puesto" required>
        </div>
        <div class="campo">
          <label>Foto (URL):</label>
          <input type="url" id="foto" required>
        </div>
        <div class="campo">
          <label>Número de Teléfono:</label>
          <input type="tel" id="numeroTelefono" required>
        </div>
        <div class="campo">
          <label>Área:</label>
          <select id="areaSeleccionada" required>
            <option value="">Seleccione un área</option>
            ${Object.keys(areaCodes).map(area => `<option value="${area}">${area}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Departamento:</label>
          <select id="departamentoSeleccionado" required>
            <option value="">Seleccione un departamento</option>
          </select>
        </div>
        <div class="campo" id="campoDocente" style="display: none;">
          <label>Tipo de Docente:</label>
          <select id="docenteSeleccionado" required>
            <option value="">Seleccione un tipo de docente</option>
            <option value="Docente A">Docente A</option>
            <option value="Docente B">Docente B</option>
          </select>
        </div>
        <div class="campo">
          <label>Tipo de Empleado:</label>
          <select id="tipoEmpleadoSeleccionado" required>
            <option value="">Seleccione tipo</option>
            <option value="Sindicalizado">Sindicalizado</option>
            <option value="No Sindicalizado">No Sindicalizado</option>
          </select>
        </div>
        <button type="button" id="btnGuardar">
          ${empleadoEncontrado ? 'Guardar Cambios' : 'Guardar Empleado'}
        </button>
      </form>
    </div>
  `;

  // Obtener referencias a los elementos
  const inputBusqueda = document.getElementById('busqueda');
  const btnBuscar = document.getElementById('btnBuscar');
  const mensajeEmpleado = document.getElementById('mensajeEmpleado');
  const formEmpleado = document.getElementById('formEmpleado');
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
  const campoDocente = document.getElementById('campoDocente');
  const selectDocente = document.getElementById('docenteSeleccionado');
  const selectTipoEmpleado = document.getElementById('tipoEmpleadoSeleccionado');
  const btnGuardar = document.getElementById('btnGuardar');

  // Función para actualizar el select de departamentos según el área seleccionada
  function actualizarDepartamento() {
    const area = selectArea.value;
    selectDepartamento.innerHTML = `<option value="">Seleccione un departamento</option>`;
    if (area && departmentCodes[area]) {
      Object.keys(departmentCodes[area]).forEach(dep => {
        const option = document.createElement('option');
        option.value = dep;
        option.textContent = dep;
        selectDepartamento.appendChild(option);
      });
    }
    // Mostrar u ocultar el campo de docente según el área
    if (area === 'Docentes') {
      campoDocente.style.display = 'block';
    } else {
      campoDocente.style.display = 'none';
      selectDocente.value = "";
    }
  }
  selectArea.addEventListener('change', actualizarDepartamento);

  // Función para buscar empleado por ID
  async function buscarEmpleado() {
    busqueda = inputBusqueda.value.trim();
    if (!busqueda) {
      alert("Ingrese un ID de usuario para buscar.");
      return;
    }
    try {
      const q = query(collection(db, 'empleados'), where('id_usuario', '==', busqueda));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const empleadoDoc = querySnapshot.docs[0];
        const data = empleadoDoc.data();
        inputIdUsuario.value = data.id_usuario || '';
        inputNombre.value = data.nombre || '';
        inputCorreo.value = data.correo || '';
        selectTipoUsuario.value = data.tipo_usuario || 'usuario';
        if (data.fecha_contratacion) {
          const fecha = data.fecha_contratacion.toDate().toISOString().split('T')[0];
          inputFechaContratacion.value = fecha;
        } else {
          inputFechaContratacion.value = '';
        }
        inputPuesto.value = data.puesto || '';
        inputFoto.value = data.Foto || '';
        inputNumeroTelefono.value = data.numero_telefono || '';
        selectArea.value = Object.keys(areaCodes).find(key => areaCodes[key] === data.Area) || '';
        actualizarDepartamento();
        selectDepartamento.value = Object.keys(departmentCodes[selectArea.value] || {}).find(
          key => departmentCodes[selectArea.value][key] === data.Departamento
        ) || '';
        selectDocente.value = data.Docente || '';
        selectTipoEmpleado.value = data.TipoEmpleado || '';
        empleadoEncontrado = true;
        documentoId = empleadoDoc.id;
        mensajeEmpleado.textContent = "Empleado encontrado. Modifique los campos y guarde los cambios.";
      } else {
        alert("Empleado no encontrado");
        empleadoEncontrado = false;
        documentoId = null;
        mensajeEmpleado.textContent = "";
      }
    } catch (error) {
      console.error("Error al buscar el empleado:", error);
    }
  }
  btnBuscar.addEventListener('click', buscarEmpleado);

  // Función para guardar o actualizar el empleado
  async function handleGuardar() {
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
      if (empleadoEncontrado && documentoId) {
        const empleadoDocRef = doc(db, 'empleados', documentoId);
        await updateDoc(empleadoDocRef, empleadoData);
        alert("Empleado actualizado correctamente");
      } else {
        await addDoc(collection(db, 'empleados'), empleadoData);
        alert("Empleado agregado correctamente");
      }
      window.location.href = '/principalAdmin.html';
    } catch (error) {
      console.error("Error al guardar el empleado:", error);
      alert("Hubo un error al guardar el empleado.");
    }
  }
  btnGuardar.addEventListener('click', handleGuardar);
});
