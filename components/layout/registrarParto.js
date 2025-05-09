const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

// Utilidad para acceder a campos de la planilla ignorando mayúsculas y espacios
const getValor = (obj, clave) => {
  const claves = Object.keys(obj);
  const claveEncontrada = claves.find(k => k.trim().toLowerCase() === clave.trim().toLowerCase());
  if (!claveEncontrada) {
    console.warn(`⚠️ Campo "${clave}" no encontrado en evento:`, obj);
  }
  return claveEncontrada ? obj[claveEncontrada] : null;
};

const procesarParto = async (evento, tamboSel, firebase, usuario) => {
  console.log("📥 Evento recibido:", evento);

  const rpMadre = limpiarTexto(getValor(evento, "RP")).replace(/\s/g, "");
  const fechaEvento = getValor(evento, "Fecha)") || new Date().toISOString().split("T")[0];
  const tipoParto = getValor(evento, "TIPO DE PARTO");
  const observ = getValor(evento, "OBSERV");
  const sexoCria = getValor(evento, "Sexo Cria");
  const rpCria = limpiarTexto(getValor(evento, "RP Cria"));
  const rpCria2 = limpiarTexto(getValor(evento, "INSCRIBIR CRIA**"));

  const crias = [];

  try {
    console.log("🔍 Buscando madre con RP:", rpMadre);

    const madreQuery = await firebase.db.collection("animal")
      .where("idtambo", "==", tamboSel.id)
      .where("rp", "==", rpMadre)
      .get();

    if (madreQuery.empty) throw new Error(`Animal con RP ${rpMadre} no encontrado.`);

    const madreDoc = madreQuery.docs[0];
    const madreRef = firebase.db.collection("animal").doc(madreDoc.id);
    const madreData = madreDoc.data();

    console.log("👩‍🍼 Madre encontrada:", madreData);

    // ✅ Actualizar madre
    await madreRef.update({
      estrep: "vacia",
      fparto: fechaEvento,
      nservicios: 0,
      lactancia: (madreData.lactancia || 0) + 1,
      fservicio: ""
    });

    const registrarCria = async (rp, sexo) => {
      if (!rp) return;

      const existeCria = await firebase.db.collection("animal")
        .where("idtambo", "==", tamboSel.id)
        .where("rp", "==", rp)
        .where("fbaja", "==", "")
        .get();

      if (!existeCria.empty) {
        console.warn(`⚠️ Cría con RP ${rp} ya existe. Solo se registrará el evento.`);
      } else {
        const nuevaCria = {
          ingreso: fechaEvento,
          idtambo: tamboSel.id,
          rp,
          erp: "",
          lactancia: 0,
          observaciones: "",
          estpro: "cria",
          estrep: "vacia",
          fparto: "",
          fservicio: "",
          categoria: "Vaquillona",
          racion: 8,
          porcentaje: 1,
          fracion: firebase.ayerTimeStamp(),
          nservicio: 1,
          uc: 0,
          fuc: firebase.nowTimeStamp(),
          ca: 0,
          anorm: "",
          fbaja: "",
          mbaja: "",
          rodeo: 0,
          sugerido: 0,
        };

        const res = await firebase.db.collection("animal").add(nuevaCria);
        console.log(`✅ Cría con RP ${rp} registrada con ID: ${res.id}`);
      }

      crias.push({ rp, sexo });
    };

    await registrarCria(rpCria, sexoCria);

    if (tipoParto === "Mellizos") {
      const sexoCria2 = getValor(evento, "Sexo Cria 2") || "";
      await registrarCria(rpCria2, sexoCria2);
    }

    const refEventos = madreRef.collection("eventos");
    const eventoObj = {
      crias,
      rp: rpMadre,
      tipo: "Parto",
      fecha: firebase.fechaTimeStamp(fechaEvento), // ✅ ahora como Timestamp ajustado
      tambo: tamboSel.id,
      detalle: `${observ} - ${tipoParto}`,
      usuario: `${usuario.displayName} - Dirsa`,
    };

    await refEventos.add(eventoObj);
    console.log(`✅ Evento de parto registrado para RP ${rpMadre}`);
  } catch (error) {
    console.error(`❌ Error general registrando parto para RP ${rpMadre}:`, error.message);
  }
};

export default procesarParto;
