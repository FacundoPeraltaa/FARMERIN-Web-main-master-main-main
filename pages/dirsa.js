import React, { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { Button, Row, Col, Image, Spinner, Container, Card, Alert } from 'react-bootstrap';
import { procesarEventosTambo } from '../components/layout/procesarEventosTambos';
import { FirebaseContext } from '../firebase2';
import ResultadosCargas from '../components/layout/ResultadosCargas';
import procesarParto from '../components/layout/registrarParto';
import { subirControlLechero } from '../components/layout/cargarControlLechero';

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
            const fecha = new Date(fechaBase.getTime() + valor * 86400000);
            return isNaN(fecha.getTime()) ? null : fecha.toISOString().split("T")[0];
        }

        if (typeof valor === "string") {
            const partes = valor.split("/");
            if (partes.length === 3) {
                let [dia, mes, año] = partes.map(p => parseInt(p, 10));
                if (año < 100) año += 2000;
                const fecha = new Date(año, mes - 1, dia);
                return isNaN(fecha.getTime()) ? null : fecha.toISOString().split("T")[0];
            }
        }

        return null;
    };

    const handleFileChangeEventos = (event) => {
        const file = event.target.files[0];
        if (file) setArchivoEvento(file);
    };

    const handleFileChangeLechero = (event) => {
        const file = event.target.files[0];
        if (file) setArchivoLechero(file);
    };

    const handleUploadEventos = async () => {
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
                const indiceCodigoEvento = encabezadosMayus.findIndex(h => h === "CODIGO DE EVENTO (*)" || h === "D.EV");

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
                    if (obj["RP"]) obj["RP"] = limpiarRP(obj["RP"]);
                    return obj;
                }).filter(item =>
                    item.RP &&
                    (item["CODIGO DE EVENTO (*)"] || item["D.Ev"])
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

                const eventosParto = jsonData.filter(evento => {
                    const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                    return cod === "PA" || cod === "PARTO";
                });

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

                const otrosEventos = jsonData.filter(evento => {
                    const cod = (evento["CODIGO DE EVENTO (*)"] || evento["D.Ev"] || "").toString().toUpperCase().trim();
                    return cod !== "PA" && cod !== "PARTO";
                });

                for (const evento of otrosEventos) {
                    try {
                        await procesarEventosTambo([evento], tamboSel, setErrores, setActualizados, () => { }, firebase, usuario);
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

                const encabezados = fullData[2].map(h => h?.toString().trim()).filter(Boolean);
                const datos = fullData.slice(3).map(row => {
                    const obj = {};
                    encabezados.forEach((encabezado, idx) => {
                        obj[encabezado] = row[idx];
                    });
                    return obj;
                });

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
        reader.readAsArrayBuffer(archivoLechero);
    };

    return (
        <Layout titulo="Dirsa">
            <Container className="py-5">
                <Row className="align-items-center text-center mb-4">
                    {/* 📥 Cargar Eventos */}
                    <Col md={4} className="mb-3 mb-md-0">
                        <Card className="shadow-sm">
                            <Card.Body>
                                <Card.Title className="text-primary mb-3">📥 Cargar Eventos</Card.Title>

                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    ref={inputFileRefEvento}
                                    style={{ display: 'none' }}
                                    onChange={handleFileChangeEventos}
                                />

                                <Button variant="outline-primary" onClick={() => inputFileRefEvento.current?.click()} className="mb-2 w-100">
                                    Seleccionar archivo
                                </Button>

                                {archivoEvento && (
                                    <Alert variant="light" className="py-2 px-3 d-flex justify-content-between align-items-center">
                                        <span className="text-truncate" title={archivoEvento.name}>📄 {archivoEvento.name}</span>
                                        <Button variant="outline-danger" size="sm" onClick={() => setArchivoEvento(null)}>✖</Button>
                                    </Alert>
                                )}

                                <Button
                                    variant="success"
                                    onClick={handleUploadEventos}
                                    disabled={!archivoEvento}
                                    className="w-100"
                                >
                                    Actualizar Eventos
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* 🧀 Logo */}
                    <Col md={4} className="text-center">
                        <Image src="/dirsaNEW.png" width={350} />
                    </Col>

                    {/* 🥛 Cargar Control Lechero */}
                    <Col md={4} className="mb-3 mb-md-0">
                        <Card className="shadow-sm">
                            <Card.Body>
                                <Card.Title className="text-primary mb-3">🥛 Cargar Control Lechero</Card.Title>

                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    ref={inputFileRefLechero}
                                    style={{ display: 'none' }}
                                    onChange={handleFileChangeLechero}
                                />

                                <Button variant="outline-primary" onClick={() => inputFileRefLechero.current?.click()} className="mb-2 w-100">
                                    Seleccionar archivo
                                </Button>

                                {archivoLechero && (
                                    <Alert variant="light" className="py-2 px-3 d-flex justify-content-between align-items-center">
                                        <span className="text-truncate" title={archivoLechero.name}>📄 {archivoLechero.name}</span>
                                        <Button variant="outline-danger" size="sm" onClick={() => setArchivoLechero(null)}>✖</Button>
                                    </Alert>
                                )}

                                <Button
                                    variant="success"
                                    onClick={handleUploadLechero}
                                    disabled={!archivoLechero}
                                    className="w-100"
                                >
                                    Actualizar Control Lechero
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                <ResultadosCargas
                    titulo="📝 Resultados de la Carga"
                    actualizados={actualizados}
                    errores={errores}
                />
            </Container>
        </Layout>
    );
};

export default Dirsa;
