import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import * as XLSX from 'xlsx';
import { FaSearch } from 'react-icons/fa';


function IngresosFiltrados() {
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [datosFiltrados, setDatosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    setDatosFiltrados([]);

    try {
      const docRef = firebase.db
        .collection('tambo')
        .doc(tamboSel.id)
        .collection('ingresos')
        .doc(fecha);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();

        const procesarTurno = (items, turno) =>
          (items || [])
            .filter(

              item =>
                String(item.rfid) !== 'N/A' &&
                String(item.rfid) !== '0' &&
                String(item.rfid).trim() !== '' &&
                Array.isArray(item.ingresos) &&
                item.ingresos.length > 0
            )
            .map(item => {
              const [fechaStr, horaStr] = item.ingresos[0].ts.split(' ');
              return {
                turno,
                rp: item.rfid,
                visible: item.visible,
                fecha: fechaStr,
                hora: horaStr,
              };
            });

        const turnoManana = procesarTurno(data["1"], 'Mañana');
        const turnoTarde = procesarTurno(data["2"], 'Tarde');

        setDatosFiltrados([...turnoManana, ...turnoTarde]);
      } else {
        setError('');
      }
    } catch (err) {
      console.error('Error al obtener datos:', err);
      setError('Hubo un error al cargar los datos.');
    } finally {
      setCargando(false);
    }
  };

  const exportarAExcel = () => {
    if (datosFiltrados.length === 0) return;

    const workbook = XLSX.utils.book_new();

    ['Mañana', 'Tarde'].forEach(turno => {
      const datosTurno = datosFiltrados.filter(item => item.turno === turno);

      if (datosTurno.length > 0) {
        // Solo extrae las columnas deseadas y renombra claves
        const datosLimpios = datosTurno.map(({ rp, visible, fecha, hora }) => ({
          eRP: rp,
          RP: visible,
          Fecha: fecha,
          Hora: hora,
        }));

        const hoja = XLSX.utils.json_to_sheet(datosLimpios);
        XLSX.utils.book_append_sheet(workbook, hoja, turno);
      }
    });

    const nombreArchivo = `Turnos_${fecha}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);
  };


  return (
    <Layout>
      <div className="ingresos-container">
        <h2 className='ingresosT-titulo'>Lista de Ingresos </h2>
        <div className="filtros">
          <label>Seleccionar fecha: </label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          <button className="ingresosT-container-btn-buscar" onClick={cargarDatos}>
            <FaSearch />
            Buscar
          </button>
          <button class="ingresosT-container-btn-file" onClick={exportarAExcel}>
            <svg
              fill="#fff"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 50 50"
            >
              <path
                d="M28.8125 .03125L.8125 5.34375C.339844 
    5.433594 0 5.863281 0 6.34375L0 43.65625C0 
    44.136719 .339844 44.566406 .8125 44.65625L28.8125 
    49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 
    50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 
    30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 
    .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 
    6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 
    29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 
    43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 
    13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 
    21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 
    22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 
    15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 
    28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 
    27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 
    14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 
    20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z"
              ></path>
            </svg>
            Descargar Excel
            <input class="file" name="text" type="file" />
          </button>

        </div>

        {cargando && <p className="loading">Cargando...</p>}
        {error && <p className="error-message">{error}</p>}

        {datosFiltrados.length > 0 ? (
          <div className="turnos-wrapper">
            {['Mañana', 'Tarde'].map(turno => {
              const datosTurno = datosFiltrados.filter(item => item.turno === turno);

              return (
                <div key={turno} className="turno">
                  <h3>Turno {turno}</h3>
                  {datosTurno.length > 0 ? (
                    <table className="tabla-turno">
                      <thead>
                        <tr>
                          <th>eRP</th>
                          <th>RP</th>
                          <th>Fecha</th>
                          <th>Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosTurno.map((item, index) => (
                          <tr key={`${turno}-${index}`}>
                            <td>{item.rp}</td>
                            <td>{item.visible}</td>
                            <td>{item.fecha}</td>
                            <td>{item.hora}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className='ingresos-mensaje'>
                       <strong className="mensaje-alerta">No hay datos para Turno {turno}</strong>
                       </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !cargando && <p className="ingresos-mensaje">
            <strong className="mensaje-alerta">No hay datos filtrados para mostrar.</strong> Seleccione una fecha y presione <strong>Buscar</strong> para ver los resultados correspondientes a los turnos <strong>matutino</strong> y <strong>vespertino</strong>.
          </p>


        )}
      </div>

    </Layout>
  );
}

export default IngresosFiltrados;
