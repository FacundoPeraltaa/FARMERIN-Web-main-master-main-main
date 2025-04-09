import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';
import * as XLSX from 'xlsx';
import { GiCow, GiSave } from 'react-icons/gi';
import AnimalesEnOrdeñe from '../components/layout/fichaEnOrdeñe';


function control_ingreso() {
  const [data, setData] = useState([]);
  const [secosNaNData, setSecosNaNData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animalesAusentes, setAnimalesAusentes] = useState([]);
  const [animalesNuncaPaso, setAnimalesNuncaPaso] = useState([]);
  const [animalesNoLeyo, setAnimalesNoLeyo] = useState([]);
  const [animalesSeLeyo, setAnimalesSeLeyo] = useState([]);
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [selectedLists, setSelectedLists] = useState({
    seLeyo: false,
    noLeyo: false,
    ausentes: false,
    nuncaPaso: false,
    secosNaN: false
  });
  const [animalesConRP, setAnimalesConRP] = useState([]);
  const [showFichaEnOrdeñe, setShowFichaEnOrdeñe] = useState(false);

  useEffect(() => {
    const obtenerDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!tamboSel) {
          throw new Error("No se ha seleccionado un tambo");
        }
        const docSnapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
        if (!docSnapshot.exists) {
          throw new Error("El documento del tambo no existe");
        }
        const racionesURL = docSnapshot.data().raciones;
        const noRegsURL = docSnapshot.data().noreg;

        if (!racionesURL || !noRegsURL) {
          throw new Error("Los campos raciones o noregs no contienen URLs válidas");
        }

        const [racionesResponse, noRegsResponse] = await Promise.all([
          axios.get(racionesURL),
          axios.get(noRegsURL)
        ]);

        const parser = new DOMParser();
        const racionesDoc = parser.parseFromString(racionesResponse.data, 'text/html');
        const racionesTable = racionesDoc.querySelector('table');

        if (!racionesTable) {
          throw new Error('No se encontró la tabla en los datos de raciones');
        }

        const parsedData = tableToDataFrame(racionesTable);
        setData(parsedData);

        const noRegsDoc = parser.parseFromString(noRegsResponse.data, 'text/html');
        const noRegsTable = noRegsDoc.querySelector('table');

        if (!noRegsTable) {
          throw new Error('No se encontró la tabla en los datos de noregs');
        }

        const parsedNoRegsData = tableToDataFrame(noRegsTable);
        setSecosNaNData(parsedNoRegsData);

      } catch (error) {
        console.error("Error al obtener los datos:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    obtenerDatos();
  }, [tamboSel, firebase]);

  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      setAnimalesAusentes(data.filter(row => parseInt(row.DiasAusente) >= 2));
      setAnimalesNuncaPaso(data.filter(row => parseInt(row.DiasAusente) === -1));
      setAnimalesNoLeyo(data.filter(row => parseInt(row.DiasAusente) === 1));
      setAnimalesSeLeyo(data.filter(animal => parseInt(animal.DiasAusente) === 0));
    }
  }, [data]);

  const toggleList = (listType) => {
    setSelectedLists(prevSelected => ({
      ...prevSelected,
      [listType]: !prevSelected[listType]
    }));
  };

  const descargarExcel = () => {
    console.log("Descargando Excel...");
    const wb = XLSX.utils.book_new();
  
    const limpiarNombreHoja = (nombre) => {
      // Reemplaza caracteres no permitidos con guiones bajos
      return nombre.replace(/[:\/\\?*\[\]]/g, '_');
    };
  
    const agregarHoja = (nombreHoja, datos) => {
      const nombreLimpio = limpiarNombreHoja(nombreHoja);
      console.log(`Agregando hoja: ${nombreLimpio}`, datos);
      
      let datosFormateados;
      if (nombreHoja === 'Seca/NR') {
        datosFormateados = datos.map(animal => ({
          'RP': animal.rp || animal.RP || 'No Registrada',
          'eRP': animal.RFID?.replace(/⛔/g, '') || 'eRP desconocido',
          'EST.PRO': animal.estpro || 'No Registrada',
          'EST.REP': animal.estrep || 'No Registrada'
        }));
      } else {
        datosFormateados = datos.map(animal => ({
          'RP': animal.RP || 'No Registrada',
          'eRP': animal.RFID?.replace(/⛔/g, '') || 'eRP desconocido',
          'Dias Ausentes': animal.DiasAusente || 'No Registrado'
        }));
      }
      
      const ws = XLSX.utils.json_to_sheet(datosFormateados);
      XLSX.utils.book_append_sheet(wb, ws, nombreLimpio);
    };
  
    agregarHoja('Se Leyo', animalesSeLeyo);
    agregarHoja('No Se Leyo', animalesNoLeyo);
    agregarHoja('Ausentes', animalesAusentes);
    agregarHoja('Nunca Se Leyo', animalesNuncaPaso);
    agregarHoja('Seca/NR', animalesConRP);
  
    // Obtener la fecha actual en formato YYYY-MM-DD
    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Control_Ingreso_${fechaActual}.xlsx`;
  
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (loading) {
    return (
      <Layout titulo="Herramientas">
        <div className="spinnerContainer-Grafico">
          <div className="spinner-Grafico"></div>
          <div className="loader-Grafico">
            <p>Cargando</p>
            <div className="words-Grafico">
              <span className="word-Grafico">Datos del tambo</span>
              <span className="word-Grafico">Animales En Ordeñe</span>
              <span className="word-Grafico">Animales Secos</span>
              <span className="word-Grafico">Animales Ausentes</span>
              <span className="word-Grafico">Datos del tambo</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout titulo="Herramientas">
        <div className="errorContainer">
          <h1 className="tituloRacionesAviso">Aviso</h1>
          <h2 className="tituloRacionesAviso"> No se pudo obtener el control de ingreso </h2>
        </div>
      </Layout>
    );
  }

  if (data.length === 0) {
    return (
      <Layout titulo="Herramientas">
        <div className="divRaciones">
          <h1 className="tituloRacionesAviso"> Aviso </h1>
          <h2 className="tituloRacionesAviso"> No se pudo obtener el control de ingreso </h2>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="Herramientas">
      <div className="containerGrafico">
        <div className="tamboHeader">
          <h2 className="tituloTambo">{tamboSel?.nombre} - Control de Ingreso</h2>
          <div style={{ marginTop: '10px' }}>
            <button onClick={descargarExcel} style={{ backgroundColor: '#4cb14e',  marginLeft: '10px', color: 'white' }}><GiSave style={{ fontSize: '24px' }} /> Excel</button>
            <button onClick={() => setShowFichaEnOrdeñe(true)} style={{ backgroundColor: '#4cb14e', marginLeft: '10px', color: 'white' }}><GiCow style={{ fontSize: '24px' }} /> </button>
          </div>
        </div>
        <TamboChart 
          data={data}
          toggleList={toggleList}
          selectedLists={selectedLists}
          animalesAusentes={animalesAusentes}
          animalesNoLeyo={animalesNoLeyo}
          animalesNuncaPaso={animalesNuncaPaso}
          animalesSeLeyo={animalesSeLeyo}
          secosNaNData={secosNaNData}
          onSecosNaNDataConRPUpdate={setAnimalesConRP}
        />
      </div>
      <AnimalesEnOrdeñe show={showFichaEnOrdeñe} setShow={setShowFichaEnOrdeñe} />
    </Layout>
  );
}

function TamboChart({ data, toggleList, selectedLists, animalesAusentes, animalesNoLeyo, animalesNuncaPaso, animalesSeLeyo, secosNaNData, onSecosNaNDataConRPUpdate }) {
  const chartData = {
    labels: ['SE LEYO', 'NO SE LEYO', 'AUSENTES', 'NUNCA SE LEYO', 'SECA/NR'],
    datasets: [{
      data: [
        animalesSeLeyo.length,
        animalesNoLeyo.length,
        animalesAusentes.length,
        animalesNuncaPaso.length,
        secosNaNData.length
      ],
      backgroundColor: ['#00913f', '#c81d11', '#084d6e', '#f08a0c', '#2d3323'],
      borderColor: 'black',
      borderWidth: 1,
    }]
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return (
    <>
      <div className="chartArea">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="tamboChart">
        <div className="chartButtons" style={{ textAlign: 'center' }}>
          {animalesSeLeyo.length > 0 && (
            <button onClick={() => toggleList('seLeyo')} className={`chartButton ${selectedLists.seLeyo ? 'active' : ''}`}>
              Ver Se Leyó ({animalesSeLeyo.length})
            </button>
          )}
          {animalesNoLeyo.length > 0 && (
            <button onClick={() => toggleList('noLeyo')} className={`chartButton ${selectedLists.noLeyo ? 'active' : ''}`}>
              Ver No Se Leyó ({animalesNoLeyo.length})
            </button>
          )}
          {animalesAusentes.length > 0 && (
            <button onClick={() => toggleList('ausentes')} className={`chartButton ${selectedLists.ausentes ? 'active' : ''}`}>
              Ver Ausentes ({animalesAusentes.length})
            </button>
          )}
          {animalesNuncaPaso.length > 0 && (
            <button onClick={() => toggleList('nuncaPaso')} className={`chartButton ${selectedLists.nuncaPaso ? 'active' : ''}`}>
              Ver Nunca Se Leyó ({animalesNuncaPaso.length})
            </button>
          )}
          {secosNaNData.length > 0 && (
            <button onClick={() => toggleList('secosNaN')} className={`chartButton ${selectedLists.secosNaN ? 'active' : ''}`}>
              Ver Seca/NR ({secosNaNData.length})
            </button>
          )}
        </div>
        <div className="listContainer">
          {selectedLists.seLeyo && <AnimalesSeLeyoList animales={animalesSeLeyo} />}
          {selectedLists.noLeyo && <AnimalesNoLeyoList animales={animalesNoLeyo} />}
          {selectedLists.ausentes && <AnimalesAusentesList animales={animalesAusentes} />}
          {selectedLists.nuncaPaso && <AnimalesNuncaPasoList animales={animalesNuncaPaso} />}
          {selectedLists.secosNaN && <AnimalesSecosNaNList animales={secosNaNData} onAnimalesConRPUpdate={onSecosNaNDataConRPUpdate} />}
        </div>
      </div>
    </>
  );
}

function AnimalesSeLeyoList({ animales }) {
  return (
    <div className="AnimalesFormulario">
      <h2>Se Leyeron</h2>
      <table className="tablaDeAnimales" >
          <thead>
            <tr>
              <th>Caravana(RP)</th>
              <th>Boton(eRP)</th>    
            </tr>
          </thead>
          <tbody>
            {animales.map((animal, index) => (
              <tr key={index}>
                <td>{animal.RP || 'RP desconocido'}</td>
                <td>{animal.RFID.replace(/⛔/g, '') || 'eRP desconocido'}</td>           
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

function AnimalesNoLeyoList({ animales }) {
  if (animales.length === 0) {
    return <div className="loaderGrafico" />;
  }

  return (
    <div className="AnimalesFormulario">
      <h2>No se leyó</h2>
      <table className="tablaDeAnimales" >
        <thead>
          <tr>
            <th>Caravana(RP)</th>
            <th>Boton(eRP)</th> {/* Cambiado de RFID a eRP */}
          </tr>
        </thead>
        <tbody>
          {animales.map((animal, index) => (
            <tr key={index}>
              <td>{animal.RP || 'RP desconocido'}</td>
              <td>{animal.RFID.replace(/⛔/g, '') || 'eRP desconocido'}</td> {/* Eliminar caracteres especiales como ⛔ */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnimalesAusentesList({ animales }) {
  if (animales.length === 0) {
    return <div className="loaderGrafico" />;
  }

  return (
    <div className="AnimalesFormulario">
      <h2>Ausentes</h2>
      <table className="tablaDeAnimales" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Caravana(RP)</th>
            <th>Boton(eRP)</th> {/* Cambiado de RFID a eRP */}
            <th>Días Ausentes</th>
          </tr>
        </thead>
        <tbody>
          {animales.map((animal, index) => (
            <tr key={index}>
              <td>{animal.RP || 'RP desconocido'}</td>
              <td>{animal.RFID.replace(/⛔/g, '') || 'eRP desconocido'}</td> {/* Eliminar caracteres especiales como ⛔ */}
              <td>{animal.DiasAusente}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnimalesNuncaPasoList({ animales }) {
  if (animales.length === 0) {
    return <div className="loaderGrafico" />;
  }

  return (
    <div className="AnimalesFormulario">
      <h2>Nunca se leyó</h2>
      <table className="tablaDeAnimales" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Caravana(RP)</th>
            <th>Boton(eRP)</th> {/* Cambiado de RFID a eRP */}
          </tr>
        </thead>
        <tbody>
          {animales.map((animal, index) => (
            <tr key={index}>
              <td>{animal.RP || 'RP desconocido'}</td>
              <td>{animal.RFID.replace(/⛔/g, '') || 'eRP desconocido'}</td> {/* Eliminar caracteres especiales como ⛔ */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnimalesSecosNaNList({ animales, onAnimalesConRPUpdate }) {
  const { firebase } = useContext(FirebaseContext);
  const [animalesConRP, setAnimalesConRP] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerRPs = async () => {
      setLoading(true);
      const animalesActualizados = await Promise.all(
        animales.map(async (animal) => {
          const erp = animal.RFID?.replace(/⛔/g, '') || '';
          if (erp) {
            const snapshot = await firebase.db.collection('animal')
              .where('erp', '==', erp)
              .where('mbaja', '==', '')
              .get();
            
            if (!snapshot.empty) {
              const animalDoc = snapshot.docs[0];
              return { ...animal, rp: animalDoc.data().rp, estpro: animalDoc.data().estpro, estrep: animalDoc.data().estrep };
            }
          }
          return animal;
        })
      );
      setAnimalesConRP(animalesActualizados);
      onAnimalesConRPUpdate(animalesActualizados);  // Pasar los datos actualizados al componente padre
      setLoading(false);
    };

    obtenerRPs();
  }, [animales, firebase, onAnimalesConRPUpdate]);

  if (loading) {
    return <div className="loaderSecosNaN"> Obteniendo Informacion...</div>;
  }

  return (
    <div className="AnimalesFormulario">
      <h2>Seca/NR</h2>
      <table className="tablaDeAnimales" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Caravana(RP)</th>
            <th>Boton(eRP)</th>
            <th>EST. PRO</th>
            <th>EST. REP</th>
            {/* Agrega más encabezados si es necesario */}
          </tr>
        </thead>
        <tbody>
          {animalesConRP.map((animal, index) => (
            <tr key={index}>
              <td>{animal.rp || animal.RP || 'No Regsitrada'}</td>
              <td>{animal.RFID?.replace(/⛔/g, '') || 'eRP desconocido'}</td>
              <td>{animal.estpro || 'No Registrada'}</td>
              <td>{animal.estrep || 'No Registrada'}</td>
              {/* Agrega más celdas si es necesario */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tableToDataFrame(table) {
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
  const rows = Array.from(table.querySelectorAll('tr')).slice(1);
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return headers.reduce((obj, header, index) => {
      obj[header] = cells[index] ? cells[index].textContent.trim() : '';
      return obj;
    }, {});
  });
}

export default control_ingreso;