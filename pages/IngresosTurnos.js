import React, { useState } from 'react';
import axios from 'axios';
import Layout from '../components/layout/layout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function IngresosTurnos() {
    const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
    const [datos, setDatos] = useState({});
    const [cargando, setCargando] = useState(false);
    const [errorGeneral, setErrorGeneral] = useState(null);

    const obtenerHorarios = async (fecha) => {
        try {
            const res = await axios.get(`http://192.168.100.202:3001/horarios/${fecha}`);
            return res.data;
        } catch (error) {
            console.error('Error al obtener horarios:', error);
            return [];
        }
    };

    const mostrarHorarios = async () => {
        try {
            const horarios = await obtenerHorarios(fecha);

            if (horarios.length === 0) {
                alert("No hay horarios cargados para esta fecha.");
                return;
            }

            const mensaje = horarios
                .map(h => `• ${h.nombre}: ${h.inicio} a ${h.fin}`)
                .join('\n');

            alert(`Horarios del tambo para ${fecha}:\n\n${mensaje}`);
        } catch (err) {
            alert("No se pudo obtener la información de los horarios.");
        }
    };

    const buscarDatos = async () => {
        setCargando(true);
        setErrorGeneral(null);
        setDatos({});

        try {
            const horarios = await obtenerHorarios(fecha);
            const ahora = new Date();

            const estaDentroDeTurno = (horario) => {
                const [hI, mI] = horario.inicio.split(':');
                const [hF, mF] = horario.fin.split(':');

                const inicio = new Date(ahora);
                inicio.setHours(Number(hI), Number(mI), 0, 0);

                const fin = new Date(ahora);
                fin.setHours(Number(hF), Number(mF), 0, 0);

                return ahora >= inicio && ahora <= fin;
            };

            const turnoActual = horarios.find(estaDentroDeTurno);

            if (turnoActual) {
                alert(`No se puede realizar la búsqueda durante el ${turnoActual.nombre}.`);
                setCargando(false);
                return;
            }

            const res = await axios.get(`http://192.168.100.202:3001/ingresos/${fecha}`);
            console.log("Respuesta de API:", res.data);
            setDatos(res.data);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setErrorGeneral('No se pudieron cargar los datos del servidor.');
        } finally {
            setCargando(false);
        }
    };

    const exportarExcel = () => {
        const libro = XLSX.utils.book_new();

        const agregarHoja = (nombreHoja, data) => {
            const datosFiltrados = data
                .filter(item => item.ingresos && item.ingresos.length > 0 && item.ingresos[0].ts && item.ingresos[0].ts.includes(' '))
                .map(item => {
                    const [fecha, hora] = item.ingresos[0].ts.split(' ');
                    return {
                        'eRP': item.rfid,
                        'RP': item.visible,
                        'Fecha': fecha,
                        'Hora': hora
                    };
                });

            const hoja = XLSX.utils.json_to_sheet(datosFiltrados);
            XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
        };

        if (datos["1.json"]) {
            agregarHoja("Turno Mañana", datos["1.json"]);
        }

        if (datos["2.json"]) {
            agregarHoja("Turno Tarde", datos["2.json"]);
        }

        XLSX.writeFile(libro, `Ingresos_${fecha}.xlsx`);
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        let y = 10;

        const agregarTabla = (titulo, data) => {
            const datosFiltrados = data
                .filter(item => item.ingresos && item.ingresos.length > 0 && item.ingresos[0].ts && item.ingresos[0].ts.includes(' '))
                .map(item => {
                    const [fecha, hora] = item.ingresos[0].ts.split(' ');
                    return [item.rfid, item.visible, fecha, hora];
                });

            if (datosFiltrados.length === 0) return;

            doc.text(titulo, 14, y);
            y += 6;

            autoTable(doc, {
                head: [['eRP', 'RP', 'Fecha', 'Hora']],
                body: datosFiltrados,
                startY: y,
                theme: 'striped',
                styles: { fontSize: 9 },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    y = data.cursor.y + 10;
                }
            });
        };

        if (datos["1.json"]) {
            agregarTabla("Turno Mañana", datos["1.json"]);
        }

        if (datos["2.json"]) {
            agregarTabla("Turno Tarde", datos["2.json"]);
        }

        doc.save(`Ingresos_${fecha}.pdf`);
    };

    const mostrarContenido = (turno, data) => {
        if (!Array.isArray(data)) {
            return <p>{turno}: Datos no disponibles.</p>;
        }

        return (
            <div style={{ marginBottom: '2rem' }}>
                <h3>{turno}</h3>
                <div className="tabla-ingresos">
                    <table>
                        <thead>
                            <tr>
                                <th>eRP</th>
                                <th>RP</th>
                                <th>Fecha</th>
                                <th>Hora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data
                                .filter(item => {
                                    const tieneIngresos = item.ingresos && item.ingresos.length > 0;
                                    const ts = tieneIngresos ? item.ingresos[0].ts : null;
                                    return ts && ts.includes(' ');
                                })
                                .map((item, index) => {
                                    const ts = item.ingresos[0].ts;
                                    const [fecha, hora] = ts.split(' ');

                                    return (
                                        <tr key={index}>
                                            <td>{item.rfid}</td>
                                            <td>{item.visible}</td>
                                            <td>{fecha}</td>
                                            <td>{hora}</td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <Layout>
            <div style={{ padding: '1rem' }}>
                <h2>Ingresos por fecha</h2>

                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#555', marginBottom: '0.5rem' }}>
                        ⚠️ Los resultados de ingresos se mostrarán solo fuera del horario activo del tambo. <br />
                        Si desea conocer los horarios del día, consulte aquí:
                    </p>

                    <button onClick={mostrarHorarios} style={{ marginRight: '1rem' }}>
                        Ver horarios del tambo
                    </button>

                    <label>Seleccionar fecha:&nbsp;</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                    />
                    <button onClick={buscarDatos} style={{ marginLeft: '1rem' }}>
                        Buscar
                    </button>
                    <button onClick={exportarExcel} style={{ marginLeft: '1rem' }} disabled={Object.keys(datos).length === 0}>
                        Exportar a Excel
                    </button>
                    <button onClick={exportarPDF} style={{ marginLeft: '1rem' }} disabled={Object.keys(datos).length === 0}>
                        Exportar a PDF
                    </button>
                </div>

                {cargando && <p>Cargando datos...</p>}
                {errorGeneral && <p style={{ color: 'red' }}>{errorGeneral}</p>}

                <div className="contenedor-tablas">
                    {datos["1.json"] && mostrarContenido("Turno Mañana", datos["1.json"])}
                    {datos["2.json"] && mostrarContenido("Turno Tarde", datos["2.json"])}
                </div>
            </div>
        </Layout>
    );
}

export default IngresosTurnos;
