const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

const procesarParto = async (evento, tamboSel, firebase, usuario) => {
  const rpMadre = limpiarTexto(evento.RP).replace(/\s/g, "");
  const fechaEvento = evento["FECHA DE EVENTO (xx/xx/xxxx)"] || new Date().toISOString().split("T")[0];
  const crias = [];

  try {
    // Buscar animal madre
    const madreQuery = await firebase.db.collection("animal")
      .where("idtambo", "==", tamboSel.id)
      .where("rp", "==", rpMadre)
      .get();

    if (madreQuery.empty) throw new Error(`Animal con RP ${rpMadre} no encontrado.`);

    const madreDoc = madreQuery.docs[0];
    const madreRef = firebase.db.collection("animal").doc(madreDoc.id);
    const madreData = madreDoc.data();

    // Registrar evento de parto
    await madreRef.collection("eventos").add({
      rp: rpMadre,
      tipo: "Parto",
      fecha: fechaEvento,
      creado: Date.now(),
      usuario: usuario.displayName || usuario.email,
      tambo: tamboSel.id,
    });

    // Actualizar estado del animal madre
    await madreRef.update({
      estrep: "vacia",
      fparto: fechaEvento,
      nservicios: 0,
      lactancia: (madreData.lactancia || 0) + 1,
      fservicio: ""
    });

    // Función para registrar cría usando .add()
    const registrarCria = async (rpCria) => {
      if (!rpCria) return;

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
        racion: 0,
        fracion: "",
        nservicio: 0,
        uc: 0,
        fuc: "",
        ca: 0,
        anorm: "",
        fbaja: "",
        mbaja: "",
        rodeo: 0,
        sugerido: 0
      };

      await firebase.db.collection("animal").add(nuevaCria); // ← Usa add en lugar de set

      console.log(`✅ Cría con RP ${rpCria} registrada.`);
      crias.push({ rp: rpCria, sexo: evento["SEXO CRIA"] });
    };

    // Registrar primera cría
    const rpCria1 = limpiarTexto(evento["RP CRIA"]);
    await registrarCria(rpCria1);

    // Registrar segunda cría si corresponde
    if (evento["TIPO DE PARTO"] === "Mellizos") {
      const rpCria2 = limpiarTexto(evento["INSCRIBIR CRIA**"]);
      await registrarCria(rpCria2);
    }

    // Registrar evento en subcolección de eventos (detalle con crías)
    const refEventos = madreRef.collection("eventos");
    const eventoObj = {
      fecha: new Date(fechaEvento).getTime(),
      tipo: "PARTO",
      detalle: `${evento.OBSERV} - ${evento["TIPO DE PARTO"]}`,
      usuario: `${usuario.displayName} - Dirsa`,
      crias
    };
    await refEventos.add(eventoObj);

    console.log(`✅ Parto registrado para RP ${rpMadre}`);
  } catch (error) {
    console.error(`❌ Error registrando parto para RP ${rpMadre}:`, error.message);
  }
};

export default procesarParto;
