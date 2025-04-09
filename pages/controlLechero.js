import React, { useState, useContext, useEffect } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import { Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns'
import readXlsxFile from 'read-excel-file'
import Detalle from '../components/layout/detalle';
import { v4 as uuidv4 } from 'uuid';
import SelectTambo from '../components/layout/selectTambo';


const ControlLechero = () => {

  const { firebase, tamboSel, usuario } = useContext(FirebaseContext);
  const [fecha, guardarFecha] = useState(null);
  const [file, guardarFile] = useState(null);
  const [errores, guardarErrores] = useState([]);
  const [actualizados, guardarActualizados] = useState([]);
  const [procesando, guardarProcesando] = useState(false);
  const [animales, guardarAnimales] = useState([]);


  useEffect(() => {
    const f = format(Date.now(), 'yyyy-MM-dd');
    guardarFecha(f);

  }, [])


  const handleChange = e => {
    guardarFecha(e.target.value);

  }

  const handleSubmit = e => {
    e.preventDefault();
    if (file) {

      //console.log(file.name.indexOf('.'));
      cargarControl();

    }

  }

  async function cargarControl() {
    guardarProcesando(true);
    let fila = 0;
    guardarErrores([]);
    guardarActualizados([]);
    guardarAnimales([]);

    await readXlsxFile(file).then((rows) => {
      rows.forEach(r => {
        fila++;
        if (fila != 1) {

          const a = {
            erp: r[0],
            lts: r[1],
            anorm: "",
            fila: fila
          }
          cargarAnimal(a);

        }

      });

    })
    guardarFile(null);
    //console.log(animales);
    // animales.forEach(a => {

    // });
    guardarProcesando(false);
  }

  async function cargarAnimal(a) {
    let litros;
    let e='';
    let erp;
    try {
        litros=a.lts.toString();
        if (litros.includes(",")){
           litros = litros.replace(',', '.');
        }
     } catch (error) {
      e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Error de formato en Lts.";
      guardarErrores(errores => [...errores, e]);
    }
    try {
      erp = a.erp.toString();
    } catch (error) {
      e = "Fila N°: " + a.fila +" - Error en eRP.";
      guardarErrores(errores => [...errores, e]);
    }

    let valores;
    if (isNaN(litros) || (!litros)) {
      e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Los litros deben ser un valor numérico";
      guardarErrores(errores => [...errores, e]);
    } else {
      if (e=='') {
        
        await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('erp', 'in', [erp,a.erp]).get().then(snapshot => {
          if (!snapshot.empty) {
            snapshot.forEach(doc => {
              valores = {
                uc: parseFloat(litros),
                fuc: firebase.fechaTimeStamp(fecha),
                ca: doc.data().uc,
                anorm: a.anorm,
              }
              try {
                let detalle = litros + " lts."
                if (a.anorm) {
                  detalle = detalle + " - Anorm: " + a.anorm
                }
                firebase.db.collection('animal').doc(doc.id).update(valores);
                firebase.db.collection('animal').doc(doc.id).collection('eventos').add({
                  fecha: valores.fuc,
                  tipo: 'Control Lechero',
                  detalle: detalle,
                  usuario: usuario.displayName,
                })
                let act = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Lts: " + litros;
                guardarActualizados(actualizados => [...actualizados, act]);
              } catch (error) {

                e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - Error al actualizar los datos ";
                guardarErrores(errores => [...errores, e]);
              }
            });


          } else {
            e = "Fila N°: " + a.fila + " / eRP: " + a.erp + " - El eRP no existe";
            guardarErrores(errores => [...errores, e]);
          }

        });
      }
    }

  }


  const onFileChange = e => {
    const f = e.target.files[0];
    guardarErrores([]);
    guardarActualizados([]);
    guardarFile(f);

  }

  const clearFile = () => {
    guardarFile(null);
  }

  const handleDragOver = e => {
    e.preventDefault();
  }

  const handleDrop = e => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      guardarFile(f);
    }
  }

  return (

    <Layout
      titulo="Control Lechero"
    >
      {procesando ? <ContenedorSpinner> <Spinner animation="border" variant="info" /></ContenedorSpinner> :
        <Botonera>
          <Form onSubmit={handleSubmit}>
            <Row className="justify-content-center">
              <Col xs={12} md={6}>
              <div className="calendario-ControlLechero">
                <Form.Control
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={fecha}
                  onChange={handleChange}
                  required
                  className="header-ControlLechero"
                />
                </div>
              </Col>
            </Row>
            <Row className="justify-content-center" style={{ marginTop: '20px' }}>
              <Col xs={12} md={6}>
                <div 
                  className="container-ControlLechero" 
                  onDragOver={handleDragOver} 
                  onDrop={handleDrop}
                >
                  <div className="header-ControlLechero" onClick={() => document.getElementById('archivoExcel').click()}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 15.4806 20.1956 16.8084 19 17.5M7 10C4.79086 10 3 11.7909 3 14C3 15.4806 3.8044 16.8084 5 17.5M7 10C7.43285 10 7.84965 10.0688 8.24006 10.1959M12 12V21M12 12L15 15M12 12L9 15"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p>Cargar archivo de control lechero</p>
                  </div>
                  <label htmlFor="archivoExcel" className="footer-ControlLechero">
                    <svg
                      fill="#000000"
                      viewBox="0 0 32 32"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M15.331 6H8.5v20h15V14.154h-8.169z"></path>
                      <path d="M18.153 6h-.009v5.342H23.5v-.002z"></path>
                    </svg>
                    <p>{file ? file.name : "Ningun archivo seleccionado"}</p>
                    {file && (
                      <Button variant="danger" onClick={clearFile} style={{ marginLeft: '10px' }}>
                        Borrar
                      </Button>
                    )}
                  </label>
                  <input id="archivoExcel" type="file" style={{ display: 'none' }} onChange={onFileChange} />
                </div>
              </Col>
            </Row>
            <Row className="justify-content-center" style={{ marginTop: '20px' }}>
              <Col xs={12} md={6}>
                <button className="button-ControlLechero" type="submit" block>
                  <span className="span-ControlLechero">Cargar Control Lechero</span>
                  <svg
                    className="svg-ControlLechero"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 74 74"
                    height="34"
                    width="34"
                  >
                    <circle
                      className="circle-ControlLechero"
                      strokeWidth="3"
                      stroke="white"
                      r="35.5"
                      cy="37"
                      cx="37"
                    ></circle>
                    <path
                      className="path-ControlLechero"
                      fill="white"
                      d="M25 35.5C24.1716 35.5 23.5 36.1716 23.5 37C23.5 37.8284 24.1716 38.5 25 38.5V35.5ZM49.0607 38.0607C49.6464 37.4749 49.6464 36.5251 49.0607 35.9393L39.5147 26.3934C38.9289 25.8076 37.9792 25.8076 37.3934 26.3934C36.8076 26.9792 36.8076 27.9289 37.3934 28.5147L45.8787 37L37.3934 45.4853C36.8076 46.0711 36.8076 47.0208 37.3934 47.6066C37.9792 48.1924 38.9289 48.1924 39.5147 47.6066L49.0607 38.0607ZM25 38.5L48 38.5V35.5L25 35.5V38.5Z"
                    ></path>
                  </svg>
                </button>
              </Col>
            </Row>
          </Form>
        </Botonera>
      }
      {tamboSel ?
        <Mensaje>

          {errores.length != 0 &&

            <Alert variant="danger"  >
              <Alert.Heading>Se produjeron los siguientes errores:</Alert.Heading>
              {errores.map(a => (
                <Detalle
                  key={uuidv4()}
                  info={a}
                />
              ))}
            </Alert>
          }
          {actualizados.length != 0 &&

            <Alert variant="success"  >
              <Alert.Heading>Se actualizaron los siguientes animales:</Alert.Heading>

              {actualizados.map(a => (
                <Detalle
                  key={uuidv4()}
                  info={a}
                />
              ))}

            </Alert>
          }

        </Mensaje>
        :
        <SelectTambo />
      }
    </Layout>

  )
}

export default ControlLechero