// src/components/Parametros.js
import React, { useState, useEffect, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import DetalleParametro from '../components/layout/detalleParametro';
import SelectTambo from '../components/layout/selectTambo';
import { Button, DropdownButton, Dropdown } from 'react-bootstrap';
import { format } from 'date-fns';
import { addNotification } from '../redux/notificacionSlice';

const Parametros = () => {
  const [valor, setValor] = useState(0);
  const { firebase, setPorc, tamboSel } = useContext(FirebaseContext);
  const [selectedChange, setSelectedChange] = useState(null);
  const [isIncrease, setIsIncrease] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    if (tamboSel) {
      obtenerPorcentaje();
    }
  }, [tamboSel]);

  const obtenerPorcentaje = async () => {
    try {
      const snapshot = await firebase.db.collection('tambo').doc(tamboSel.id).get();
      snapshotParametros(snapshot);
    } catch (error) {
      console.log(error);
    }
  };

  function snapshotParametros(snapshot) {
    setValor(snapshot.data().porcentaje);
  }

  const handleApplyChange = async () => {
    if (selectedChange === null || !tamboSel) return;

    let nuevoPorcentaje = selectedChange;
    let porcentajeAnimal = 1 + nuevoPorcentaje / 100;

    if (nuevoPorcentaje > 100) nuevoPorcentaje = 100;
    if (nuevoPorcentaje < -50) nuevoPorcentaje = -50;

    let p = { porcentaje: nuevoPorcentaje };
    let pAnimal = { porcentaje: porcentajeAnimal };

    setPorc(nuevoPorcentaje);

    try {
      await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

      // Obtener la colección de animales
      const animalesSnapshot = await firebase.db.collection('animal').where('tamboId', '==', tamboSel.id).get();

      animalesSnapshot.forEach(async (doc) => {
        const animalData = doc.data();
        if (!animalData.fbaja && !animalData.mbaja) {
          await firebase.db.collection('animal').doc(doc.id).update(pAnimal);
        }
      });

      // Agregar notificación en Firestore
      await firebase.db.collection('tambo').doc(tamboSel.id).collection('notificaciones').add({
        mensaje: isIncrease ? `AUMENTO DEL ${selectedChange} %` : `REDUCCIÓN DEL ${selectedChange} %`,
        fecha: firebase.nowTimeStamp(),
      });

      // Agregar notificación en Redux
      dispatch(addNotification({
        id: Date.now(),
        mensaje: isIncrease ? `AUMENTO DEL ${selectedChange} %` : `REDUCCIÓN DEL ${selectedChange} %`,
        fecha: firebase.nowTimeStamp(),
      }));

      console.log(tamboSel);
    } catch (error) {
      console.log(error);
    }
    setValor(nuevoPorcentaje);
    setSelectedChange(null);
  };

  const restablecer = async () => {
    if (tamboSel) {
      setValor(0);
      let p = { porcentaje: 0 };  // Para la colección 'tambo'
      let pAnimal = { porcentaje: 1 };  // Para la colección 'animal'

      try {
        // Actualizar el porcentaje en la colección 'tambo'
        await firebase.db.collection('tambo').doc(tamboSel.id).update(p);

        // Obtener la colección de animales
        const animalesSnapshot = await firebase.db.collection('animal').where('tamboId', '==', tamboSel.id).get();

        animalesSnapshot.forEach(async (doc) => {
          const animalData = doc.data();
          if (!animalData.fbaja && !animalData.mbaja) {
            await firebase.db.collection('animal').doc(doc.id).update(pAnimal);
          }
        });

        // Agregar notificación en Firestore
        await firebase.db.collection('tambo').doc(tamboSel.id).collection('notificaciones').add({
          mensaje: 'SE VOLVIÓ AL VALOR ORIGINAL DE LA RACIÓN.',
          fecha: firebase.nowTimeStamp(),
        });

        // Agregar notificación en Redux
        dispatch(addNotification({
          id: Date.now(),
          mensaje: 'SE VOLVIÓ AL VALOR ORIGINAL DE LA RACIÓN.',
          fecha: firebase.nowTimeStamp(),
        }));

        console.log('se ejecutó y se agregó la notificación');
      } catch (error) {
        console.log(error);
      }
    }
  };

  let porcentaje;

  if (valor === 10) porcentaje = 1.1;
  else if (valor === 20) porcentaje = 1.2;
  else if (valor === 30) porcentaje = 1.3;
  else if (valor === 40) porcentaje = 1.4;
  else if (valor === 50) porcentaje = 1.5;
  else if (valor === 60) porcentaje = 1.6;
  else if (valor === 70) porcentaje = 1.7;
  else if (valor === 80) porcentaje = 1.8;
  else if (valor === 90) porcentaje = 1.9;
  else if (valor === 100) porcentaje = 2;
  else if (valor === -10) porcentaje = 0.9;
  else if (valor === -20) porcentaje = 0.8;
  else if (valor === -30) porcentaje = 0.7;
  else if (valor === -40) porcentaje = 0.6;
  else if (valor === -50) porcentaje = 0.5;
  else if (valor === 0) porcentaje = 1;

  return (
    <Layout titulo="Parámetros Nutricionales">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <h1 style={{ color: "#404040", fontWeight: "bold", fontSize: "34px", marginTop: 0 }}>ALIMENTACIÓN</h1>
        <div style={{ display: "flex", flexDirection: "row", gap: "7px" }}>
          <p style={{ color: "grey", fontWeight: "bold", fontSize: "18px", marginTop: 0 }}>ESTADO ACTUAL: </p>
          <p style={{ color: "#404040", fontWeight: "bold", fontSize: "18px" }}>
            {valor === 0 ? "POR DEFECTO" : null}
            {valor < 0 ? "REDUCCIÓN DEL " + valor + "%" : null}
            {valor > 0 ? "AUMENTO DEL " + valor + "%" : null}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
        <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
          <DropdownButton
            id="dropdown-reducir-button"
            title={isIncrease === false && selectedChange !== null ? `Reducción : ${selectedChange}%` : 'Seleccionar Reducción'}
            variant="danger"
            className='dropdown-reducir-button'
            onSelect={(e) => { setSelectedChange(parseInt(e)); setIsIncrease(false); }}
          >
            <Dropdown.Item eventKey="-10">-10%</Dropdown.Item>
            <Dropdown.Item eventKey="-20">-20%</Dropdown.Item>
            <Dropdown.Item eventKey="-30">-30%</Dropdown.Item>
            <Dropdown.Item eventKey="-40">-40%</Dropdown.Item>
            <Dropdown.Item eventKey="-50">-50%</Dropdown.Item>
          </DropdownButton>
          <Button
            style={{ fontWeight: "bold", borderRadius: "10px", width: "20%", height: "50px", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}
            variant="info"
            block
            className='botonRestablecer'
            onClick={restablecer}
          >Restablecer</Button>
          <DropdownButton
            id="dropdown-aumentar-button"
            title={isIncrease === true && selectedChange !== null ? `Aumento : ${selectedChange}%` : 'Seleccionar Aumento'}
            variant="success"
            className='dropdown-aumentar-button'
            onSelect={(e) => { setSelectedChange(parseInt(e)); setIsIncrease(true); }}
          >
            <Dropdown.Item eventKey="10">10%</Dropdown.Item>
            <Dropdown.Item eventKey="20">20%</Dropdown.Item>
            <Dropdown.Item eventKey="30">30%</Dropdown.Item>
            <Dropdown.Item eventKey="40">40%</Dropdown.Item>
            <Dropdown.Item eventKey="50">50%</Dropdown.Item>
            <Dropdown.Item eventKey="60">60%</Dropdown.Item>
            <Dropdown.Item eventKey="70">70%</Dropdown.Item>
            <Dropdown.Item eventKey="80">80%</Dropdown.Item>
            <Dropdown.Item eventKey="90">90%</Dropdown.Item>
            <Dropdown.Item eventKey="100">100%</Dropdown.Item>
          </DropdownButton>
        </div>
        {
          selectedChange !== null && (
            <Button
              style={{ fontWeight: "bold", borderRadius: "10px", width: "20%", height: "50px", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center" }}
              variant="primary"
              block
              className='botonAplicar'
              onClick={handleApplyChange}
            >Aplicar</Button>
          )
        }
      </div >
      {
        tamboSel ?
          <>
            < DetalleParametro
              idTambo={tamboSel.id}
              categoria="Vaquillona"
              porcentaje={porcentaje}
            />
            <DetalleParametro
              idTambo={tamboSel.id}
              categoria="Vaca"
              porcentaje={porcentaje}
            />
          </>
          :
          <SelectTambo />
      }
    </Layout >

  );
};

export default Parametros;