import { db } from '../BD/firebaseConfig.js';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, deleteField
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';


/* ======================= ÁREAS ======================= */
async function cargarAreas() {
  const ref = doc(db, 'areas', 'doc');
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : {};
}

function generarClaveArea(claves) {
  const nums = claves
    .map(k => parseInt(k.replace("A", "")))
    .filter(n => !isNaN(n))
    .sort((a, b) => b - a);
  return "A" + ((nums[0] || 0) + 1);
}

async function inicializarAreas() {
  const lista = document.getElementById('lista-areas');
  lista.innerHTML = '';

  const datos = await cargarAreas();
  const claves = Object.values(datos);

  Object.entries(datos).forEach(([nombre, clave]) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" value="${nombre}" />
      <button>Guardar</button>
      <button class="eliminar">🗑️</button>
    `;
    const [input, guardar, eliminar] = div.querySelectorAll('input, button');

    guardar.addEventListener('click', async () => {
      const nuevo = input.value.trim();
      if (nuevo && nuevo !== nombre) {
        await updateDoc(doc(db, 'areas', 'doc'), {
          [nombre]: deleteField(),
          [nuevo]: clave
        });
        Swal.fire('Área actualizada');
        inicializarAreas();
      }
    });

    eliminar.addEventListener('click', async () => {
      await updateDoc(doc(db, 'areas', 'doc'), {
        [nombre]: deleteField()
      });
      Swal.fire('Área eliminada');
      inicializarAreas();
    });

    lista.appendChild(div);
  });

  const btn = document.createElement('button');
  btn.textContent = '+ Agregar Área';
  btn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" placeholder="Nombre del área" />
      <button>Guardar</button>
    `;
    const [input, guardar] = div.querySelectorAll('input, button');

    guardar.addEventListener('click', async () => {
      const nombre = input.value.trim();
      if (nombre && !datos[nombre]) {
        const clave = generarClaveArea(claves);
        await updateDoc(doc(db, 'areas', 'doc'), { [nombre]: clave });
        Swal.fire('Área agregada');
        inicializarAreas();
      }
    });

    lista.appendChild(div);
  });

  lista.appendChild(btn);

  // También llenar el <select> para departamentos
  const select = document.getElementById('select-area');
  select.innerHTML = '';
  Object.entries(datos).forEach(([nombre, clave]) => {
    const option = document.createElement('option');
    option.value = clave;
    option.textContent = nombre;
    select.appendChild(option);
  });

  select.addEventListener('change', () => {
    inicializarDepartamentos();
  });
}

/* ======================= DEPARTAMENTOS ======================= */
function generarClaveDepartamento(valores) {
  const nums = valores.map(v => parseInt(v)).filter(n => !isNaN(n)).sort((a, b) => b - a);
  return (nums[0] + 1 || 1).toString().padStart(2, '0');
}

async function inicializarDepartamentos() {
  const lista = document.getElementById('lista-departamentos');
  const select = document.getElementById('select-area');
  const areaID = select.value;
  lista.innerHTML = '';

  if (!areaID) return;

  const ref = doc(db, 'departamentos', areaID);
  const snap = await getDoc(ref);
  const departamentos = snap.exists() ? snap.data() : {};

  Object.entries(departamentos).forEach(([nombre, valor]) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" value="${nombre}" />
      <button>Guardar</button>
      <button class="eliminar">🗑️</button>
    `;
    const [input, guardar, eliminar] = div.querySelectorAll('input, button');

    guardar.addEventListener('click', async () => {
      const nuevo = input.value.trim();
      if (nuevo && nuevo !== nombre) {
        await updateDoc(ref, {
          [nombre]: deleteField(),
          [nuevo]: valor
        });
        Swal.fire('Departamento actualizado');
        inicializarDepartamentos();
      }
    });

    eliminar.addEventListener('click', async () => {
      await updateDoc(ref, { [nombre]: deleteField() });
      Swal.fire('Departamento eliminado');
      inicializarDepartamentos();
    });

    lista.appendChild(div);
  });

  const btn = document.createElement('button');
  btn.textContent = '+ Agregar Departamento';
  btn.addEventListener('click', async () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" placeholder="Nombre del departamento" />
      <button>Guardar</button>
    `;
    const [input, guardar] = div.querySelectorAll('input, button');
    guardar.addEventListener('click', async () => {
      const nombre = input.value.trim();
      if (nombre && !departamentos[nombre]) {
        const valores = Object.values(departamentos);
        const clave = generarClaveDepartamento(valores);
        await updateDoc(ref, { [nombre]: clave });
        Swal.fire('Departamento agregado');
        inicializarDepartamentos();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);
}

/* ======================= JEFES INMEDIATOS ======================= */
async function cargarJefes() {
  const snapshot = await getDocs(collection(db, 'jefesInmediatos'));
  return snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre }));
}

