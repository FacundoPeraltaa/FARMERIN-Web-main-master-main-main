import registrarParto  from "./registrarParto";


export async function procesarEventosTambo(data, tamboSel, setErrores, setActualizados, setExito, firebase, usuario, categoria) {
    console.log("📌 Iniciando procesamiento de eventos...");
    console.log("👤 Usuario actual:", usuario);

    if (!usuario || !usuario.displayName) {
        console.error("❌ ERROR: El usuario es undefined o no tiene displayName.");
        setErrores(prev => [...prev, "Error: Usuario no autenticado"]);
        return;
    }

    const limpiarRP = (rp) => {
        if (!rp || typeof rp !== 'string') return "";
        return rp.replace(/\s+/g, "").trim().toUpperCase();
    };

    const limpiarTexto = (valor) => (valor && typeof valor === 'string') ? valor.trim() : "";

    for (const item of data) {
        const rp = limpiarRP(item[Object.keys(item)[0]]);
        const codigoEvento = item["CODIGO DE EVENTO (*)"] ? limpiarTexto(item["CODIGO DE EVENTO (*)"]) : null;
        const fechaEventoStr = item["FECHA DE EVENTO (xx/xx/xxxx)"] ? limpiarTexto(item["FECHA DE EVENTO (xx/xx/xxxx)"]) : null;
        const observacion = item["OBSERVACION"] ? limpiarTexto(item["OBSERVACION"]) : ""; // Nueva variable

        if (!rp || !fechaEventoStr || !codigoEvento) {
            console.warn(`⚠️ RP inválido: '${rp}', Código Evento: '${codigoEvento}', Fecha: '${fechaEventoStr}'`);
            setErrores(prev => [...prev, `Datos inválidos en RP: ${rp}`]);
            continue;
        }

        let fechaEventoCadena = "";
        let fechaEventoTimeStamp = null;

        try {
            let fecha = new Date(fechaEventoStr);

            if (isNaN(fecha.getTime())) {
                const [dia, mes, año] = fechaEventoStr.split("/").map(num => parseInt(num, 10));
                fecha = new Date(año, mes - 1, dia);
            }

            fechaEventoCadena = fecha.toISOString().split("T")[0]; // YYYY-MM-DD
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
                for (const doc of snapshot.docs) { // Usar for...of en lugar de forEach
                    let updateData = {};
                    let eventoTipo = codigoEvento;
                    let eventoDetalle = `Evento registrado el ${fechaEventoCadena}`;
                    const data = doc.data();

                    console.log(`🔄 Procesando RP: '${rp}' con Evento: '${codigoEvento}' en fecha: '${fechaEventoCadena}'`);

                    switch (codigoEvento) {
                        /// FUNCION PARA CUANDO ES MASTITIS ( 995 - TRATAMIENTO )
                        case "995":
                            eventoTipo = "Tratamiento";
                            eventoDetalle = observacion;
                            break;
                        /// FUNCION PARA CUANDO ES COMENTARIO ( 999 )
                        case "999":
                            eventoTipo = "Comentario";
                            eventoDetalle = observacion;
                            break;
                        /// FUNCION PARA CUANDO ES RECEPTORA ( TE )
                        case "TE":
                            eventoTipo = "Receptora";
                            eventoDetalle = "Evento de transferencia embrionaria";
                            break;
                        /// FUNCION PARA CUANDO ES TACTO ( P1 )
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
                        /// FUNCION PARA CUANDO ES VACIA ( 13 )
                        case "13":
                            if (data.estrep !== "vacia") {
                                updateData.estrep = "vacia";
                            }
                            eventoTipo = "Vacia";
                            eventoDetalle = "Pase a vacía mediante Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES ANULA PREÑEZ ( 7 )
                        case "7":
                            updateData.estrep = "vacia";
                            eventoTipo = "Anula Preñez";
                            eventoDetalle = "Se anuló preñez mediante planilla Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES BAJA POR VENTA ( 10 )
                        case "10":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Venta" };
                            eventoTipo = "Baja";
                            eventoDetalle = "Dado de baja (Venta) mediante planilla Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES TRANSFERENCIA ( 11 )
                        case "11":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Transferencia" };
                            eventoTipo = "Baja";
                            eventoDetalle = `${categoria} dado de baja (Transferencia) mediante planilla Dirsa`;
                            break;
                        /// FUNCION PARA CUANDO ES MUERTE ( 12 )
                        case "12":
                            updateData = { fbaja: fechaEventoCadena, mbaja: "Muerte" };
                            eventoTipo = "Baja";
                            eventoDetalle = `${categoria} dado de baja (Muerte) mediante planilla Dirsa`;
                            break;
                        /// FUNCION PARA CUANDO ES SECADO ( 3 )
                        case "3":
                            updateData.estrep = "seca";
                            eventoTipo = "Secado";
                            eventoDetalle = "Se sacó animal mediante planilla Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES SERVICIO ( SE )
                        case "SE":
                            const isPregnant = data.estrep === "preñada";
                            const estadoRepro = isPregnant ? "preñada" : "vacia";
                            const nserviciosActualizado = (data.nservicios || 0) + 1;

                            updateData = {
                                nservicios: nserviciosActualizado,
                                celo: false,
                                estrep: estadoRepro,
                                fservicio: fechaEventoStr.replace(/\//g, "-")
                            };

                            const hbaToro = item["HBA TORO"] ? item["HBA TORO"].trim() : "Desconocido";
                            const razaToro = item["RAZA TORO"] ? item["RAZA TORO"].trim() : "Desconocido";
                            const servicio = item["SERVICIO*****"] ? item["SERVICIO*****"].trim() : "Desconocido";

                            eventoTipo = "Servicio";
                            eventoDetalle = `${hbaToro} / ${razaToro} / ${servicio} - Realizo con planilla Dirsa`;
                            break;
                        /// FUNCION PARA CUANDO ES ABORTO INICIO LACTANCIA ( 6 )
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
                                nservicios: 0
                            };
                            eventoTipo = "Aborto Inicio Lactancia";
                            eventoDetalle = "Registro de aborto e inicio de lactancia mediante Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES ABORTO ( AB )
                        case "AB":
                            updateData = {
                                fparto: fechaEventoCadena,
                                fservicio: "",
                                estrep: "vacia",
                                nservicios: 0
                            };
                            eventoTipo = "Aborto";
                            eventoDetalle = "Registro de aborto mediante Dirsa";
                            break;
                        /// FUNCION PARA CUANDO ES RECHAZO ( DE 41 A 48 )
                        default:
                            if (parseInt(codigoEvento) >= 41 && parseInt(codigoEvento) <= 48) {
                                eventoTipo = "Rechazo";
                                eventoDetalle = "Se realizó Rechazo mediante planilla Dirsa";
                            }
                            break;
                      
                    }

                    console.log(`🔄 Actualizando RP '${rp}' con:`, updateData);
                    // Solo actualizar si hay datos en updateData
                    if (Object.keys(updateData).length > 0) {
                        await firebase.db.collection("animal").doc(doc.id).update(updateData)
                            .then(() => {
                                console.log(`✅ RP ${rp} actualizado en Firebase.`);
                                setActualizados(prev => [...prev, `RP ${rp} actualizado.`]); // Confirmación de actualización
                            })
                            .catch(error => {
                                console.error(`❌ Error al actualizar RP ${rp}:`, error);
                                setErrores(prev => [...prev, `Error al actualizar RP ${rp}: ${error.message}`]);
                            });
                    }

                    // Agregar el evento
                    await firebase.db.collection("animal").doc(doc.id).collection("eventos").add({
                        fecha: fechaEventoTimeStamp,
                        tipo: eventoTipo,
                        detalle: eventoDetalle,
                        usuario: `${usuario.displayName} - Dirsa`
                    });
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
