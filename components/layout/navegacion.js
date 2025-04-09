import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AiOutlineBars, } from 'react-icons/ai';
import { IoIosNotificationsOutline } from 'react-icons/io';
import { Button } from 'react-bootstrap';
import Switch from 'react-switch';
import { FirebaseContext } from '../../firebase2';
import { Badge, Modal, Alert } from 'react-bootstrap';
import { ContenedorAlertas } from '../ui/Elementos';
import { useDispatch, useSelector } from "react-redux";
import { updateValor } from '../../redux/valorSlice';


const Navegacion = ({ collapsed, toggled, handleToggleSidebar, handleCollapsedChange, titulo }) => {
    const { usuario, firebase, guardarTamboSel, tambos, tamboSel, porc } = useContext(FirebaseContext);
    const router = useRouter();
    const [show, setShow] = useState(false);
    const [showHistorial, setShowHistorial] = useState(false);
    const [alertas, guardarAlertas] = useState([]);
    const [historial, guardarHistorial] = useState([]);
    const [alertasSinLeer, guardarAlertasSinLeer] = useState([]);
    const [error, guardarError] = useState(false);
    const [ultimoCambio, setUltimoCambio] = useState(null); // Estado para el último cambio
    let variante = "warning";
    const [showPerfil, setShowPerfil] = useState(false); // Estado para el modal de perfil

    const dispatch = useDispatch();
    const valor = useSelector((state) => state.valor);

    useEffect(() => {
        if (porc !== undefined) {
            dispatch(updateValor(porc));
        }
    }, [porc, dispatch]);

    useEffect(() => {
        if (tamboSel && tamboSel.porcentaje !== undefined) {
            dispatch(updateValor(tamboSel.porcentaje));
        }
    }, [tamboSel, dispatch]);

    useEffect(() => {
        tambos && obtenerAlertas();
    }, [tambos]);

    useEffect(() => {
        if (tamboSel) {
            obtenerUltimoCambio(); // Obtener el último cambio cada vez que tamboSel cambie
            obtenerHistorial(); // Obtener el historial cuando tamboSel cambie
        }
    }, [tamboSel]);

    async function vista(a) {
        const valores = {
            idtambo: a.idtambo,
            fecha: a.fecha,
            mensaje: a.mensaje,
            visto: true
        };
        try {
            await firebase.db.collection('alerta').doc(a.id).update(valores);
        } catch (error) {
            console.log(error);
        }
    }

    const handleClose = () => setShow(false);
    const handleShow = () => {
        alertasSinLeer.forEach(a => {
            vista(a);
        });
        setShow(true);
        guardarAlertasSinLeer([]);
    };

    const handleHistorialClose = () => setShowHistorial(false);
    const handleHistorialShow = () => {
        setShowHistorial(true);
    };

    const handlePerfilClose = () => setShowPerfil(false);
    const handlePerfilShow = () => {
        setShowPerfil(true);
    };

    function cerrarSesion() {
        guardarTamboSel(null);
        firebase.logout();
        return router.push('/login');
    }

    async function obtenerAlertas(idtambo) {
        const tambosArray = tambos.map(t => t.id);
        try {
            await firebase.db.collection('alerta').where('idtambo', 'in', tambosArray).orderBy('fecha', 'desc').get().then(snapshotAlerta);
        } catch (error) {
            console.log(error);
            guardarError(true);
        }
    }

    function snapshotAlerta(snapshot) {
        const alertasTambos = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        guardarAlertas(alertasTambos);
        const alertasSinVer = alertasTambos.filter(a => !a.visto);
        guardarAlertasSinLeer(alertasSinVer);
        if (alertasSinVer.length > 0) variante = "danger";
    }

    async function obtenerHistorial() {
        if (!tamboSel) return;
        try {
            const snapshot = await firebase.db.collection('tambo')
                .doc(tamboSel.id)
                .collection('notificaciones')
                .orderBy('fecha', 'desc') // Ordenar por fecha en orden descendente
                .get();

            const historialData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            guardarHistorial(historialData);
        } catch (error) {
            console.log(error);
        }
    }

    async function obtenerUltimoCambio() {
        if (!tamboSel) return;
        try {
            const snapshot = await firebase.db.collection('tambo')
                .doc(tamboSel.id)
                .collection('notificaciones')
                .orderBy('fecha', 'desc')
                .limit(1)
                .get();
            const ultimoCambioDoc = snapshot.docs[0];
            if (ultimoCambioDoc) {
                const ultimoCambioData = {
                    id: ultimoCambioDoc.id,
                    ...ultimoCambioDoc.data()
                };
                setUltimoCambio(ultimoCambioData);
                guardarAlertasSinLeer([ultimoCambioData]); // Mostrar solo el último cambio en el modal de alertas
            }
        } catch (error) {
            console.log(error);
        }
    }

    function formatFecha(fecha) {
        if (fecha instanceof Date) {
            return fecha.toLocaleDateString(); // Solo fecha sin hora
        } else if (fecha && fecha.toDate) {
            // Caso para Firestore Timestamp
            return fecha.toDate().toLocaleDateString(); // Solo fecha sin hora
        } else if (typeof fecha === 'string') {
            // Caso para fecha en formato de cadena
            return new Date(fecha).toLocaleDateString(); // Solo fecha sin hora
        } else {
            // Caso por defecto si no es un formato esperado
            return 'Fecha desconocida';
        }
    }

    return (
        <header>
            <div className="elem-header">
                <div className="block">
                    <Switch
                        height={16}
                        width={30}
                        checkedIcon={false}
                        uncheckedIcon={false}
                        onChange={handleCollapsedChange}
                        checked={collapsed}
                        onColor="#219de9"
                        offColor="#bbbbbb"
                    />
                </div>

                <div className='hambur' onClick={() => handleToggleSidebar(true)}>
                    <AiOutlineBars size={40} />
                </div>
                <div className='responsive'>
                    <h5>{titulo} {tamboSel && ' - ' + tamboSel.nombre} </h5>
                </div>

                <div className="elem-header-der" >
                    {usuario &&
                        <>
                            <div className="alert-container">
                                <Button
                                    variant="link"
                                    onClick={handleShow}
                                >
                                    <IoIosNotificationsOutline size={32} />
                                    {alertasSinLeer &&
                                        <Badge
                                            variant={variante}
                                        >
                                            {alertasSinLeer.length}
                                        </Badge>
                                    }
                                </Button>
                            </div>
                        </>
                    }
                </div>
            </div>

            <Modal size="lg" show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <p>Alertas</p>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>

                    {ultimoCambio ? (
                        <div className="historial-container">
                            <ContenedorAlertas>
                                <div className="historial-item" key={ultimoCambio.id}>
                                    <div className="historial-fecha">{formatFecha(ultimoCambio.fecha)}:</div> {ultimoCambio.mensaje}
                                </div>
                            </ContenedorAlertas>
                        </div>
                    ) : (
                        <Alert variant="warning">No se registran alertas</Alert>
                    )}
                    <Button
                        variant="info"
                        onClick={handleHistorialShow}
                        style={{ marginTop: '10px', backgroundColor: '#1b8aa5' }} // Cambiado a color #1b8aa5
                        className="boton-historial"
                    >
                        Ver historial de cambios
                    </Button>
                </Modal.Body>
            </Modal>

            <Modal size="lg" show={showHistorial} onHide={handleHistorialClose}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Historial de cambios
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="historial-container">
                        {historial.length > 0 ? historial.map((cambio) => (
                            <div key={cambio.id} className="historial-item">
                                <div className="historial-fecha">{formatFecha(cambio.fecha)}</div>
                                <div className="historial-mensaje">{cambio.mensaje}</div>
                            </div>
                        )) : (
                            <Alert variant="info">No hay cambios registrados.</Alert>
                        )}
                    </div>
                </Modal.Body>
            </Modal>
        </header>
    );
};

export default Navegacion;