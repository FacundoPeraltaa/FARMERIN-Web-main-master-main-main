import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import GraficoMachoHembra from '../../pages/MachosHembrasGrafico';
import { GiCrafting } from 'react-icons/gi';

const MachosHembrasBoton = () => {
    const [show, setShow] = useState(false);

    return (
        <>
            <button 
                className="obtener-animales-button" 
                onClick={() => setShow(true)}
                style={{ '--clr': '#00ad54' }}
            >
                <span className="obtener-animales-button-decor"></span>
                <div className="obtener-animales-button-content">
                    <div className="obtener-animales-button__icon">
                        <GiCrafting size={24} style={{ color: '#fff' }} />
                    </div>
                    <span className="obtener-animales-button__text">Ver Gráfico Machos/Hembras</span>
                </div>
            </button>
            <Modal show={show} onHide={() => setShow(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Distribución Machos/Hembras</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <GraficoMachoHembra />
                </Modal.Body>
            </Modal>
        </>
    );
};

export default MachosHembrasBoton;
