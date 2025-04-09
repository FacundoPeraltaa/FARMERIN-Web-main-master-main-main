import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';
import { FirebaseContext } from '../firebase2';
import StickyTable from 'react-sticky-table-thead';
import { Table } from 'react-bootstrap';
import { Contenedor } from '../components/ui/Elementos';
import { FaSort } from 'react-icons/fa';
import { saveAs } from 'file-saver';

const tableToDataFrame = (table) => {
  const rows = Array.from(table.querySelectorAll('tr'));
  const headers = Array.from(rows[0].querySelectorAll('th')).map(th => th.textContent);
  const data = rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    return headers.reduce((acc, header, index) => {
      acc[header] = cells[index].textContent;
      return acc;
    }, {});
  });
  return data;
};

function NoRegs() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true); // Estado para controlar la carga
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [matchedAnimals, setMatchedAnimals] = useState([]);

  useEffect(() => {
    const obtenerNoReg = async () => {
      try {
        if (tamboSel) {
          const docSnapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
          if (docSnapshot.exists) {
            const noregURL = docSnapshot.data().noreg;

            if (noregURL) {
              const response = await axios.get(noregURL);
              const parser = new DOMParser();
              const doc = parser.parseFromString(response.data, 'text/html');
              const table = doc.querySelector('table');

              if (table) {
                const parsedData = tableToDataFrame(table);
                setData(parsedData);
                await checkAnimals(parsedData); // Espera a que se complete checkAnimals
              } else {
                console.error('No se encontró la tabla en los datos obtenidos');
              }
            } else {
              console.error("El campo no registradas no contiene una URL válida");
            }
          } else {
            console.log("El documento no existe");
          }
        }
      } catch (error) {
        console.error("Error al obtener el campo no registradas:", error);
      } finally {
        setLoading(false); // Actualiza el estado de carga una vez terminado el proceso
      }
    };

    obtenerNoReg();
  }, [tamboSel, firebase]);

  const checkAnimals = async (parsedData) => {
    const updatedData = await Promise.all(
      parsedData.map(async (item) => {
        const erp = item.RFID; // Asume que el RFID está en una columna llamada 'RFID'

        // Realiza la consulta con la condición adicional de mbaja vacío
        const querySnapshot = await firebase.db.collection('animal')
          .where('erp', '==', erp)
          .where('idtambo', '==', tamboSel.id)
          .where('mbaja', '==', '')
          .get();

        if (!querySnapshot.empty) {
          const animalData = querySnapshot.docs[0].data();
          return {
            eRP: erp,
            RP: animalData.rp || 'N/A',
            'EST. PRO': animalData.estpro || 'N/A',
            'EST. REP': animalData.estrep || 'N/A',
          };
        } else {
          return {
            eRP: erp,
            RP: 'No Registrada',
            'EST. PRO': 'No Registrada',
            'EST. REP': 'No Registrada',
          };
        }
      })
    );
    setMatchedAnimals(updatedData);
  };


  const s2ab = s => {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i !== s.length; ++i) view[i] = s.charCodeAt(i) & 0xff;
    return buf;
  };

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(matchedAnimals);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NoRegs');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const fechaActual = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `ListaDeNoRegistrados_${fechaActual}.xlsx`;  // nombre del archivo a descargar
    saveAs(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), nombreArchivo);
  };



  //states de ordenamiento
  const [orderERP, guardarOrderERP] = useState('asc');
  const [orderRP, guardarOrderRP] = useState('asc');
  const [orderESTPROD, guardarOrderESTPROD] = useState('asc');
  const [orderESTREP, guardarOrderESTREP] = useState('asc');

  // ordenamiento de ERP
  const handleClickERP = e => {
    e.preventDefault();
    if (orderERP === 'asc') {
      const a = matchedAnimals.sort((a, b) => (a.eRP < b.eRP) ? 1 : -1);
      guardarOrderERP('desc');
      setMatchedAnimals([...a]);
    } else {
      const b = matchedAnimals.sort((a, b) => (a.eRP > b.eRP) ? 1 : -1);
      guardarOrderERP('asc');
      setMatchedAnimals([...b]);
    }
  };

  // ordenamiento de RP
  const handleClickRP = e => {
    e.preventDefault();
    if (orderRP === 'asc') {
      const a = matchedAnimals.sort((a, b) => (a.RP < b.RP) ? 1 : -1);
      guardarOrderRP('desc');
      setMatchedAnimals([...a]);
    } else {
      const b = matchedAnimals.sort((a, b) => (a.RP > b.RP) ? 1 : -1);
      guardarOrderRP('asc');
      setMatchedAnimals([...b]);
    }
  };

  // ordenamiento de EST. PROD
  const handleClickESTPROD = e => {
    e.preventDefault();
    if (orderESTPROD === 'asc') {
      const a = matchedAnimals.sort((a, b) => (a.ESTPROD < b.ESTPROD) ? 1 : -1);
      guardarOrderESTPROD('desc');
      setMatchedAnimals([...a]);
    } else {
      const b = matchedAnimals.sort((a, b) => (a.ESTPROD > b.ESTPROD) ? 1 : -1);
      guardarOrderESTPROD('asc');
      setMatchedAnimals([...b]);
    }
  };

  // ordenamiento de EST. REP
  const handleClickESTREP = e => {
    e.preventDefault();
    if (orderESTREP === 'asc') {
      const a = matchedAnimals.sort((a, b) => (a.ESTREP < b.ESTREP) ? 1 : -1);
      guardarOrderESTREP('desc');
      setMatchedAnimals([...a]);
    } else {
      const b = matchedAnimals.sort((a, b) => (a.ESTREP > b.ESTREP) ? 1 : -1);
      guardarOrderESTREP('asc');
      setMatchedAnimals([...b]);
    }
  };


  return (
    <Layout titulo="Verificación ingreso">
      <div className="listaNoRegs">
        <h1 className="tituloNoRegs">Lista de  Animales con Estado Seco, Cria o No Registrado</h1>
        <button className="excelNoRegs" onClick={handleDownload}>Excel</button>
      </div>
      <Contenedor>
        {loading ? (
          <div className="loaderContainer">
            <div className="loaderGrafico">
              <div className="innerContent">
                <h1 className="imagenLogo"></h1>
              </div>
            </div>
            <h2 className="textoLoader">OBTENIENDO INFORMACION</h2>
          </div>
        ) : (
          <StickyTable height={450}>
            {matchedAnimals.length === 0 ? (
              <div className="divRaciones">
                <h1 className="tituloRacionesAviso">Aviso </h1>
                <h2 className="tituloRacionesAviso">No se pudo obtener los animales no registrados</h2>
              </div>
            ) : (
              <Table responsive>
                <thead>
                  <tr>
                    <th onClick={handleClickERP}>eRP  <FaSort size={15} /></th>
                    <th onClick={handleClickRP}>RP  <FaSort size={15} /></th>
                    <th onClick={handleClickESTPROD}>EST. PRO  <FaSort size={15} /></th>
                    <th onClick={handleClickESTREP}>EST. REP  <FaSort size={15} /></th>
                  </tr>
                </thead>
                <tbody>
                  {matchedAnimals.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </StickyTable>
        )}
      </Contenedor>
    </Layout>


  );
}

export default NoRegs;