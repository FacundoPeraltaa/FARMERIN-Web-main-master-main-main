import registrarParto from "./registrarParto";

export async function procesarEventosTambo(data, tamboSel, setErrores, setActualizados, setExito, firebase, usuario, categoria) {
    console.log("📌 Iniciando procesamiento de eventos...");
    console.log("👤 Usuario actual:", usuario);

    if (!usuario || !usuario.displayName) {
        console.error("❌ ERROR: El usuario es undefined o no tiene displayName.");
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

    for (const item of data) {
        // ✅ El RP ya viene limpio desde el frontend
        const rp = item["RP"];
        const codigoEventoRaw = item["CODIGO DE EVENTO (*)"];
        const codigoEvento = codigoEventoRaw ? limpiarTexto(codigoEventoRaw).toUpperCase() : null;
        const fechaEventoStr = item["FECHA DE EVENTO (xx/xx/xxxx)"] ? limpiarTexto(item["FECHA DE EVENTO (xx/xx/xxxx)"]) : null;
        const observacion = item["OBSERVACION"] ? limpiarTexto(item["OBSERVACION"]) : "";

        if (!rp || !fechaEventoStr) {
            console.warn(`⚠️ Evento inválido por falta de RP o fecha. RP: '${rp}', Fecha: '${fechaEventoStr}'`);
            setErrores(prev => [...prev, `Datos inválidos en RP: ${rp}`]);
            continue;
        }
        
        if (!codigoEvento || codigoEvento.trim() === "") {
            console.warn(`⚠️ Evento omitido: RP '${rp}' no tiene código de evento. No se procesará.`);
            continue;
        }
        

        let fechaEventoCadena = "";
        let fechaEventoTimeStamp = null;

        try {
            let fecha = new Date(fechaEventoStr);
            if (isNaN(fecha.getTime())) {
                const [dia, mes, anio] = fechaEventoStr.split("/").map(num => parseInt(num, 10));
                fecha = new Date(anio, mes - 1, dia);
            }

            fechaEventoCadena = fecha.toISOString().split("T")[0];
            fechaEventoTimeStamp = firebase.fechaTimeStamp(fecha);
        } catch (error) {
            setErrores(prev => [...prev, `Error en fecha de RP ${rp}: ${fechaEventoStr}, ${error}`]);
            continue;
        }

        try {
            const snapshot = await firebase.db.collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('rp', '==', rp)
                .get();

            if (!snapshot.empty) {
                for (const doc of snapshot.docs) {
                    let updateData = {};
                    let eventoTipo = codigoEvento;
                    let eventoDetalle = `Evento registrado el ${fechaEventoCadena}`;
                    const data = doc.data();

                    console.log(`🔄 Procesando RP: '${rp}' con Evento: '${codigoEvento}' en fecha: '${fechaEventoCadena}'`);
                    console.log("📄 Documento ID:", doc.id);
                    console.log("📦 Datos actuales del animal:", data);

                    const codNum = parseInt(codigoEvento, 10);

                    switch (codigoEvento) {
                        case "995":
                            eventoTipo = "Tratamiento";
                            eventoDetalle = observacion || "Sin observación";
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "999":
                            eventoTipo = "Comentario";
                            eventoDetalle = observacion;
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "TE":
                            eventoTipo = "Receptora";
                            eventoDetalle = "Evento de transferencia embrionaria";
                            updateData = { ultimaModificacion: fechaEventoCadena };
                            break;
                        case "P1":
                            updateData.estrep = "preñada";
                            eventoTipo = "Tacto";
                            eventoDetalle = "Se confirmó preñez desde planilla Dirsa";
                            break;
                        case "CE":
                            updateData.celo = true;
                            eventoTipo = "Celo";
                            eventoDetalle = "Registro de celo mediante Dirsa";
                            break;
                        case "13":
                            if (data.estrep !== "vacia") {
                                updateData.estrep = "vacia";
                            }
                            eventoTipo = "Vacia";
                            eventoDetalle = "Pase a vacía mediante Dirsa";
                            break;
                        case "7":
                            updateData.estrep = "vacia";
                            eventoTipo = "Anula Preñez";
                            eventoDetalle = "Se anuló preñez mediante planilla Dirsa";
                            break;
                        case "10":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Venta" };
                            eventoTipo = "Baja";
                            eventoDetalle = "Dado de baja (Venta) mediante planilla Dirsa";
                            break;
                        case "11":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Transferencia" };
                            eventoTipo = "Baja";
                            eventoDetalle = `${categoria} dado de baja (Transferencia) mediante planilla Dirsa`;
                            break;
                        case "12":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Muerte" };
                            eventoTipo = "Baja";
                            eventoDetalle = `${categoria} dado de baja (Muerte) mediante planilla Dirsa`;
                            break;
                        case "3":
                            updateData.estrep = "seca";
                            eventoTipo = "Secado";
                            eventoDetalle = "Se sacó animal mediante planilla Dirsa";
                            break;
                        case "SE":
                            const isPregnant = data.estrep === "preñada";
                            const estadoRepro = isPregnant ? "preñada" : "vacia";
                            const nserviciosActualizado = (data.nservicio || 0) + 1;

                            updateData = {
                                nservicio: nserviciosActualizado,
                                celo: false,
                                estrep: estadoRepro,
                                fservicio: fechaEventoStr.replace(/\//g, "-")
                            };

                            const hbaToro = item["HBA TORO"] ? item["HBA TORO"].trim() : "Desconocido";
                            const razaToro = item["RAZA TORO"] ? item["RAZA TORO"].trim() : "Desconocido";
                            const servicio = item["SERVICIO*****"] ? item["SERVICIO*****"].trim() : "Desconocido";

                            eventoTipo = "Servicio";
                            eventoDetalle = `${hbaToro} / ${razaToro} / ${servicio} - Realizado con planilla Dirsa`;
                            break;
                        case "6":
                            const nuevaLactancia = (data.lactancia || 0) + 1;
                            const nuevaCategoria = nuevaLactancia <= 1 ? "Vaca" : "Vaquillona";

                            updateData = {
                                lactancia: nuevaLactancia,
                                estpro: "En Ordeñe",
                                estrep: "vacia",
                                fparto: fechaEventoCadena,
                                fservicio: "",
                                categoria: nuevaCategoria,
                                nservicio: 0
                            };
                            eventoTipo = "Aborto Inicio Lactancia";
                            eventoDetalle = "Registro de aborto e inicio de lactancia mediante Dirsa";
                            break;
                        case "AB":
                            updateData = {
                                fparto: fechaEventoCadena,
                                fservicio: "",
                                estrep: "vacia",
                                nservicio: 0
                            };
                            eventoTipo = "Aborto";
                            eventoDetalle = "Registro de aborto mediante Dirsa";
                            break;
                        default:
                            if (!isNaN(codNum) && codNum >= 41 && codNum <= 48) {
                                eventoTipo = "Rechazo";
                                eventoDetalle = "Se realizó Rechazo mediante planilla Dirsa";
                                updateData = { ultimaModificacion: fechaEventoCadena };
                                console.log(`🔁 Rechazo detectado: Código ${codigoEvento}, RP: ${rp}`);
                            } else {
                                console.warn(`⚠️ Código de evento desconocido: ${codigoEvento} para RP: ${rp}`);
                                setErrores(prev => [...prev, `⚠️ Código de evento desconocido: ${codigoEvento} para RP: ${rp}`]);
                                continue;
                            }
                            break;
                    }

                    console.log("📦 updateData para RP", rp, updateData);

                    if (Object.keys(updateData).length > 0) {
                        try {
                            await firebase.db.collection("animal").doc(doc.id).update(updateData);
                            console.log(`✅ RP ${rp} actualizado en Firebase.`);
                            setActualizados(prev => [...prev, `RP ${rp} actualizado.`]);
                        } catch (error) {
                            console.error(`❌ Error al actualizar RP ${rp}:`, error);
                            setErrores(prev => [...prev, `Error al actualizar RP ${rp}: ${error.message}`]);
                        }
                    } else {
                        setErrores(prev => [...prev, `❗ No se aplicaron cambios para RP ${rp} (evento: ${codigoEvento})`]);
                    }

                    // Registrar evento en subcolección
                    try {
                        const nombreUsuario = usuario?.displayName || "Anónimo";
                        const eventoRef = firebase.db
                            .collection("animal")
                            .doc(doc.id)
                            .collection("eventos")
                            .doc();

                        await eventoRef.set({
                            fecha: fechaEventoTimeStamp,
                            tipo: eventoTipo,
                            detalle: eventoDetalle,
                            usuario: `${nombreUsuario} - Dirsa`
                        });

                        console.log(`📥 Evento registrado para RP: ${rp}`);
                    } catch (error) {
                        console.error(`❌ Error al agregar evento en subcolección para RP ${rp}:`, error);
                        setErrores(prev => [...prev, `Error al agregar evento en subcolección para RP ${rp}: ${error.message}`]);
                    }
                }
            } else {
                setErrores(prev => [...prev, `❌ No se encontró RP '${rp}' en la base de datos.`]);
            }
        } catch (error) {
            console.error(`🛑 Error al procesar RP '${rp}':`, error);
            setErrores(prev => [...prev, `Error en RP ${rp}: ${error.message}`]);
        }
    }

    console.log("✅ Finalizado el procesamiento de eventos.");
}
