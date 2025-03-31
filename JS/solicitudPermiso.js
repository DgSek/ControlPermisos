// Importamos la configuración de Firebase y los métodos necesarios de Firestore
import { db } from '../BD/firebaseConfig.js';
import { collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  // Extraer datos del empleado desde la query string (por ejemplo: ?id_usuario=123&nombre=Juan&puesto=Ingeniero&areaId=A1&departamentoId=B1&numeroPermiso=5)
  const params = new URLSearchParams(window.location.search);
  const id_usuario = params.get('id_usuario');
  const nombre = params.get('nombre');
  const puesto = params.get('puesto');
  const areaId = params.get('areaId');
  const departamentoId = params.get('departamentoId');
  const numeroPermiso = params.get('numeroPermiso');

  // Asignar valores a los campos de solo lectura
  document.getElementById('empleadoNombre').value = nombre || '';
  document.getElementById('empleadoPuesto').value = puesto || '';

  // Listas de jefes inmediatos y puestos (constantes)
  const jefesInmediatos = [
    "ARQ. JESUS RAFAEL SANCHEZ SEBREROS",
    "C.P ALVARO MARTIN PEREZ MANJARREZ",
    "LIC. MARITZA JOANA LOPEZ MARTINEZ",
    "LIC. SAUL MADERO TORRES",
    "LIC. LUIS PEREZ VALENZUELA",
    "C.P DAVID ALEJANDRO SOTO GRIJALVA",
    "PSIC. LAURA FANI SILVA RIOS",
    "MDE. CLAUDIA ISABEL PONCE OROZCO",
    "ING. RODRIGO GARCIA HERNANDEZ",
    "ING. MARCO ANTONIO PEREZ ELIAS",
    "MTRO. GABRIEL RIVERA SOLIS",
    "LIC. LUCIA HERNANDEZ SOTO",
    "LIC. SAMANTHA FATIMA SANTANA HERNANDEZ",
    "LIC. CELIA YADIRA SOTELO CASTRO",
    "LIC. DULCE JAQUELINE CORRAL CUADRAS"
  ];
  const puestosJefes = [
    "DIRECTOR GENERAL",
    "SUBDIRECCION DE SERVICIOS ADMINISTRATIVOS",
    "SUBDIRECCION DE PLANEACION Y VINCULACION",
    "SUBDIRECCION ACADEMICA"
  ];

  // Función para poblar un select con opciones
  const populateSelect = (selectId, options) => {
    const select = document.getElementById(selectId);
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
  };

  // Poblar los selects para jefes y puestos
  populateSelect('nombreJefe', jefesInmediatos);
  populateSelect('puestoJefe', puestosJefes);
  populateSelect('jefeAutoriza', jefesInmediatos);
  populateSelect('puestoJefeAutoriza', puestosJefes);

  // Variable para almacenar los archivos adjuntos
  let archivosAdjuntos = [];
  const fileInput = document.getElementById('fileAdjuntos');
  fileInput.addEventListener('change', (event) => {
    const files = Array.from(event.target.files);
    archivosAdjuntos = archivosAdjuntos.concat(files);
  });

  // Manejar el input de "horas de la falta"
  const horasFaltaInput = document.getElementById('horasFalta');
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

  // Manejar el cambio del tipo de permiso: si no es "Parcial", deshabilitar y limpiar "horasFalta"
  const tipoPermisoSelect = document.getElementById('tipoPermiso');
  tipoPermisoSelect.addEventListener('change', (e) => {
    const selectedTipo = e.target.value;
    if (selectedTipo !== "Parcial") {
      horasFaltaInput.value = "";
      horasFaltaInput.disabled = true;
    } else {
      horasFaltaInput.disabled = false;
    }
  });

  // Manejar el envío del formulario
  const form = document.getElementById('form-permiso');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!id_usuario || !nombre || !puesto || !areaId || !departamentoId) {
      alert("Faltan datos del empleado. Verifique la información.");
      return;
    }

    // Construir el id_permiso según el formato: areaId + departamentoId + numeroPermiso + '-' + id_usuario
    const idPermiso = `${areaId}${departamentoId}${numeroPermiso}-${id_usuario}`;
    const fechaSolicitud = new Date().toISOString(); // Fecha actual en formato ISO

    // Obtener los valores del formulario
    const motivoFalta = document.getElementById('motivoFalta').value;
    const horarioLaboral = document.getElementById('horarioLaboral').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const tipoPermiso = document.getElementById('tipoPermiso').value;
    const horasFalta = tipoPermiso === "Parcial" ? document.getElementById('horasFalta').value : null;
    const autorizacion = document.getElementById('autorizacion').value;
    const nombreJefe = document.getElementById('nombreJefe').value;
    const puestoJefe = document.getElementById('puestoJefe').value;
    const jefeAutoriza = document.getElementById('jefeAutoriza').value;
    const puestoJefeAutoriza = document.getElementById('puestoJefeAutoriza').value;

    try {
      await addDoc(collection(db, "solicitud"), {
        id_permiso: idPermiso,
        id_usuario,
        nombre_empleado: nombre,
        puesto_empleado: puesto,
        motivo_falta: motivoFalta,
        nombre_jefe_inmediato: nombreJefe,
        puesto_jefe_inmediato: puestoJefe,
        horario_laboral: horarioLaboral,
        rango_fechas: { inicio: fechaInicio, fin: fechaFin },
        autorizacion_goce_sueldo: autorizacion,
        tipo_permiso: tipoPermiso,
        horas_falta: horasFalta,
        jefe_autoriza_permiso: jefeAutoriza,
        puesto_jefe_autoriza: puestoJefeAutoriza,
        archivos_adjuntos: archivosAdjuntos.map(file => file.name),
        fecha_solicitud: fechaSolicitud
      });

      alert(`Solicitud enviada exitosamente con ID: ${idPermiso}`);
      form.reset();
      archivosAdjuntos = [];
      horasFaltaInput.disabled = true;
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      alert("Error al enviar la solicitud.");
    }
  });
});
