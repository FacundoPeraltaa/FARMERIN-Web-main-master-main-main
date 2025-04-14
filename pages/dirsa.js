import React, { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { Button, Row, Col, Image, Spinner } from 'react-bootstrap';
import { procesarEventosTambo } from '../components/layout/procesarEventosTambos';
import { FirebaseContext } from '../firebase2';
import ResultadosCargas from '../components/layout/ResultadosCargas';
import procesarParto from '../components/layout/registrarParto';
import { subirControlLechero } from '../components/layout/cargarControlLechero'; // ⚠️ Ajustá la ruta si está en otro lado

const Dirsa = () => {
    const { firebase, usuario, tamboSel } = useContext(FirebaseContext);
    const [archivoEvento, setArchivoEvento] = useState(null);
    const [archivoLechero, setArchivoLechero] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [datosPreview, setDatosPreview] = useState([]);
    const [actualizados, setActualizados] = useState([]);
    const [errores, setErrores] = useState([]);
    const inputFileRefEvento = useRef(null);
    const inputFileRefLechero = useRef(null);

    const limpiarRP = (rp) => rp?.toString().trim().toUpperCase() || "";

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

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setArchivoEvento(file);
            setDatosPreview([]);
        }
    };

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

                const encabezados = jsonData[0].map(h => h.toString().trim());
                const encabezadosMayus = encabezados.map(h => h.toUpperCase());
                const indiceRP = encabezadosMayus.indexOf("RP");
                const indiceCodigoEvento = encabezadosMayus.indexOf("CODIGO DE EVENTO (*)");

                if (indiceRP === -1 || indiceCodigoEvento === -1) {
                    setErrores(["Error: La estructura del archivo es incorrecta. Verifica los encabezados."]);
                    setIsLoading(false);
                    return;
                }

                jsonData = jsonData.slice(1).map((row) => {
                    const obj = {};
                    encabezados.forEach((encabezado, i) => {
                        let valor = row[i];
                        if (encabezado.toUpperCase().includes("FECHA")) {
                            valor = convertirFecha(valor);
                        }
                        obj[encabezado] = typeof valor === "string" ? valor.trim() : valor;
                    });

                    if (obj["RP"]) {
                        obj["RP"] = limpiarRP(obj["RP"]);
                    }

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

                const eventosParto = jsonData.filter(evento => evento["CODIGO DE EVENTO (*)"] === "PA");
                for (const evento of eventosParto) {
                    const rpLimpio = limpiarRP(evento.RP);
                    evento.RP = rpLimpio;
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
                setErrores(["Error al procesar el archivo."]);
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(archivoEvento);
    };

    const handleUploadLechero = async () => {
        if (!archivoLechero) return;
        setIsLoading(true);
        setErrores([]);
        setActualizados([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                if (jsonData.length === 0) {
                    setErrores(["El archivo de control lechero está vacío o no tiene datos."]);
                    return;
                }

                await subirControlLechero(jsonData, tamboSel, setErrores, setActualizados, () => {}, firebase, usuario);
            } catch (error) {
                console.error("❌ Error al procesar el archivo de control lechero:", error);
                setErrores(["Error procesando el archivo de control lechero."]);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(archivoLechero);
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
                    ref={inputFileRefLechero}
                    style={{ display: 'none' }}
                    onChange={(e) => setArchivoLechero(e.target.files[0])}
                />
                <Button onClick={() => inputFileRefLechero.current?.click()} variant="info" className="mx-2">
                    Cargar Control Lechero
                </Button>
                <Button onClick={handleUploadLechero} variant="warning" className="mx-2" disabled={!archivoLechero || isLoading}>
                    {isLoading ? <Spinner animation="border" size="sm" /> : "Actualizar Control Lechero"}
                </Button>
            </Row>

            <ResultadosCargas titulo="Resultados de la Carga" actualizados={actualizados} errores={errores} />
        </Layout>
    );
};

export default Dirsa;
