// ajustes.js
import { auth, db } from '../BD/firebaseConfig.js';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  deleteField,
  addDoc,
  query,
  where,
  orderBy
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11/+esm';

/** ——— Función Genérica de Auditoría ——— */
async function logAction(description) {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, 'auditLogs'), {
    userId:    user.uid,
    userName:  user.displayName || user.email || 'Anónimo',
    action:    description,
    timestamp: Date.now()
  });
}

/** ——— ÁREAS ——— */
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

  for (const [nombre, clave] of Object.entries(datos)) {
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
        await logAction(`Actualizó área "${nombre}" a "${nuevo}"`);
        Swal.fire('Área actualizada');
        inicializarAreas();
      }
    });

    eliminar.addEventListener('click', async () => {
      await updateDoc(doc(db, 'areas', 'doc'), { [nombre]: deleteField() });
      await logAction(`Eliminó área "${nombre}"`);
      Swal.fire('Área eliminada');
      inicializarAreas();
    });

    lista.appendChild(div);
  }

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
        await logAction(`Agregó área "${nombre}" (clave ${clave})`);
        Swal.fire('Área agregada');
        inicializarAreas();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);

  // Actualiza el select de departamentos
  const select = document.getElementById('select-area');
  select.innerHTML = '';
  for (const [nombre, clave] of Object.entries(datos)) {
    const option = document.createElement('option');
    option.value = clave;
    option.textContent = nombre;
    select.appendChild(option);
  }
  select.addEventListener('change', inicializarDepartamentos);
}

/** ——— DEPARTAMENTOS ——— */
function generarClaveDepartamento(valores) {
  const nums = valores
    .map(v => parseInt(v))
    .filter(n => !isNaN(n))
    .sort((a, b) => b - a);
  return (nums[0] + 1 || 1).toString().padStart(2, '0');
}

async function inicializarDepartamentos() {
  const lista = document.getElementById('lista-departamentos');
  const areaID = document.getElementById('select-area').value;
  lista.innerHTML = '';
  if (!areaID) return;

  const ref = doc(db, 'departamentos', areaID);
  const snap = await getDoc(ref);
  const departamentos = snap.exists() ? snap.data() : {};

  for (const [nombre, valor] of Object.entries(departamentos)) {
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
        await logAction(`Actualizó departamento "${nombre}" a "${nuevo}" en área ${areaID}`);
        Swal.fire('Departamento actualizado');
        inicializarDepartamentos();
      }
    });

    eliminar.addEventListener('click', async () => {
      await updateDoc(ref, { [nombre]: deleteField() });
      await logAction(`Eliminó departamento "${nombre}" en área ${areaID}`);
      Swal.fire('Departamento eliminado');
      inicializarDepartamentos();
    });

    lista.appendChild(div);
  }

  const btn = document.createElement('button');
  btn.textContent = '+ Agregar Departamento';
  btn.addEventListener('click', () => {
    const div = document.createElement('div');
    div.innerHTML = `
      <input type="text" placeholder="Nombre del departamento" />
      <button>Guardar</button>
    `;
    const [input, guardar] = div.querySelectorAll('input, button');
    guardar.addEventListener('click', async () => {
      const nombre = input.value.trim();
      if (nombre && !departamentos[nombre]) {
        const clave = generarClaveDepartamento(Object.values(departamentos));
        await updateDoc(ref, { [nombre]: clave });
        await logAction(`Agregó departamento "${nombre}" (clave ${clave}) en área ${areaID}`);
        Swal.fire('Departamento agregado');
        inicializarDepartamentos();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);
}

/** ——— JEFES INMEDIATOS ——— */
async function cargarJefes() {
  const snap = await getDocs(collection(db, 'jefesInmediatos'));
  return snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
}

async function inicializarJefes() {
  const lista = document.getElementById('lista-jefes');
  lista.innerHTML = '';
  const datos = await cargarJefes();

  for (const { id, nombre } of datos) {
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
        await logAction(`Actualizó jefe "${nombre}" a "${nuevo}"`);
        Swal.fire('Jefe actualizado');
        inicializarJefes();
      }
    });

    eliminar.addEventListener('click', async () => {
      await deleteDoc(doc(db, 'jefesInmediatos', id));
      await logAction(`Eliminó jefe "${nombre}"`);
      Swal.fire('Jefe eliminado');
      inicializarJefes();
    });

    lista.appendChild(div);
  }

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
        const ref = await addDoc(collection(db, 'jefesInmediatos'), { nombre });
        await logAction(`Agregó jefe "${nombre}" (id ${ref.id})`);
        Swal.fire('Jefe agregado');
        inicializarJefes();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);
}

/** ——— PUESTOS DE JEFES ——— */
async function cargarPuestos() {
  const snap = await getDocs(collection(db, 'puestosJefes'));
  return snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
}

