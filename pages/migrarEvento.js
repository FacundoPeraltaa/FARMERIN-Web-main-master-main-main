import React, { useState, useEffect, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import Layout from "../components/layout/layout";

function EventoMigracion() {
  const { firebase, tamboSel } = useContext(FirebaseContext);
  const [animalesConEvento, setAnimalesConEvento] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [migrando, setMigrando] = useState(false);

  useEffect(() => {
    async function obtenerAnimalesConEvento() {
      setCargando(true);

      try {
        // 1️⃣ Obtener los animales filtrados por "idtambo"
        const animalesSnapshot = await firebase.db.collection("animal")
          .where("idtambo", "==", tamboSel.id)
          .get();

        const animalesLista = animalesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 2️⃣ Filtrar solo los que tienen la subcolección "evento"
        const animalesConEvento = [];

        for (const animal of animalesLista) {
          const eventoSnapshot = await firebase.db.collection("animal")
            .doc(animal.id)
            .collection("evento")
            .get(); // Verificamos la existencia de la subcolección "evento"

          if (!eventoSnapshot.empty) {
            // Si tiene eventos, los agregamos
            animalesConEvento.push({
              id: animal.id,
              rp: animal.rp || "Sin RP", // Mostramos RP
              erp: animal.erp || "Sin ERP", // Mostramos ERP
              eventos: eventoSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })),
            });
          }
        }

        setAnimalesConEvento(animalesConEvento);
      } catch (error) {
        console.error("Error obteniendo animales con evento:", error);
      }

      setCargando(false);
    }

    obtenerAnimalesConEvento();
  }, [firebase, tamboSel]);

  async function migrarEventos() {
    if (animalesConEvento.length === 0) return;

    setMigrando(true);
    const batch = firebase.db.batch();

    animalesConEvento.forEach((animal) => {
      animal.eventos.forEach((evento) => {
        const { id, ...data } = evento;

        const eventoRef = firebase.db.collection("animal")
          .doc(animal.id)
          .collection("eventos") // Migramos a "eventos" (no "evento")
          .doc(id);

        batch.set(eventoRef, data);
        batch.delete(firebase.db.collection("animal").doc(animal.id).collection("evento").doc(id));
      });
    });

    try {
      await batch.commit();
      alert("Migración completada.");
      setAnimalesConEvento([]);
    } catch (error) {
      console.error("Error en la migración:", error);
    }

    setMigrando(false);
  }

  return (
    <Layout titulo="Migrar Evento">
      <div>
        <h2>Migración de Eventos</h2>
        {cargando ? (
          <p>Cargando animales con subcolección "evento"...</p>
        ) : animalesConEvento.length === 0 ? (
          <p style={{color:"red", fontSize:"300PX"}}>No hay animales con la subcolección "evento".</p>
        ) : (
          <>
            <ul>
              {animalesConEvento.map((animal) => (
                <li key={animal.id}>
                  <strong>Animal ID:</strong> {animal.id} <br />
                  <strong>RP:</strong> {animal.rp} <br />
                  <strong>ERP:</strong> {animal.erp} <br />
                  <strong>Eventos:</strong>
                  <ul>
                    {animal.eventos.map((evento) => (
                      <li key={evento.id}>
                        <strong>ID Evento:</strong> {evento.id} -{" "}
                        <strong>Tipo:</strong> {evento.tipo || "Sin tipo"} -{" "}
                        <strong>Fecha:</strong> {evento.fecha 
                          ? new Date(evento.fecha.seconds * 1000).toLocaleDateString() 
                          : "Sin fecha"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <button onClick={migrarEventos} disabled={migrando}>
              {migrando ? "Migrando..." : "Migrar Eventos"}
            </button>
          </>
        )}
      </div>
    </Layout>
  );
}

export default EventoMigracion;
