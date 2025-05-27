// Importar configuración y métodos de Firebase Firestore
import { db } from '../BD/firebaseConfig.js';
import { collection, doc, getDocs, getDoc, query, where, updateDoc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('agregar-empleado-container');

  let areaMap = {}; // { 'A1': 'Dirección General', ... }
  let deptMap = {}; // { 'A1': { '01': 'Dirección General', ... }, ... }
  let busqueda = "";
  let empleadoEncontrado = false;
  let documentoId = null;

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
    const snapshot = await getDocs(collection(db, "departamentos"));
    snapshot.forEach(docSnap => {
      const areaId = docSnap.id;
      const data = docSnap.data();
      deptMap[areaId] = {};
      for (const [deptName, deptId] of Object.entries(data)) {
        deptMap[areaId][deptId] = deptName;
      }
    });
  }

  await fetchAreaMap();
  await fetchDeptMap();

  // Renderizamos la interfaz
  const areaOptions = Object.entries(areaMap).map(([areaId, areaName]) => `<option value="${areaId}">${areaName}</option>`).join('');

  container.innerHTML = `
    <div class="agregar-empleado-container">
      <h2>Agregar Empleado</h2>
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
            ${areaOptions}
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
          Guardar Empleado
        </button>
      </form>
    </div>
  `;

  const selectArea = document.getElementById('areaSeleccionada');
  const selectDepartamento = document.getElementById('departamentoSeleccionado');
  const campoDocente = document.getElementById('campoDocente');
  const selectDocente = document.getElementById('docenteSeleccionado');

  function actualizarDepartamento() {
    const areaId = selectArea.value;
    selectDepartamento.innerHTML = '<option value="">Seleccione un departamento</option>';
    if (deptMap[areaId]) {
      Object.entries(deptMap[areaId]).forEach(([deptId, deptName]) => {
        const option = document.createElement('option');
        option.value = deptId;
        option.textContent = deptName;
        selectDepartamento.appendChild(option);
      });
    }
    if (areaMap[areaId] === 'Docentes') {
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
    // 1) Correo válido
    const correoVal = inputCorreo.value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!correoVal || !emailRe.test(correoVal)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Correo inválido',
        text: 'Ingresa un correo en formato válido.'
      });
      return;
    }

    // 2) ID usuario numérico
    const idVal = inputIdUsuario.value.trim();
    if (!/^\d+$/.test(idVal)) {
      await Swal.fire({
        icon: 'warning',
        title: 'ID inválido',
        text: 'El ID de usuario debe ser un número.'
      });
      return;
    }

    // 3) Nombre
    const nombreVal = inputNombre.value.trim();
    if (!nombreVal) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta nombre',
        text: 'Ingresa el nombre del empleado.'
      });
      return;
    }

    // 4) Fecha de contratación
    if (!inputFechaContratacion.value) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta fecha',
        text: 'Selecciona la fecha de contratación.'
      });
      return;
    }

    // 5) Puesto
    const puestoVal = inputPuesto.value.trim();
    if (!puestoVal) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta puesto',
        text: 'Ingresa el puesto del empleado.'
      });
      return;
    }

    // 6) Teléfono (638-104-6882 ó 638 104 6882 ó 6381046882)
    const telVal = inputNumeroTelefono.value.trim();
    const telRe = /^[0-9]{3}[- ]?[0-9]{3}[- ]?[0-9]{4}$/;
    if (!telRe.test(telVal)) {
      await Swal.fire({
        icon: 'warning',
        title: 'Teléfono inválido',
        text: 'Formatos aceptados: 638-104-6882, 638 104 6882 o 6381046882.'
      });
      return;
    }

    // 7) Área y departamento
    if (!selectArea.value) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta área',
        text: 'Selecciona un área.'
      });
      return;
    }
    if (!selectDepartamento.value) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta departamento',
        text: 'Selecciona un departamento.'
      });
      return;
    }

    // 8) Si es Docentes, validar tipo de docente
    if (selectArea.value === 'Docentes' && !selectDocente.value) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta tipo de docente',
        text: 'Selecciona el tipo de docente.'
      });
      return;
    }

    // 9) Tipo de empleado
    if (!selectTipoEmpleado.value) {
      await Swal.fire({
        icon: 'warning',
        title: 'Falta tipo de empleado',
        text: 'Selecciona el tipo de empleado.'
      });
      return;
    }

    // 10) Foto (URL) opcional: validar longitud mínima si no está vacía
    const fotoVal = inputFoto.value.trim();
    if (fotoVal && fotoVal.length < 5) {
      await Swal.fire({
        icon: 'warning',
        title: 'URL inválida',
        text: 'La URL de la foto parece incorrecta.'
      });
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

      // ↓ ELIMINADO window.location.href
      // window.location.href = '/principalAdmin.html';

      // Opcional: Limpio el formulario para ingresar otro
      formEmpleado.reset();
      empleadoEncontrado = false;
      documentoId = null;
      mensajeEmpleado.textContent = "";

    } catch (error) {
      console.error("Error al guardar el empleado:", error);
      alert("Hubo un error al guardar el empleado.");
    }
  }
  btnGuardar.addEventListener('click', handleGuardar);
});
