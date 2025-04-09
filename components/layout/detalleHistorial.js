import React from 'react';
import { Button, Card } from 'react-bootstrap';

const DetalleHistorial = ({ historial = {}, onHistorialClick }) => {
    // Si historial es undefined o no tiene 'descripcion', se muestra un valor por defecto
    const descripcion = historial.descripcion || 'Descripción no disponible';
    const fecha = historial.fecha ? new Date(historial.fecha).toLocaleString('es-AR') : 'Fecha no disponible';
    const animal = historial.animal || 'Animal no disponible';

    return (
        <Card className="mb-3">
            <Card.Body>
                <Card.Title>{descripcion}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">{fecha}</Card.Subtitle>
                <Button variant="primary" onClick={() => onHistorialClick(animal)}>
                    Ver Ficha del Animal
                </Button>
            </Card.Body>
        </Card>
    );
};

export default DetalleHistorial;
