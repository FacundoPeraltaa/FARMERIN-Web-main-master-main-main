import React, { useState } from 'react';
import { FirebaseContext } from '../firebase2';
import { useContext } from 'react';
import Layout from '../components/layout/layout';
import firebase from 'firebase/app';
import 'firebase/firestore';

function BotonAgregar() {
    const { firebase } = useContext(FirebaseContext);
    const [mensaje, setMensaje] = useState('');

    const agregarCampo = async () => {
        try {
            const docRef = await firebase.db.collection("animal").where("idtambo", "==", "jGWqeJjPAW3yJtAZpKJr").get();
            const batch = firebase.db.batch();

            docRef.docs.forEach(doc => {
                const docRef = firebase.db.collection("animal").doc(doc.id);
                batch.update(docRef, { racionmodificada: 1 }); // NOMBRE DEL CAMPO QUE SE QUIERE AGREGAR
            });

            await batch.commit();
            setMensaje("Campo 'raumentada' añadido a todos los documentos.");
        } catch (e) {
            setMensaje(`Error al añadir el campo: ${e.message}`);
        }
    };

    const eliminarCampos = async () => {
        try {
            const docRef = await firebase.db.collection("animal").where("idtambo", "==", "jGWqeJjPAW3yJtAZpKJr").get();
            const batch = firebase.db.batch();

            docRef.docs.forEach(doc => {
                const docRef = firebase.db.collection("animal").doc(doc.id);
                batch.update(docRef, { 
                    raumentada: firebase.firestore.FieldValue.delete(), 
                    rdisminuida: firebase.firestore.FieldValue.delete() 
                });
            });

            await batch.commit();
            setMensaje("Campos 'raumentada' y 'rdisminuida' eliminados de todos los documentos.");
        } catch (e) {
            setMensaje(`Error al eliminar los campos: ${e.message}`);
        }
    };

    return (
        <Layout>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
                <button onClick={agregarCampo}>
                    Agregar Campo
                </button>
                <button onClick={eliminarCampos}>
                    Eliminar Campos
                </button>
                {mensaje && <p>{mensaje}</p>}
            </div>
        </Layout>
    );
}

export default BotonAgregar;
