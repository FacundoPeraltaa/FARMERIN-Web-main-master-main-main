import React, { useContext, useState } from 'react';
import { FirebaseContext } from '../../firebase2';
import { AiFillAlert } from 'react-icons/ai';
import { GiCow, GiInfo } from 'react-icons/gi';

const Modal = ({ show, onClose, title, children }) => {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{title}</h2>
                <div>{children}</div>
                <button className="close-modal-button" onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export const ObtenerAnimalesPerfilForm = () => {
    const { firebase, tamboSel } = useContext(FirebaseContext);
    const [vacas, setVacas] = useState(0);
    const [vacasEnOrdeñe, setVacasEnOrdeñe] = useState(0);
    const [vacasSecas, setVacasSecas] = useState(0);
    const [vaquillonas, setVaquillonas] = useState(0);
    const [vaquillonasEnOrdeñe, setVaquillonasEnOrdeñe] = useState(0);
    const [vaquillonasSecas, setVaquillonasSecas] = useState(0);
    const [vaquillonasServicio, setVaquillonasServicio] = useState(0);
    const [crias, setCrias] = useState(0);
    const [mostrarLista, setMostrarLista] = useState(false);
    const [showVacasModal, setShowVacasModal] = useState(false);
    const [showVaquillonasModal, setShowVaquillonasModal] = useState(false);
 

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tamboSel) return;

        try {
            const vacasSnapshot = await firebase.db
                .collection('animal')
                .where('idtambo', '==', tamboSel.id)
                .where('mbaja', '==', '')
                .where('categoria', '==', 'Vaca')
                .get();
            const vacasData = vacasSnapshot.docs.map((doc) => doc.data());
            setVacas(vacasData.length);
            setVacasEnOrdeñe(vacasData.filter((vaca) => vaca.estpro === 'En Ordeñe').length);
            setVacasSecas(vacasData.filter((vaca) => vaca.estpro === 'seca').length);

            const vaquillonasSnapshot = await firebase.db
            .collection('animal')
            .where('idtambo', '==', tamboSel.id)
            .where('categoria', '==', 'Vaquillona')
            .where('mbaja', '==', '')
            .get();
            const vaquillonasData = vaquillonasSnapshot.docs.map((doc) => doc.data());
            console.log('VAQUILLONAS',vaquillonasData);            
            setVaquillonas(vaquillonasData.length);
            setVaquillonasEnOrdeñe(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'En Ordeñe').length);
            setVaquillonasSecas(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'seca').length);
            setCrias(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'cria').length);

        
        } catch (error) {
            console.log(error);
        }

        setMostrarLista(true);
    };

 
    return (
        <div className="card-fondoBotones">
            <form className="animales-form" onSubmit={handleSubmit}>
                <button className="obtener-animales-button" style={{ '--clr': '#00ad54' }} type="submit">
                    <span className="obtener-animales-button-decor"></span>
                    <div className="obtener-animales-button-content">
                        <div className="obtener-animales-button__icon">
                            <GiCow size={24} style={{ color: '#fff' }} />
                        </div>
                        <span className="obtener-animales-button__text">Obtener Animales</span>
                    </div>
                </button>
                {mostrarLista && (
                    <div className="animales-list-container">
                        <h1 className="tituloAnimales">
                            Total de Animales: {vacas + vaquillonas} 
                            <span className="AdverPerfil">
                                <div className="tooltip-container">
                                    <div className="icon-tooltip">
                                        <GiInfo size={20} />
                                    </div>
                                    <div className="tooltip" style={{ fontSize: '18px' }}>
                                        <p>Advertencia: El número final de animales incluye únicamente Vacas y Vaquillonas; las Crías no están contempladas</p>
                                    </div>
                                </div>
                            </span>
                        </h1>
                        {/* Mover el bloque de botones aquí */}
                        <button className="listasAnimalesVacas-button" onClick={() => setShowVacasModal(true)}>
                            <div className="svg-wrapper-1">
                                <div className="svg-wrapper">
                                    <svg
                                        height="24"
                                        width="24"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path
                                            d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                                            fill="currentColor"
                                        ></path>
                                    </svg>
                                </div>
                            </div>
                            <span>Lista de Vacas</span>
                        </button>
                        <button className="listasAnimalesVaquillonas-button" onClick={() => setShowVaquillonasModal(true)}>
                            <div className="svg-wrapper-1">
                                <div className="svg-wrapper">
                                    <svg
                                        height="24"
                                        width="24"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M0 0h24v24H0z" fill="none"></path>
                                        <path
                                            d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                                            fill="currentColor"
                                        ></path>
                                    </svg>
                                </div>
                            </div>
                            <span>Lista de Vaquillonas</span>
                        </button>
                        <button className="listasAnimalesCerrar-button" onClick={() => setMostrarLista(false)}>
                            <span>Cerrar Listas</span>
                        </button>
                    </div>
                )}
            </form>

          <Modal show={showVacasModal} onClose={() => setShowVacasModal(false)} title="Lista de Vacas">
            <div className="listaPerfil">
             
             <p>Vacas: {vacas}</p>
             <p>Vacas en Ordeñe: {vacasEnOrdeñe}</p>
             <p>Vacas Secas: {vacasSecas}</p>
            </div>
           </Modal>

          <Modal show={showVaquillonasModal} onClose={() => setShowVaquillonasModal(false)} title="Lista de Vaquillonas">
            <div className="listaPerfil">
             
             <p>Vaquillonas: {vaquillonas}</p>
             <p>Vaquillonas en Ordeñe: {vaquillonasEnOrdeñe}</p>
             <p>Vaquillonas Secas: {vaquillonasSecas}</p>
             <p>Crias: {crias}</p>               
            </div>
           </Modal>
        </div>
    );
};