async function inicializarPuestos() {
  const lista = document.getElementById('lista-puestos');
  lista.innerHTML = '';
  const datos = await cargarPuestos();
  const idsExistentes = datos.map(p => p.id);

  for (const { id, nombre } of datos) {
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
        await logAction(`Actualizó puesto "${nombre}" a "${nuevo}" (id ${id})`);
        Swal.fire('Puesto actualizado');
        inicializarPuestos();
      }
    });

    eliminar.addEventListener('click', async () => {
      await deleteDoc(doc(db, 'puestosJefes', id));
      await logAction(`Eliminó puesto "${nombre}" (id ${id})`);
      Swal.fire('Puesto eliminado');
      inicializarPuestos();
    });

    lista.appendChild(div);
  }

  const btn = document.createElement('button');
  btn.textContent = '+ Agregar Puesto';
  btn.addEventListener('click', () => {
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
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');
        if (idsExistentes.includes(id)) {
          Swal.fire('Ya existe un puesto con ese ID');
          return;
        }
        await setDoc(doc(db, 'puestosJefes', id), { nombre });
        await logAction(`Agregó puesto "${nombre}" (id ${id})`);
        Swal.fire('Puesto agregado');
        inicializarPuestos();
      }
    });
    lista.appendChild(div);
  });
  lista.appendChild(btn);
}

/** ——— LÍMITES DE PERMISOS ——— */
async function cargarLimites() {
  const docRef = doc(db, 'limitesPermisos', 'global');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const d = snap.data();
    document.getElementById('limite-personal').value  = d.personal || '';
    document.getElementById('limite-salud').value     = d.salud    || '';
    document.getElementById('limite-sindical').value = d.sindical || '';
    document.getElementById('limite-parcial').value  = d.parcial  || '';
  }
}

document.getElementById('guardar-limites').addEventListener('click', async () => {
  const limites = {
    personal:  parseInt(document.getElementById('limite-personal').value)  || 0,
    salud:     parseInt(document.getElementById('limite-salud').value)     || 0,
    sindical: parseInt(document.getElementById('limite-sindical').value) || 0,
    parcial:  parseInt(document.getElementById('limite-parcial').value)  || 0,
  };
  await setDoc(doc(db, 'limitesPermisos', 'global'), limites);
  await logAction(`Actualizó límites de permisos: ${JSON.stringify(limites)}`);
  Swal.fire('Límites actualizados correctamente');
});

/** ——— CARGAR AUDIT LOG ——— */
async function inicializarAuditLog() {
  const cont = document.getElementById('lista-audit');
  cont.innerHTML = '';
  const user = auth.currentUser;
  if (!user) {
    cont.innerHTML = '<p>Debe iniciar sesión para ver el registro.</p>';
    return;
  }
  const logsRef = collection(db, 'auditLogs');
  const q = query(
    logsRef,
    where('userId', '==', user.uid),
    orderBy('timestamp', 'desc')
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    cont.innerHTML = '<p>No hay entradas de auditoría.</p>';
    return;
  }
  snap.forEach(d => {
    const data = d.data();
    const fecha = new Date(data.timestamp).toLocaleString();
    const div = document.createElement('div');
    div.innerHTML = `<small>${fecha}</small> — ${data.action}`;
    cont.appendChild(div);
  });
}

/** ——— TABS, SIDEBAR Y ARRANQUE ——— */
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

window.addEventListener('DOMContentLoaded', () => {
  // — Sidebar toggle & dropdowns —
  const toggleDropdown = (container, menu, open) => {
    container.classList.toggle('open', open);
    menu.style.height = open ? `${menu.scrollHeight}px` : '0';
  };
  const closeAll = () => {
    document.querySelectorAll('.dropdown-container.open').forEach(c => {
      const menu = c.querySelector('.dropdown-menu');
      toggleDropdown(c, menu, false);
    });
  };
  document.querySelectorAll('.sidebar-toggler, .sidebar-menu-button').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAll();
      document.querySelector('.sidebar').classList.toggle('collapsed');
    });
  });
  document.querySelectorAll('.dropdown-container').forEach(c => {
    const toggle = c.querySelector('.dropdown-toggle');
    const menu = c.querySelector('.dropdown-menu');
    toggle.addEventListener('click', e => {
      e.preventDefault();
      const isOpen = c.classList.contains('open');
      closeAll();
      toggleDropdown(c, menu, !isOpen);
    });
  });

  // — Inicializaciones —
  inicializarAreas();
  inicializarDepartamentos();
  inicializarJefes();
  inicializarPuestos();
  cargarLimites();

  // — Audit log tras login —
  onAuthStateChanged(auth, user => {
    if (user) inicializarAuditLog();
    else {
      const cont = document.getElementById('lista-audit');
      cont.innerHTML = '<p>Debe iniciar sesión para ver el registro.</p>';
    }
  });
});