async function inicializarJefes() {
  const lista = document.getElementById('lista-jefes');
  lista.innerHTML = '';
  const datos = await cargarJefes();

  datos.forEach(({ id, nombre }) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" value="${nombre}" />
      <button>Guardar</button>
      <button class="eliminar">🗑️</button>
    `;
    const [input, guardar, eliminar] = div.querySelectorAll('input, button');
    guardar.addEventListener('click', async () => {
      const nuevo = input.value.trim();
      if (nuevo && nuevo !== nombre) {
        await updateDoc(doc(db, 'jefesInmediatos', id), { nombre: nuevo });
        Swal.fire('Jefe actualizado');
        inicializarJefes();
      }
    });
    eliminar.addEventListener('click', async () => {
      await deleteDoc(doc(db, 'jefesInmediatos', id));
      Swal.fire('Jefe eliminado');
      inicializarJefes();
    });
    lista.appendChild(div);
  });

  const btn = document.createElement('button');
  btn.textContent = '+ Agregar Jefe Inmediato';
  btn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" placeholder="Nombre del jefe" />
      <button>Guardar</button>
    `;
    const [input, guardar] = div.querySelectorAll('input, button');
    guardar.addEventListener('click', async () => {
      const nombre = input.value.trim();
      if (nombre) {
        const ref = doc(collection(db, 'jefesInmediatos'));
        await setDoc(ref, { nombre });
        Swal.fire('Jefe agregado');
        inicializarJefes();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);
}

/* ======================= PUESTOS DE JEFES ======================= */
async function cargarPuestos() {
  const snapshot = await getDocs(collection(db, 'puestosJefes'));
  return snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre }));
}

async function inicializarPuestos() {
  const lista = document.getElementById('lista-puestos');
  lista.innerHTML = '';

  const datos = await cargarPuestos();
  const idsExistentes = datos.map(p => p.id);

  datos.forEach(({ id, nombre }) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" value="${nombre}" />
      <button>Guardar</button>
      <button class="eliminar">🗑️</button>
    `;
    const [input, guardar, eliminar] = div.querySelectorAll('input, button');

    guardar.addEventListener('click', async () => {
      const nuevo = input.value.trim();
      if (nuevo && nuevo !== nombre) {
        await updateDoc(doc(db, 'puestosJefes', id), { nombre: nuevo });
        Swal.fire('Puesto actualizado');
        inicializarPuestos();
      }
    });

    eliminar.addEventListener('click', async () => {
      await deleteDoc(doc(db, 'puestosJefes', id));
      Swal.fire('Puesto eliminado');
      inicializarPuestos();
    });

    lista.appendChild(div);
  });

  const btnAgregar = document.createElement('button');
  btnAgregar.textContent = '+ Agregar Puesto';
  btnAgregar.addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" placeholder="Nombre del puesto" />
      <button>Guardar</button>
    `;
    const [input, guardar] = div.querySelectorAll('input, button');

    guardar.addEventListener('click', async () => {
      const nombre = input.value.trim();
      if (nombre) {
        const id = nombre
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin tildes
          .replace(/\s+/g, '_')                            // espacios → "_"
          .replace(/[^\w_]/g, '');                         // eliminar símbolos

        if (idsExistentes.includes(id)) {
          Swal.fire('Ya existe un puesto con ese ID');
          return;
        }

        await setDoc(doc(db, 'puestosJefes', id), { nombre });
        Swal.fire('Puesto agregado');
        inicializarPuestos();
      }
    });

    lista.appendChild(div);
  });

  lista.appendChild(btnAgregar);
}


/* ======================= TABS ======================= */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
  });
});

/* ======================= INICIO ======================= */
window.addEventListener('DOMContentLoaded', () => {
  inicializarAreas();
  inicializarDepartamentos();
  inicializarJefes();
  inicializarPuestos();
});
