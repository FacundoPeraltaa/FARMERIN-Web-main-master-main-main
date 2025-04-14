const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

// Función segura para obtener un campo de un evento
const getValor = (obj, clave) => {
  const claves = Object.keys(obj);
  const claveEncontrada = claves.find(k => k.trim().toLowerCase() === clave.trim().toLowerCase());
  if (!claveEncontrada) {
    console.warn(`⚠️ Campo "${clave}" no encontrado en evento:`, obj);
  }
  return claveEncontrada ? obj[claveEncontrada] : null;
};

const procesarParto = async (evento, tamboSel, firebase, usuario) => {
  const rpMadre = limpiarTexto(getValor(evento, "RP")).replace(/\s/g, "");
  const fechaEvento = getValor(evento, "FECHA DE EVENTO (xx/xx/xxxx)") || new Date().toISOString().split("T")[0];
  const crias = [];

  try {
    const madreQuery = await firebase.db.collection("animal")
      .where("idtambo", "==", tamboSel.id)
      .where("rp", "==", rpMadre)
      .get();

    if (madreQuery.empty) throw new Error(`Animal con RP ${rpMadre} no encontrado.`);

    const madreDoc = madreQuery.docs[0];
    const madreRef = firebase.db.collection("animal").doc(madreDoc.id);
    const madreData = madreDoc.data();

    await madreRef.update({
      estrep: "vacia",
      fparto: fechaEvento,
      nservicios: 0,
      lactancia: (madreData.lactancia || 0) + 1,
      fservicio: ""
    });

    const registrarCria = async (rpCria, sexo, registrarEnAnimal = true) => {
      if (!rpCria) {
        console.warn("⚠️ RP de cría vacío. No se registrará.");
        return;
      }

      const yaExiste = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .where('rp', '==', rpCria)
        .where('fbaja', '==', '')
        .get();

      if (!yaExiste.empty) {
        console.warn(`⚠️ RP ${rpCria} ya existe. No se registrará duplicado.`);
        return;
      }

      const datosCria = {
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

      if (registrarEnAnimal) {
        const res = await firebase.db.collection("animal").add(datosCria);
        console.log(`✅ Cría registrada en 'animal': ${rpCria} (ID: ${res.id})`);
      }

      if (sexo && sexo.toLowerCase() === "macho") {
        const resMacho = await firebase.db.collection("macho").add({
          ...datosCria,
          categoria: "Ternero"
        });
        console.log(`✅ Cría macho registrada en 'macho': ${rpCria} (ID: ${resMacho.id})`);
      }

      crias.push({ rp: rpCria, sexo });
    };

    // Primera cría
    const rpCria1 = limpiarTexto(getValor(evento, "RP CRIA"));
    const sexoCria1 = getValor(evento, "SEXO CRIA");
    await registrarCria(rpCria1, sexoCria1);

    // Segunda cría (solo si es parto múltiple)
    const tipoParto = getValor(evento, "TIPO DE PARTO");
    if (tipoParto === "Mellizos") {
      const rpCria2 = limpiarTexto(getValor(evento, "INSCRIBIR CRIA**"));
      const valorInscribir = rpCria2.toLowerCase();

      if (valorInscribir === "no") {
        // No se inscribe pero se registra como macho
        const rpMacho = `${rpMadre}-M`; // O lo que venga en la columna
        await registrarCria(rpMacho, "Macho", false); // Solo en 'macho'
      } else {
        const rpCria2Real = rpCria2;
        await registrarCria(rpCria2Real, "Hembra"); // o detectar con otro campo si querés
      }
    }

    // Guardar evento
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
    console.log(`✅ Parto registrado para RP ${rpMadre}`);
  } catch (error) {
    console.error(`❌ Error registrando parto para RP ${rpMadre}:`, error.message);
  }
};

export default procesarParto;
