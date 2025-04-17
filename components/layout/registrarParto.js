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
  const fechaEvento = getValor(evento, "FECHA DE EVENTO (xx/xx/xxxx)") || new Date().toISOString().split("T")[0];
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

    await madreRef.update({
      estrep: "vacia",
      fparto: fechaEvento,
      nservicios: 0,
      lactancia: (madreData.lactancia || 0) + 1,
      fservicio: ""
    });

    const registrarCria = async (rpCria) => {
      if (!rpCria) {
        console.warn("⚠️ RP de cría vacío. No se registrará.");
        return;
      }

      console.log(`🍼 Registrando cría con RP: ${rpCria}`);

      // Verificar si ya existe
      const existeCria = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('rp', '==', rpCria)
        .where('fbaja', '==', '')
        .get();

      if (!existeCria.empty) {
        console.warn(`⚠️ Cría con RP ${rpCria} ya existe. No se registrará duplicado.`);
        return;
      }

      const nuevaCria = {
        ingreso: fechaEvento,
        idtambo: tamboSel.id,
        rp: rpCria,
        erp: "",
        lactancia: 0,
        observaciones: "",
        estpro: "cria",
        estrep: "vacia",
        fparto: "",
        fservicio: "",
        categoria: "categoriaCria",
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

      try {
        const res = await firebase.db.collection("animal").add(nuevaCria);
        console.log(`✅ Cría con RP ${rpCria} registrada con ID: ${res.id}`);
        crias.push({ rp: rpCria, sexo: getValor(evento, "SEXO CRIA") });
      } catch (e) {
        console.error(`❌ Error registrando cría con RP ${rpCria}:`, e.message);
      }
    };

    // Registrar primera cría
    const rpCria1 = limpiarTexto(getValor(evento, "RP CRIA"));
    await registrarCria(rpCria1);

    // Registrar segunda cría si es parto múltiple
    const tipoParto = getValor(evento, "TIPO DE PARTO");
    console.log("🍼 Tipo de parto:", tipoParto);

    if (tipoParto === "Mellizos") {
      const rpCria2 = limpiarTexto(getValor(evento, "INSCRIBIR CRIA**"));
      await registrarCria(rpCria2);
    }

    // Registrar evento de parto
    const refEventos = madreRef.collection("eventos");
    const eventoObj = {
      crias,
      rp: rpMadre,
      tipo: "Parto",
      fecha: fechaEvento,
      tambo: tamboSel.id,
      detalle: `${getValor(evento, "OBSERV")} - ${tipoParto}`,
      usuario: `${usuario.displayName} - Dirsa`,
    };

    await refEventos.add(eventoObj);
    console.log(`✅ Parto registrado correctamente para RP ${rpMadre}`);
  } catch (error) {
    console.error(`❌ Error general registrando parto para RP ${rpMadre}:`, error.message);
  }
};

export default procesarParto;
