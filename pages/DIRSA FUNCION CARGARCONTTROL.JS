import React, { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { Button, Row, Col, Image, Spinner } from 'react-bootstrap';
import { procesarEventosTambo } from '../components/layout/procesarEventosTambos';
import { FirebaseContext } from '../firebase2';
import ResultadosCargas from '../components/layout/ResultadosCargas';
import procesarParto from '../components/layout/registrarParto';
import { subirControlLechero } from '../components/layout/cargarControlLechero'; // Ajustá este path según corresponda

const Dirsa = () => {
    const { firebase, usuario, tamboSel } = useContext(FirebaseContext);
    const [archivoEvento, setArchivoEvento] = useState(null);
    const [archivoControl, setArchivoControl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [datosPreview, setDatosPreview] = useState([]);
    const [actualizados, setActualizados] = useState([]);
    const [errores, setErrores] = useState([]);
    const inputFileRefEvento = useRef(null);
    const inputFileRefControl = useRef(null);

    // LOGICA CARGA EVENTO 
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log(`📂 Archivo seleccionado:`, file);
            setArchivoEvento(file);
            setDatosPreview([]);
        }
    };
    // LOGICA CARGA CONTROL LECHERO 
    const handleFileChangeControl = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log("📂 Archivo de Control Lechero seleccionado:", file);
            setArchivoControl(file);
        }
    };

    /// LIMPIA RP Y CONVIERTE FECHA 
    const limpiarRP = (rp) => {
        if (!rp) return "";
        return rp.toString().replace(/\s+/g, "").trim().toUpperCase();
    };

    const convertirFecha = (valor) => {
        if (!valor) return null;
        if (typeof valor === "number") {
            const fechaBase = new Date(1899, 11, 30);
            return new Date(fechaBase.getTime() + valor * 86400000).toISOString().split("T")[0];
        }
        if (typeof valor === "string") {
            const partes = valor.split("/");
            if (partes.length === 3) {
                const [dia, mes, año] = partes.map(n => parseInt(n, 10));
                return new Date(año, mes - 1, dia).toISOString().split("T")[0];
            }
        }
        return null;
    };

    // LOGICA PARA ACTUALIZAR EVENTOS ( procesarEventosTambos.js y registrarParto.js )
    const handleUpload = async () => {
        if (!archivoEvento) return;
        setIsLoading(true);
        setActualizados([]);
        setErrores([]);
    
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                let jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
                if (jsonData.length === 0) {
                    setErrores(["El archivo está vacío o no tiene datos."]);
                    setIsLoading(false);
                    return;
                }
    
                // 🔍 LIMPIEZA Y DETECCIÓN DINÁMICA DE ENCABEZADOS
                const limpiarTexto = (texto) => texto?.toString().trim().toUpperCase() || "";
                const encabezadosOriginales = jsonData[0];
                const encabezadosMapeados = encabezadosOriginales.map(limpiarTexto);
    
                const clavesEsperadas = {
                    rp: ["RP"],
                    codigoEvento: ["CODIGO DE EVENTO (*)", "CODIGO EVENTO", "CÓDIGO EVENTO"],
                    fechaEvento: ["FECHA DE EVENTO (XX/XX/XXXX)", "FECHA EVENTO"]
                };
    
                const encontrarIndice = (claves) =>
                    encabezadosMapeados.findIndex(encabezado =>
                        claves.some(clave => encabezado.includes(clave))
                    );
    
                const indiceRP = encontrarIndice(clavesEsperadas.rp);
                const indiceCodigoEvento = encontrarIndice(clavesEsperadas.codigoEvento);
                const indiceFechaEvento = encontrarIndice(clavesEsperadas.fechaEvento);
    
                if (indiceRP === -1 || indiceCodigoEvento === -1 || indiceFechaEvento === -1) {
                    setErrores(["Error: La estructura del archivo es incorrecta. Verifica los encabezados de RP, Código de Evento y Fecha de Evento."]);
                    setIsLoading(false);
                    return;
                }
    
                // 🔄 MAPEAR CADA FILA A OBJETOS
                jsonData = jsonData.slice(1).map((row) => {
                    const obj = {};
    
                    encabezadosOriginales.forEach((encabezado, i) => {
                        let valor = row[i];
                        if (limpiarTexto(encabezado).includes("FECHA")) {
                            valor = convertirFecha(valor);
                        }
                        obj[encabezado] = typeof valor === "string" ? valor.trim() : valor;
                    });
    
                    // Limpiar RP
                    if (obj[encabezadosOriginales[indiceRP]]) {
                        obj["RP"] = obj[encabezadosOriginales[indiceRP]].toString().replace(/\s+/g, "").toUpperCase();
                    }
    
                    // Normalizar acceso a campos clave
                    obj["CODIGO DE EVENTO (*)"] = obj[encabezadosOriginales[indiceCodigoEvento]];
                    obj["FECHA DE EVENTO (xx/xx/xxxx)"] = obj[encabezadosOriginales[indiceFechaEvento]];
    
                    return obj;
                }).filter(item =>
                    item.RP &&
                    item["CODIGO DE EVENTO (*)"] &&
                    item["CODIGO DE EVENTO (*)"].toString().trim() !== ""
                );
    
                if (jsonData.length === 0) {
                    setErrores(["No hay datos válidos en la planilla."]);
                    setIsLoading(false);
                    return;
                }
    
                setDatosPreview(jsonData.slice(0, 5));
    
                if (!tamboSel || !tamboSel.id) {
                    setErrores(["Debes seleccionar un tambo antes de cargar los datos."]);
                    setIsLoading(false);
                    return;
                }
    
                console.log("📊 Total eventos cargados:", jsonData.length);
                const eventosParto = jsonData.filter(evento => evento["CODIGO DE EVENTO (*)"] === "PA");
                console.log("🐄 Eventos de parto detectados:", eventosParto.length);
    
                for (const evento of eventosParto) {
                    const rpLimpio = evento.RP;
                    try {
                        await procesarParto(evento, tamboSel, firebase, usuario);
                        setActualizados(prev => [...prev, `✅ Parto registrado para RP ${rpLimpio}`]);
                    } catch (error) {
                        setErrores(prev => [...prev, `❌ Error registrando parto para RP ${rpLimpio}: ${error.message}`]);
                    }
                }
    
                const otrosEventos = jsonData.filter(e => e["CODIGO DE EVENTO (*)"] !== "PA");
                for (const evento of otrosEventos) {
                    try {
                        await procesarEventosTambo([evento], tamboSel, setErrores, setActualizados, () => {}, firebase, usuario);
                        setActualizados(prev => [...prev, `✅ RP ${evento.RP} actualizado`]);
                    } catch (error) {
                        setErrores(prev => [...prev, `❌ Error en RP ${evento.RP}: ${error.message}`]);
                    }
                }
    
            } catch (error) {
                console.error("❌ Error al procesar el archivo:", error);
                setErrores(["Error al procesar el archivo."]);
            } finally {
                setIsLoading(false);
            }
        };
    
        reader.readAsArrayBuffer(archivoEvento);
    };
    
    //// LOGICA DE ACTUALIZACION DE CONTROL LECHERO ( cargarControlLechero.js )
    const handleUploadControlLechero = async () => {
        if (!archivoControl) return;
        setIsLoading(true);
        setActualizados([]);
        setErrores([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const fullData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (fullData.length < 3) {
                    setErrores(["El archivo no tiene suficientes filas de datos."]);
                    setIsLoading(false);
                    return;
                }

                // ✅ Usamos la tercera fila como encabezado (índice 2), ignoramos las dos primeras
                const encabezados = fullData[2].map(h => h.toString().trim());
                const datos = fullData.slice(3).map(row => {
                    const obj = {};
                    encabezados.forEach((encabezado, idx) => {
                        obj[encabezado] = row[idx];
                    });
                    return obj;
                });

                // ✅ Limpiar RP
                const datosLimpios = datos.map((item) => {
                    const nuevo = { ...item };
                    if (nuevo["RP"]) {
                        nuevo["RP"] = nuevo["RP"].toString().trim().replace(/\s+/g, "").toUpperCase();
                    }
                    return nuevo;
                }).filter(item => item["RP"]);

                if (datosLimpios.length === 0) {
                    setErrores(["No hay datos válidos en el archivo de control lechero."]);
                    setIsLoading(false);
                    return;
                }

                if (!tamboSel || !tamboSel.id) {
                    setErrores(["Debes seleccionar un tambo antes de actualizar el control lechero."]);
                    setIsLoading(false);
                    return;
                }

                await subirControlLechero(datosLimpios, tamboSel, setErrores, setActualizados, () => { }, firebase, usuario);
            } catch (error) {
                console.error("Error leyendo el archivo de control lechero:", error);
                setErrores(["Error procesando el archivo de control lechero."]);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(archivoControl);

    };

    return (
        <Layout titulo="Dirsa">
            <Col md={4} className="d-flex align-items-center justify-content-center">
                <Image src="/dirsa.png" width={300} />
            </Col>

            <Row className="mt-4 d-flex justify-content-center">
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={inputFileRefEvento}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
                <Button onClick={() => inputFileRefEvento.current?.click()} variant="primary" className="mx-2">
                    Cargar Eventos
                </Button>
                <Button onClick={handleUpload} variant="success" className="mx-2" disabled={!archivoEvento || isLoading}>
                    {isLoading ? <Spinner animation="border" size="sm" /> : "Actualizar Eventos"}
                </Button>
            </Row>

            <Row className="mt-3 d-flex justify-content-center">
                <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    ref={inputFileRefControl}
                    style={{ display: 'none' }}
                    onChange={handleFileChangeControl}
                />
                <Button onClick={() => inputFileRefControl.current?.click()} variant="secondary" className="mx-2">
                    Cargar Control Lechero
                </Button>
                <Button onClick={handleUploadControlLechero} variant="warning" className="mx-2" disabled={!archivoControl || isLoading}>
                    {isLoading ? <Spinner animation="border" size="sm" /> : "Actualizar Control Lechero"}
                </Button>
            </Row>

            <ResultadosCargas titulo="Resultados de la Carga" actualizados={actualizados} errores={errores} />
        </Layout>
    );
};

export default Dirsa;
