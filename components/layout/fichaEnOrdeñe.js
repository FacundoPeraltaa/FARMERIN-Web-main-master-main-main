import React, { useContext, useEffect, useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';



const AnimalesEnOrdeñe = ({ show, setShow }) => {
    const [cantidad, setCantidad] = useState(0);
    const { firebase, tamboSel } = useContext(FirebaseContext);

    const handleClose = () => { setShow(false) };


    useEffect(() => {
        const obtenerAnimalesEnOrdeñe = async () => {
            try {
                const snapshot = await firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('estpro', '==', 'En Ordeñe').where('mbaja', '==', '').get();
                setCantidad(snapshot.size); // Contar cuántos documentos hay
            } catch (error) {
                console.log(error.message);
            }
        };

        obtenerAnimalesEnOrdeñe();
    }, [firebase]);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton style={{ backgroundColor: '#003366', color: 'white', textAlign: 'center' }}>
                <Modal.Title>Animales en Ordeñe</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                {cantidad === 0 ? (
                    <Alert variant="danger" className="text-uppercase">NO HAY ANIMALES EN ORDEÑE.</Alert>
                ) : (
                    <p className="lead">HAY <span style={{ fontWeight: 'bold', color: '#000', margin:'4px' }}>{cantidad}</span> ANIMALES EN ORDEÑE.</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="success" onClick={handleClose}>
                    Cerrar
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default AnimalesEnOrdeñe;
