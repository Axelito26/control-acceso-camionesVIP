const express = require("express");
const router = express.Router();

module.exports = (db) => {

  // 1. REGISTRAR CAMIÓN NUEVO
  router.post("/", async (req, res) => {
    try {
      const { camion_id, patente, chofer, rfid_uid } = req.body;

      if (!camion_id || !patente || !chofer || !rfid_uid) {
        return res.status(400).json({ error: "Faltan datos" });
      }

      const camionRef = db.collection("camiones").doc(camion_id);
      const camionDoc = await camionRef.get();

      if (camionDoc.exists) {
        return res.status(400).json({ error: "El camión ya existe" });
      }

      const patenteQuery = await db.collection("camiones")
        .where("patente", "==", patente).get();

      if (!patenteQuery.empty) {
        return res.status(400).json({ error: "Patente ya registrada" });
      }

      const rfidQuery = await db.collection("camiones")
        .where("rfid_uid", "==", rfid_uid).get();

      if (!rfidQuery.empty) {
        return res.status(400).json({ error: "RFID ya registrado" });
      }

      await camionRef.set({ patente, chofer, rfid_uid, activo: true });
      res.json({ mensaje: "Camión registrado correctamente" });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. OBTENER LISTA DE CAMIONES
  router.get("/", async (req, res) => {
    try {
      const snapshot = await db.collection("camiones").get();
      const camiones = [];
      snapshot.forEach(doc => camiones.push({ camion_id: doc.id, ...doc.data() }));
      res.json(camiones);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. ACCESO ESP32 — ENTRADA Y SALIDA
  router.post("/acceso", async (req, res) => {
    try {
      const { tag } = req.body;

      if (!tag) return res.status(400).json({ error: "Falta el tag RFID" });

      const camionQuery = await db.collection("camiones")
        .where("rfid_uid", "==", tag).get();

      if (camionQuery.empty) {
        return res.status(403).json({ error: "Acceso denegado: Tag no autorizado" });
      }

      const camionDoc  = camionQuery.docs[0];
      const camionData = camionDoc.data();
      const camion_id  = camionDoc.id;

      const estadoRef = db.collection("estado_actual").doc(camion_id);
      const estadoDoc = await estadoRef.get();

      const dentro       = estadoDoc.exists ? estadoDoc.data().dentro : false;
      const tipoRegistro = dentro ? "salida" : "entrada";
      const nuevoDentro  = !dentro;
      const ahora        = new Date();

      const nuevoEstado = { dentro: nuevoDentro };
      if (tipoRegistro === "entrada") {
        nuevoEstado.ultima_entrada = ahora;
      } else {
        nuevoEstado.ultima_salida = ahora;
      }
      await estadoRef.set(nuevoEstado, { merge: true });

      await db.collection("registros").add({
        camion_id: camion_id,
        patente:   camionData.patente,
        chofer:    camionData.chofer,
        rfid_uid:  tag,
        metodo:    "rfid",
        tipo:      tipoRegistro,
        timestamp: ahora
      });

      res.status(200).json({
        mensaje:   "Acceso concedido",
        tipo:      tipoRegistro,
        patente:   camionData.patente,
        camion_id: camion_id
      });

    } catch (error) {
      console.error("Error procesando acceso:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;  // ← esto faltaba
};                // ← esto también faltaba