import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
// 🔥 IMPORTAMOS FIRESTORE AQUÍ
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js"; 

const firebaseConfig = {
  apiKey: "AIzaSyAcXtEv0KgulGryJdB0k4S9M7v_pIjz7Dk",
  authDomain: "control-acceso-cam.firebaseapp.com",
  projectId: "control-acceso-cam",
  storageBucket: "control-acceso-cam.firebasestorage.app",
  messagingSenderId: "168128418954",
  appId: "1:168128418954:web:e2689602c343bdfdf78973"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const dbFrontend = getFirestore(app); // Inicializamos la base de datos en el cliente

// ELEMENTOS
const loginDiv = document.getElementById("login");
const panelDiv = document.getElementById("app");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnDashboard = document.getElementById("btnDashboard");
const btnActividad = document.getElementById("btnActividad");

// 🔐 LOGIN
btnLogin.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Error: " + error.message);
  }
});

// LOGOUT
btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

// DASHBOARDS
btnDashboard.addEventListener("click", () => {
  window.location.href = "dashboard-entradas.html";
});

btnActividad.addEventListener("click", () => {
  window.location.href = "dashboard-actividad.html";
});

// CONTROL DE SESIÓN
onAuthStateChanged(auth, (user) => {
  if (user) {
    loginDiv.classList.add("hidden");
    panelDiv.classList.remove("hidden");
    cargarCamionesRegistrados();
  } else {
    loginDiv.classList.remove("hidden");
    panelDiv.classList.add("hidden");
  }
});

// CAMIONES REGISTRADOS (CON CONSULTA DIRECTA A FIRESTORE)
async function cargarCamionesRegistrados() {
  try {
    // 1. Obtenemos la lista base de camiones desde tu backend
    const res = await fetch("/api/camiones");
    if (!res.ok) throw new Error("Error en API");
    const data = await res.json();

    const lista = document.getElementById("listaCamionesAdmin");
    lista.innerHTML = "";

    if (data.length === 0) {
      lista.innerHTML = "<p class='no-data'>No hay camiones registrados actualmente.</p>";
      return;
    }

    // Usamos for...of porque necesitamos hacer 'await' para consultar a Firebase
    for (const camion of data) {
      let estaEnPlanta = false; // Por defecto asumimos que está fuera

      try {
        // 2. 🔥 Vamos DIRECTO a Firestore a revisar el estado_actual de ESTE camión
        const estadoRef = doc(dbFrontend, "estado_actual", camion.camion_id);
        const estadoSnap = await getDoc(estadoRef);

        if (estadoSnap.exists()) {
          // Extraemos el valor del campo 'dentro'
          estaEnPlanta = estadoSnap.data().dentro; 
        }
      } catch (fbError) {
        console.warn(`No se pudo obtener el estado del camión ${camion.camion_id}:`, fbError);
      }

      const textoEstado = estaEnPlanta ? "🟢 EN PLANTA" : "🔴 FUERA";
      const claseEstado = estaEnPlanta ? "badge-dentro" : "badge-fuera";

      const card = document.createElement("div");
      card.className = "truck-card";

      // Estructura profesional con el estado integrado
      card.innerHTML = `
        <div class="truck-main-info">
          <div class="truck-icon">🚚</div>
          <div class="truck-details">
            <span class="truck-plate">${camion.patente || "SIN-PATENTE"}</span>
            <span class="truck-driver">👤 ${camion.chofer || "Sin chofer asignado"}</span>
            <span class="truck-id-tag">ID: ${camion.camion_id}</span>
          </div>
        </div>
        <div class="truck-meta-info">
          <span class="status-badge activo">ACTIVO</span>
          <span class="status-badge ${claseEstado}">${textoEstado}</span>
        </div>
      `;

      lista.appendChild(card);
    }

  } catch (error) {
    console.error("Error cargando camiones:", error);
    document.getElementById("listaCamionesAdmin").innerHTML = "<p class='error-msg'>⚠️ Error al conectar con el servidor.</p>";
  }
}