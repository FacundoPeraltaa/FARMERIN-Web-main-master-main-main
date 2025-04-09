import React, { useState, useContext } from "react";
import { FirebaseContext } from "../firebase2";
import Layout from '../components/layout/layout';
const ListaAnimales = () => {
  const { firebase } = useContext(FirebaseContext);
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [contador, setContador] = useState(0); // Nuevo estado para el contador

  // Función para obtener animales con `estpro: "Vq.p/servicio"`
  const obtenerAnimalesPorEstado = async () => {
    setCargando(true);
    try {
      const querySnapshot = await firebase.db.collection("animal")
        .where('idtambo', '==', 'PgIQZisE8chKEODVk72E')
        .where("estpro", "==", "Vq.p/servicio")
        .get();

      const listaAnimales = [];
      querySnapshot.forEach((doc) => {
        listaAnimales.push({ id: doc.id, ...doc.data() });
      });

      setAnimales(listaAnimales);
      setContador(listaAnimales.length); // Actualizar el contador
      console.log("Animales obtenidos:", listaAnimales);
    } catch (error) {
      console.error("Error al obtener los animales:", error);
      alert("Ocurrió un error al obtener los animales.");
    } finally {
      setCargando(false);
    }
  };

  // Función para cambiar el estado de los animales a "seca"
  const cambiarEstadoAseca = async () => {
    setCargando(true);
    try {
      for (const animal of animales) {
        await firebase.db.collection("animal").doc(animal.id).update({
          estpro: "seca",
        });
      }
      alert("Estado de los animales cambiado a 'seca'.");
      setAnimales([]); // Limpiar la lista después del cambio
      setContador(0); // Resetear el contador
    } catch (error) {
      console.error("Error al cambiar el estado:", error);
      alert("Ocurrió un error al cambiar el estado de los animales.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Layout titulo='Cambio a Vaq.p/Servicio a Seca'>
    <div className="containerCambioAseca">
      {/* Botón para obtener animales */}
      <button
        onClick={obtenerAnimalesPorEstado}
        disabled={cargando}
        className="buttonCambioAseca"
      >
        {cargando ? "Cargando..." : "Obtener Animales"}
      </button>

      {/* Contador de animales obtenidos */}
      {contador > 0 && (
        <p className="contadorCambioAseca">
          Animales obtenidos: <strong>{contador}</strong>
        </p>
      )}

      {/* Nuevo botón para cambiar el estado a "seca" */}
      {animales.length > 0 && (
        <button
          onClick={cambiarEstadoAseca}
          disabled={cargando}
          className="buttonCambioAseca"
        >
          {cargando ? "Cambiando..." : "Cambiar Estado a Seca"}
        </button>
      )}

      {/* Lista de animales */}
      {animales.length > 0 ? (
        <div className="listContainerCambioAseca">
          {animales.map((item) => (
            <div key={item.id} className="itemCambioAseca">
              <p className="textoCambioAseca">
                <span className="labelCambioAseca">ID:</span> {item.erp}
              </p>
              <p className="textoCambioAseca">
                <span className="labelCambioAseca">Nombre:</span> {item.rp || "Sin nombre"}
              </p>
              <p className="textoCambioAseca">
                <span className="labelCambioAseca">Estado:</span> {item.estpro}
              </p>
            </div>
          ))}
        </div>
      ) : !cargando && (
        <p className="noAnimalesCambioAseca">No hay animales con ese estado.</p>
      )}
    </div>
    </Layout>
  );
};

export default ListaAnimales;
