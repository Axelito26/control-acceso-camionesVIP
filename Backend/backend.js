const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const open = (...args) => import('open').then(mod => mod.default(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

//Firebase
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const dashboardRoutes = require('./routes/dashboard')(db);
// 📦 IMPORTAR RUTAS
const camionesRoutes = require('./routes/camiones')(db);
const registrosRoutes = require('./routes/registros')(db);
const procesarRoutes = require('./routes/procesar')(db);

// 📌 USAR RUTAS
app.use('/api/camiones', camionesRoutes);
app.use('/api/registros', registrosRoutes);
app.use('/api/procesar', procesarRoutes);

// ROOT
app.get("/", (req, res) => {
  res.redirect("/admin.html");
});

// SERVER
app.listen(3000, async () => {
  console.log("Servidor corriendo en http://localhost:3000");

  // abre automáticamente el panel admin
  await open('http://localhost:3000/admin.html');
});