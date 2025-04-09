import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleProduccion from '../components/layout/detalleProduccion';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from 'react-sticky-table-thead';
import { Button, Form, Row, Col, Alert, Spinner, Table, ButtonGroup } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import { format, subDays } from 'date-fns';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import GraficoProduccion from '../components/layout/GraficoProduccion';


const Produccion = () => {
  const { firebase, tamboSel } = useContext(FirebaseContext);

  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [producciones, setProducciones] = useState([]);
  const [totales, setTotales] = useState({ produccion: 0, descarte: 0, guachera: 0, entregado: 0 });
  const [procesando, setProcesando] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [valores, setValores] = useState({
    fini: format(Date.now(), 'yyyy-MM-dd'),
    ffin: format(Date.now(), 'yyyy-MM-dd'),
    inicio: '',
    fin: '',
    tipoFecha: 'ud'
  });

  const realizarBusqueda = (tipo) => {
    let nuevosValores = { ...valores, tipoFecha: tipo };

    if (tipo === 'ud') {
      const inicioAux = format(subDays(Date.now(), 1), 'yyyy-MM-dd');
      nuevosValores = {
        ...nuevosValores,
        fini: inicioAux,
        ffin: format(Date.now(), 'yyyy-MM-dd'),
        inicio: firebase.fechaTimeStamp(inicioAux),
        fin: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd') + 'T23:59:59') // Fin del día
      };
    } else if (tipo === 'mv') {
      const primerDiaMes = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
      nuevosValores = {
        ...nuevosValores,
        fini: primerDiaMes,
        ffin: format(Date.now(), 'yyyy-MM-dd'),
        inicio: firebase.fechaTimeStamp(primerDiaMes),
        fin: firebase.fechaTimeStamp(format(Date.now(), 'yyyy-MM-dd') + 'T23:59:59') // Fin del día
      };
    } else if (tipo === 'ef') {
      const { fini, ffin } = valores;
      nuevosValores = {
        ...nuevosValores,
        inicio: firebase.fechaTimeStamp(fini),
        fin: firebase.fechaTimeStamp(ffin + 'T23:59:59') // Fin del día
      };
    }

    setValores(nuevosValores);
    handleSubmit(nuevosValores);
  };

  const handleSubmit = async (valoresActualizados = valores) => {
    setProducciones([]);
    setProcesando(true);

    const inicio = firebase.fechaTimeStamp(valoresActualizados.fini);
    const fin = firebase.fechaTimeStamp(valoresActualizados.ffin + 'T23:59:59'); // Fin del día

    console.log("📌 Inicio:", inicio.toDate ? inicio.toDate() : inicio);
    console.log("📌 Fin:", fin.toDate ? fin.toDate() : fin);


    if (tamboSel) {
      try {
        const snapshot = await firebase.db.collection('tambo')
          .doc(tamboSel.id)  // Asegurar que estamos accediendo al documento correcto
          .collection('produccion')
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fin)
          .get();

        console.log("📌 Documentos encontrados:", snapshot.docs.length);

        snapshotProduccion(snapshot);
      } catch (error) {
        setShowAlert(true);
      }
    }
  };

  const handleChange = (e) => {
    setValores({ ...valores, [e.target.name]: e.target.value });
  };

  const snapshotProduccion = (snapshot) => {
    let totProd = 0, totDesc = 0, totGua = 0;

    const prod = snapshot.docs.map(doc => {
      const data = doc.data();
      const produccion = parseFloat(data.produccion) || 0;
      const descarte = parseFloat(data.descarte) || 0;
      const guachera = parseFloat(data.guachera) || 0;

      const animales = parseFloat(data.animalesEnOrd);
      const produccionNum = parseFloat(data.produccion);

      const prodIndv = !isNaN(animales) && animales !== 0 && !isNaN(produccionNum)
        ? parseFloat((produccionNum / animales).toFixed(1))
        : "-";

      console.log(`📊 ID ${doc.id} | Producción: ${produccionNum} | Animales: ${animales} | Prod. Indv: ${prodIndv}`);

      totProd += produccion;
      totDesc += descarte;
      totGua += guachera;

      return { id: doc.id, ...data, produccion, descarte, guachera, prodIndv };
    });

    setTotales({ produccion: totProd, descarte: totDesc, guachera: totGua, entregado: totProd - totDesc - totGua });
    setProducciones(prod);
    setProcesando(false);
  };

  const formatMiles = (val) => {
    const n = Number(val);
    if (isNaN(n)) return '0';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(n);
  };


  const exportToExcel = () => {
    if (!tamboSel || !tamboSel.nombre) {
      alert("No se puede generar el archivo porque no hay un tambo seleccionado.");
      return;
    }

    const numberFormat = new Intl.NumberFormat('es-ES');


    const wsData = [
      ["Tambo:", tamboSel.nombre],
      ["Total Producido:", numberFormat.format(totales.produccion)],
      ["Total Descarte:", numberFormat.format(totales.descarte)],
      ["Total Guachera:", numberFormat.format(totales.guachera)],
      ["Total Entregado:", numberFormat.format(totales.entregado)],
      [],
      ["Fecha", "Prod. M", "Prod. T", "Produccion", "Desc. M", "Desc. T", "Descarte", "Guach. M", "Guach. T", "Guachera", "Entregados", "Animales en Orden", "Prod. Individual", "Fabrica"]
    ];

    producciones.forEach(p => {
      wsData.push([
        p.fecha.toDate ? format(p.fecha.toDate(), 'yyyy-MM-dd') : p.fecha,
        formatMiles(p.prodM),
        formatMiles(p.prodT),
        formatMiles(p.produccion),
        formatMiles(p.desM),
        formatMiles(p.desT),
        formatMiles(p.descarte),
        formatMiles(p.guaM),
        formatMiles(p.guaT),
        formatMiles(p.guachera),
        formatMiles(p.entregados),
        formatMiles(p.animalesEnOrd),
        typeof p.prodIndv === 'number'
          ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(p.prodIndv)
          : p.prodIndv,
        p.fabrica || ""
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 13, r: wsData.length - 1 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Producción");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const fechaActual = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Produccion_${fechaActual}_${tamboSel.nombre.replace(/\s+/g, "_")}.xlsx`;

    saveAs(data, nombreArchivo);
  };



  return (
    <Layout titulo="Producción">
      <Botonera>
        <Form onSubmit={(e) => { e.preventDefault(); handleSubmit(valores); }}>
          <Row>
            <Col lg>
              <Form.Label>Desde</Form.Label>
              <ButtonGroup className="produccion-botonera">
                <div className="produccion-tooltip">
                  <Button className={`produccion-btn ${valores.tipoFecha === 'ud' ? 'activo' : ''}`} variant="info" onClick={() => realizarBusqueda('ud')}>1 DÍA</Button>
                  <span className="produccion-tooltip-text">Ultimo dia</span>
                </div>
                <div className="produccion-tooltip">
                  <Button className={`produccion-btn ${valores.tipoFecha === 'mv' ? 'activo' : ''}`} variant="info" onClick={() => realizarBusqueda('mv')}>MES EN CURSO</Button>
                  <span className="produccion-tooltip-text">Ultimo mes</span>
                </div>
                <div className="produccion-tooltip">
                  <Button
                    className={`produccion-btn ${valores.tipoFecha === 'ef' ? 'activo' : ''}`}
                    variant="info"
                    onClick={() => setValores({ ...valores, tipoFecha: 'ef' })}
                  >
                    POR FECHA
                  </Button>
                  <span className="produccion-tooltip-text">Selecciona un rango de fechas</span>
                </div>
              </ButtonGroup>
            </Col>
            {valores.tipoFecha === 'ef' && (
              <>
                <Col lg>
                  <Form.Label>Inicio</Form.Label>
                  <Form.Control type="date" name="fini" value={valores.fini} onChange={handleChange} required />
                </Col>
                <Col lg>
                  <Form.Label>Fin</Form.Label>
                  <Form.Control type="date" name="ffin" value={valores.ffin} onChange={handleChange} required />
                </Col>
              </>
            )}
            <Col lg>
              <Form.Group>
                <br />
                <Button variant="info" block type="submit">
                  <RiSearchLine size={22} /> Buscar
                </Button>
              </Form.Group>
              <Button variant="success" block onClick={exportToExcel}>
                Descargar Excel
              </Button>
            </Col>
          </Row>
        </Form>
      </Botonera>
  
      {procesando ? (
        <ContenedorSpinner>
          <Spinner animation="border" variant="info" />
        </ContenedorSpinner>
      ) : tamboSel ? (
        producciones.length === 0 ? (
          <Mensaje>
            <Alert variant="warning">No se encontraron resultados</Alert>
          </Mensaje>
        ) : (
          <Contenedor>
            <tr>
              <td><h6>Total Producido:</h6></td>
              <td>{new Intl.NumberFormat('es-ES').format(totales.produccion)}</td>
              <td>&nbsp;</td>
              <td><h6>Total Descarte:</h6></td>
              <td>{new Intl.NumberFormat('es-ES').format(totales.descarte)}</td>
              <td>&nbsp;</td>
              <td><h6>Total Guachera:</h6></td>
              <td>{new Intl.NumberFormat('es-ES', { useGrouping: true, maximumFractionDigits: 0 }).format(Number(totales.guachera))}</td>
              <td>&nbsp;</td>
              <td><h6>Total Entregado:</h6></td>
              <td>{new Intl.NumberFormat('es-ES').format(totales.entregado)}</td>
            </tr>
  
            <Button
              variant="dark"
              onClick={() => setMostrarGrafico(!mostrarGrafico)}
              style={{ margin: '0', marginleft: '50px' }}
            >
              {mostrarGrafico ? 'Ocultar gráfico' : 'Ver gráfico'}
            </Button>
  
            {mostrarGrafico && <GraficoProduccion data={producciones} />}
  
            <StickyTable height={350}>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Prod. M</th>
                    <th>Prod. T</th>
                    <th>Produccion</th>
                    <th>Desc. M</th>
                    <th>Desc. T</th>
                    <th>Descarte</th>
                    <th>Guach. M</th>
                    <th>Guach. T</th>
                    <th>Guachera</th>
                    <th>Entregados</th>
                    <th>Vacas en ordeñe</th>
                    <th>Prod. Individual</th>
                    <th>Fabrica</th>
                  </tr>
                </thead>
                <tbody>
                  {producciones.map(p => (
                    <DetalleProduccion key={p.id} prod={p} />
                  ))}
                </tbody>
              </Table>
            </StickyTable>
          </Contenedor>
        )
      ) : (
        <SelectTambo />
      )}
    </Layout>
  )
  
}

export default Produccion