import React, { useEffect, useState } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import * as XLSX from 'xlsx';
import Layout from '../components/layout/layout';

const EncontrarERPRepetidos = () => {
  const [datosFiltrados, setDatosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);

  const esValidoERP = (dato) => dato.erp && dato.erp.trim() !== '';

  const obtenerDatos = async () => {
    try {
      setLoading(true);

      const idTamboPrincipal = 'e4ZnILyD3WBb5tuamAiq';

      const tamboPrincipalSnapshot = await firebase.firestore()
        .collection('animal')
        .where('idtambo', '==', idTamboPrincipal)
        .get();

      const erpPrincipalData = tamboPrincipalSnapshot.docs
        .map((doc) => ({
          erp: doc.data().erp,
          idtambo: idTamboPrincipal,
        }))
        .filter(esValidoERP);

      const erpList = erpPrincipalData.map((dato) => dato.erp);

      if (erpList.length === 0) {
        setDatosFiltrados([]);
        setLoading(false);
        return;
      }

      const fragmentos = [];
      let erpListCopy = [...erpList]; // Evitar mutar el array original
      while (erpListCopy.length > 0) {
        fragmentos.push(erpListCopy.splice(0, 10));
      }

      const datosFinales = [];

      for (const fragmento of fragmentos) {
        const repetidosQuery = await firebase.firestore()
          .collection('animal')
          .where('idtambo', '!=', idTamboPrincipal)
          .where('erp', 'in', fragmento)
          .get();

        const repetidosData = repetidosQuery.docs
          .map((doc) => ({
            erp: doc.data().erp,
            idtambo: doc.data().idtambo,
          }))
          .filter(esValidoERP);

        datosFinales.push(...repetidosData);
      }

      const erpRepetidos = erpPrincipalData
        .map((dato) => {
          const otrosTambos = datosFinales.filter(
            (repetido) => repetido.erp === dato.erp
          );
          return otrosTambos.length === 1
            ? {
                erpPrincipal: dato.erp,
                idTamboPrincipal: dato.idtambo,
                idTamboOtrosTambos: otrosTambos[0].idtambo,
                erpOtrosTambos: otrosTambos[0].erp,
              }
            : null;
        })
        .filter((dato) => dato !== null);

      const idTambosUnicos = [
        ...new Set([
          ...erpRepetidos.map((dato) => dato.idTamboPrincipal),
          ...erpRepetidos.map((dato) => dato.idTamboOtrosTambos),
        ]),
      ];

      const nombresTambosSnapshot = await firebase.firestore()
        .collection('tambo')
        .where(firebase.firestore.FieldPath.documentId(), 'in', idTambosUnicos)
        .get();

      const nombresTambos = nombresTambosSnapshot.docs.reduce(
        (acc, doc) => ({
          ...acc,
          [doc.id]: doc.data().nombre || 'Sin Nombre',
        }),
        {}
      );

      const datosConNombres = erpRepetidos.map((dato) => ({
        erpPrincipal: dato.erpPrincipal,
        idTamboPrincipal: dato.idTamboPrincipal,
        nombreTamboPrincipal: nombresTambos[dato.idTamboPrincipal] || 'Sin Nombre',
        erpOtrosTambos: dato.erpOtrosTambos,
        idTamboOtrosTambos: dato.idTamboOtrosTambos,
        nombreTamboOtrosTambos: nombresTambos[dato.idTamboOtrosTambos] || 'Sin Nombre',
      }));

      setDatosFiltrados(datosConNombres);
    } catch (error) {
      console.error('Error al obtener los datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const descargarExcel = () => {
    if (datosFiltrados.length === 0) {
      alert('No hay datos para descargar.');
      return;
    }

    const datosExcel = datosFiltrados.map((dato) => ({
      ERP_Tambo_Principal: dato.erpPrincipal,
      IDTambo_Principal: dato.idTamboPrincipal,
      Nombre_Tambo_Principal: dato.nombreTamboPrincipal,
      ERP_Otros_Tambos: dato.erpOtrosTambos,
      IDTambo_Otros_Tambos: dato.idTamboOtrosTambos,
      Nombre_Tambo_Otros_Tambos: dato.nombreTamboOtrosTambos,
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'ERP Repetidos');

    XLSX.writeFile(libro, 'ERP_Repetidos_Con_Nombres.xlsx');
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  if (loading) {
    return (
      <Layout titulo="Herramientas">
        <div className="spinnerContainer-Grafico">
          <div className="spinner-Grafico"></div>
          <div className="loader-Grafico">
            <p>CARGANDO</p>
            <div className="words-Grafico">
              <span className="word-Grafico">DATOS DEL TAMBO</span>
              <span className="word-Grafico">BUSCANDO ERP</span>
              <span className="word-Grafico">BUSCANDO DUPLICADOS</span>
              <span className="word-Grafico">ANALIZANDO IDTAMBOS</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout titulo="ERP Repetidos">
      <div className="EncontrarERP-container">
        <div className="erp-repetidos-header">
          <h1>ERP Repetidos</h1>
          <button className="btn-descargar-excel" onClick={descargarExcel}>
            Descargar Excel
          </button>
        </div>
        {datosFiltrados.length > 0 ? (
          <table className="EncontrarERP-table">
            <thead>
              <tr>
                <th>ERP obtenido</th>
                <th>Id tambo de busqueda</th>
                <th>Nombre tambo de busqueda</th>
                <th>ERP duplicados</th>
                <th>Id tambo de ERP duplicados</th>
                <th>Nombre tambo de ERP duplicados</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.map((dato, index) => (
                <tr key={index}>
                  <td>{dato.erpPrincipal}</td>
                  <td>{dato.idTamboPrincipal}</td>
                  <td>{dato.nombreTamboPrincipal}</td>
                  <td>{dato.erpOtrosTambos}</td>
                  <td>{dato.idTamboOtrosTambos}</td>
                  <td>{dato.nombreTamboOtrosTambos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No se encontraron resultados</p>
        )}
      </div>
    </Layout>
  );
};

export default EncontrarERPRepetidos;
