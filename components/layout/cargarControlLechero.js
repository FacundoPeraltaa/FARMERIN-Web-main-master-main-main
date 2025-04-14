export async function subirControlLechero(data, tamboSel, setErrores, setActualizados, setExito, firebase, usuarios) {
    console.log("📌 Iniciando carga de Control Lechero...");
    console.log("👤 Usuario actual:", usuarios);

    if (!usuarios) {
        console.error("❌ ERROR: El objeto usuario es undefined o null.");
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }
    
    if (!usuarios.displayName) {
        console.error("❌ ERROR: El usuario no tiene displayName. Datos del usuario:", usuarios);
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    // Ignorar la primera fila (nombre del mes) y usar la segunda como encabezado
    const datosLimpios = data.slice(1);

    for (const item of datosLimpios) {
        console.log(`🛠️ Datos crudos recibidos → RP: "${item["RP"]}", Le.UC: "${item["Le.UC"]}"`);

        // ✅ Elimina espacios en RP sin modificar mayúsculas/minúsculas
        const rp = item["RP"] ? item["RP"].toString().replace(/\s+/g, "").trim().normalize("NFKC") : null;

        // ✅ Obtener el valor de Le.UC, eliminando espacios y convirtiendo a minúsculas
        let litrosStr = item["Le.UC"] ? item["Le.UC"].toString().trim().toLowerCase() : ""; 
        let litros = parseFloat(litrosStr); // Conversión segura a número

        // ✅ Verificar si es un valor especial ("enferma" o "fiscalizada")
        const valoresEspeciales = ["enferma", "fiscalizada"];
        const esValorEspecial = valoresEspeciales.includes(litrosStr);

        if (isNaN(litros) && !esValorEspecial) {
            litros = null;
        }

        // ✅ Definir el detalle del evento correctamente
        let detalleEvento = "";
        if (!litrosStr) {
            detalleEvento = "No se actualizó el control, la casilla estaba vacía";
        } else if (esValorEspecial) {
            detalleEvento = litrosStr; // Guardar exactamente "enferma" o "fiscalizada"
        } else {
            detalleEvento = `${litros} lts.`; // Si es un número, se usa ese valor
        }

        console.log(`📊 Datos procesados → RP: "${rp}", Le.UC convertido: ${litros}, Detalle: "${detalleEvento}"`);

        if (!rp) {
            console.warn(`❌ Datos inválidos en RP: ${item["RP"]}`);
            setErrores(prev => [...prev, `Datos inválidos en RP: ${item["RP"]}`]);
            continue;
        }

        try {
            console.log(`🔍 Buscando en Firebase el RP: '${rp}' en el tambo ID: '${tamboSel.nombre}'`);

            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('rp', '==', rp)
                .get();

            if (!snapshot.empty) {
                console.log(`✅ RP '${rp}' encontrado en Firebase (${snapshot.size} coincidencias).`);

                snapshot.forEach(async (doc) => {
                    // ✅ Registrar el evento en la colección 'eventos'
                    await firebase.db.collection('animal').doc(doc.id).collection('eventos').add({
                        fecha: firebase.nowTimeStamp(),
                        tipo: 'Control Lechero',
                        detalle: detalleEvento,
                        usuario: `${usuarios.displayName} - Dirsa`
                    });

                    console.log(`✅ Evento registrado para RP '${rp}' con detalle: ${detalleEvento}`);
                    
                    // ✅ Solo actualizar 'uc' si el valor es un número válido, no es especial y distinto de 0
                    if (litros !== null && !esValorEspecial && litros !== 0) {
                        console.log(`🔄 Actualizando 'uc' en Firebase con: ${litros}`);
                        await firebase.db.collection('animal').doc(doc.id).update({ uc: litros });
                    } else {
                        console.log(`⚠️ No se actualizó 'uc' para RP '${rp}' porque el valor es especial, inválido o igual a 0 (Texto: '${litrosStr}')`);
                    }

                    setActualizados(prev => [...prev, `RP ${rp} - ${detalleEvento}`]);
                    setExito(true);
                });
            } else {
                console.warn(`⚠️ RP '${rp}' no encontrado en Firebase.`);
                setErrores(prev => [...prev, `RP ${rp} no encontrado en Firebase.`]);
            }
        } catch (error) {
            console.error(`🛑 Error al procesar RP '${rp}':`, error);
            setErrores(prev => [...prev, `Error en RP ${rp}: ${error.message}`]);
        }
    }

    console.log("✅ Finalizado el proceso de Control Lechero.");
}
