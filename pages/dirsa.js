import React, { useState, useRef, useContext } from 'react';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { Button, Row, Col, Image, Spinner } from 'react-bootstrap';
import { procesarEventosTambo } from '../components/layout/procesarEventosTambos';
import { FirebaseContext } from '../firebase2';
import ResultadosCargas from '../components/layout/ResultadosCargas';
import  procesarParto  from '../components/layout/registrarParto'; // ✅ cambio correcto

const Dirsa = () => {
    const { firebase, usuario, tamboSel } = useContext(FirebaseContext);
    const [archivoEvento, setArchivoEvento] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [datosPreview, setDatosPreview] = useState([]);
    const [actualizados, setActualizados] = useState([]);
    const [errores, setErrores] = useState([]);
    const inputFileRefEvento = useRef(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log(`📂 Archivo seleccionado:`, file);
            setArchivoEvento(file);
            setDatosPreview([]);
        }
    };

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

                const encabezados = jsonData[0].map(h => h.toString().trim().toUpperCase());
                const indiceRP = encabezados.indexOf("RP");
                const indiceFechaEvento = encabezados.indexOf("FECHA DE EVENTO (XX/XX/XXXX)");
                const indiceCodigoEvento = encabezados.indexOf("CODIGO DE EVENTO (*)");

                if (indiceRP === -1 || indiceFechaEvento === -1 || indiceCodigoEvento === -1) {
                    setErrores(["Error: La estructura del archivo es incorrecta. Verifica los encabezados."]);
                    setIsLoading(false);
                    return;
                }

                jsonData = jsonData.slice(1).map(row => ({
                    RP: limpiarRP(row[indiceRP]), 
                    'FECHA DE EVENTO (xx/xx/xxxx)': convertirFecha(row[indiceFechaEvento]),
                    'CODIGO DE EVENTO (*)': row[indiceCodigoEvento]?.toString().trim() || ""
                })).filter(item => item.RP && item['CODIGO DE EVENTO (*)']);

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
                const eventosParto = jsonData.filter(evento => evento['CODIGO DE EVENTO (*)'] === "PA");
                console.log("🐄 Eventos de parto detectados:", eventosParto.length, eventosParto);

                for (const evento of eventosParto) {
                    const rpLimpio = limpiarRP(evento.RP);
                    evento.RP = rpLimpio; // aseguramos consistencia para la función que recibe
                
                    try {
                        await procesarParto(evento, tamboSel, firebase, usuario);
                        setActualizados(prev => [...prev, `✅ Parto registrado para RP ${rpLimpio}`]);
                    } catch (error) {
                        setErrores(prev => [...prev, `❌ Error registrando parto para RP ${rpLimpio}: ${error.message}`]);
                    }
                }

                for (const evento of jsonData.filter(e => e['CODIGO DE EVENTO (*)'] !== "PA")) {
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

            <ResultadosCargas titulo="Resultados de la Carga" actualizados={actualizados} errores={errores} />
        </Layout>
    );
};

export default Dirsa;
