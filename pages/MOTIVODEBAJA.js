import React, { useState, useContext } from "react";
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';

const MiComponente = () => {
  const [animales, setAnimales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const { firebase, tamboSel } = useContext(FirebaseContext);

  // Función para obtener todos los animales del tambo seleccionado
  const obtenerAnimales = async () => {
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await firebase.db.collection('animal')
        .where('idtambo', '==', tamboSel.id)
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      setAnimales(listaAnimales);
    } catch (error) {
      console.error("Error obteniendo animales:", error);
      setError("Error obteniendo animales. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Función para limpiar la colección 'eventos' y agregar nuevos eventos
  const actualizarEventos = async () => {
    if (animales.length === 0) {
      alert("No hay animales para actualizar.");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const batch = firebase.db.batch();

      for (const animal of animales) {
        const eventosRef = firebase.db.collection('animal').doc(animal.id).collection('eventos');
        
        // 1️⃣ Eliminar todos los documentos existentes en 'eventos'
        const eventosSnapshot = await eventosRef.get();
        eventosSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        // 2️⃣ Agregar un nuevo evento para cada animal
        const nuevoEvento = {
          fecha: new Date(),
          descripcion: "Evento agregado automáticamente",
          tipo: "actualizacion",
        };

        const nuevoEventoRef = eventosRef.doc(); // Creamos un ID automático
        batch.set(nuevoEventoRef, nuevoEvento);
      }

      await batch.commit();
      alert("Eventos actualizados correctamente.");
    } catch (error) {
      console.error("Error actualizando eventos:", error);
      setError("Error actualizando eventos. Intenta nuevamente.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Layout titulo="Herramientas">
      <div>
        <button onClick={obtenerAnimales} disabled={loading}>
          {loading ? "Cargando..." : "Obtener Animales"}
        </button>
        <button onClick={actualizarEventos} disabled={updating || animales.length === 0}>
          {updating ? "Actualizando..." : "Actualizar Eventos"}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <ul>
          {animales.length === 0 && !loading && <li>No se encontraron animales.</li>}
          {animales.map((animal) => (
            <li key={animal.id}>
              Nombre: {animal.rp}, ID: {animal.erp}, mbaja: {animal.mbaja || 'N/A'}, fbaja: {animal.fbaja || 'N/A'}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
};

export default MiComponente;
