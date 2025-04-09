import React, { useState, useContext } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { GiFarmer, GiTrashCan } from 'react-icons/gi';
import { FiLogOut } from "react-icons/fi";
import { Button, Alert, OverlayTrigger, Tooltip, Modal, Form } from 'react-bootstrap';
import { useRouter } from 'next/router';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { InputGroup, FormControl } from 'react-bootstrap'
//// IMPORTACION DE BOTONES 
import MachosHembrasBoton from '../components/utils/MachosHembrasBoton';
import InformacionTambo from '../components/utils/ObtenerInfoTambo';
import { ObtenerAnimalesPerfilForm } from '../components/utils/obtenerAnimalesPerfil';

const UserProfile = () => {
  const { usuario, tamboSel, guardarTamboSel, firebase, app, auth } = useContext(FirebaseContext);
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, guardarError] = useState(false);
  const [descError, guardarDescError] = useState('');

  const [showChangePass, setShowChangePass] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  //// CONTRASEÑA 
  const handleCloseChangePass = () => {
    setShowChangePass(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
  
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
  
    try {
      // Verificar que `firebase` no es undefined
      if (!firebase || !firebase.auth) {
        setErrorMsg("Error: Firebase no está inicializado correctamente.");
        setLoading(false);
        return;
      }
  
      const user = firebase.auth.currentUser;
      if (!user) {
        setErrorMsg("No se encontró un usuario autenticado.");
        setLoading(false);
        return;
      }
  
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
  
      // Reautenticar al usuario
      await user.reauthenticateWithCredential(credential);
  
      // Actualizar la contraseña
      await user.updatePassword(newPassword);
  
      setSuccessMsg('¡Contraseña actualizada correctamente!');
    } catch (error) {
      setErrorMsg(error.message || 'Ocurrió un error al cambiar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  
  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  function cerrarSesion() {
    guardarTamboSel(null);
    firebase.logout();
    return router.push('/login');
  }

  async function eliminarTambo() {
    try {
      await firebase.db.collection('animal').where('idtambo', '==', id).get().then(snapshotAnimal);
      if (animales.length == 0) {
        await firebase.db.collection('tambo').doc(id).delete();
        handleClose();
      } else {
        guardarDescError("No se puede eliminar el tambo, tiene animales asociados");
        guardarError(true);
      }
    } catch (error) {
      guardarDescError(error.message);
      guardarError(true);
    }
  }

  return (
    <Layout titulo="Mi Farmerin">
      <div className="farmerin-card-container">
        <div className="farmerin-card">
          {usuario ? (
            <div className="farmerin-card-infos">
              <div className="farmerin-card-image" style={{ marginRight: '15px' }}>
                <GiFarmer size={50} />
              </div>
              <div className="farmerin-card-info">
                <h5 className="farmerin-card-name">{usuario ? usuario.displayName : 'Invitado'}</h5>
                <p className="farmerin-card-tambo">{tamboSel ? tamboSel.nombre : 'No seleccionado'}</p>
              </div>
            </div>
          ) : (
            <Alert variant="warning">No hay información de usuario disponible.</Alert>
          )}
        </div>

        <div className="farmerin-card-actions">
          <InformacionTambo tambo={tamboSel} fetch={fetch} />
          <ObtenerAnimalesPerfilForm />
        </div>
      </div>

      {/* Botón de Configuración */}
      <div className="config-perfil-container">
        <button className="button-perfil" onClick={() => setShowConfigMenu(!showConfigMenu)}>
          <svg className="svg-icon-perfil" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="2" />
            <path d="M19 12h3m-3 0a7 7 0 0 0-14 0m14 0a7 7 0 0 1-14 0m-3 0h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="label-perfil">Opciones de usuario</span>
        </button>

        {showConfigMenu && (
          <div className="card-perfil">
            <ul className="list-perfil">
              <li className="element-perfil element-danger-perfil" onClick={() => { handleShow(); setShowConfigMenu(false); }}>
                <svg className="icon-perfil" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f05454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-7 6v6m4-6v6" />
                </svg>
                <p className="label-perfil">Borrar Tambo</p>
              </li>
              <li className="element-perfil element-logout-perfil" onClick={() => { cerrarSesion(); setShowConfigMenu(false); }}>
                <svg className="icon-perfil" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7e8590" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <p className="label-perfil">Cerrar Sesión</p>
              </li>
            </ul>
          </div>
        )}
      </div>

 
      {/* Modal para cambiar contraseña */}
      <Modal show={showChangePass} onHide={handleCloseChangePass} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cambiar Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}
          {successMsg && <Alert variant="success">{successMsg}</Alert>}
          <Form>
            {/* Contraseña actual */}
            <Form.Group>
              <Form.Label>Contraseña actual</Form.Label>
              <InputGroup>
                <FormControl
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <InputGroup.Text onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ cursor: "pointer" }}>
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            {/* Nueva contraseña */}
            <Form.Group>
              <Form.Label>Nueva contraseña</Form.Label>
              <InputGroup>
                <FormControl
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <InputGroup.Text onClick={() => setShowNewPassword(!showNewPassword)} style={{ cursor: "pointer" }}>
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            {/* Confirmar nueva contraseña */}
            <Form.Group>
              <Form.Label>Confirmar nueva contraseña</Form.Label>
              <InputGroup>
                <FormControl
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
                <InputGroup.Text onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={{ cursor: "pointer" }}>
                  {showConfirmNewPassword ? <FiEyeOff /> : <FiEye />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseChangePass}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleChangePassword} disabled={loading}>
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para eliminar el tambo */}
      <Modal className="warning-borrar-generala" show={show} onHide={handleClose} dialogClassName="modal-dialog-centered">
        <Modal.Body>
          <div className="warning-borrar-general">
            <div className="confirmBorrar-div">
              <p>
                <strong>¿Estás seguro de querer eliminar este {tamboSel ? tamboSel.nombre : 'No seleccionado'}?</strong>
                <span>No podrás recuperar la información del tambo una vez eliminado</span>
              </p>
              <div className="modal-borrar-container">
                <button className="red-btn-borrar" onClick={handleClose}>No, cancelar</button>
                <button className="green-btn-borrar" onClick={eliminarTambo}>Borrar {tamboSel ? tamboSel.nombre : 'No seleccionado'}</button>
              </div>
            </div>
          </div>
          <Alert variant="danger" show={error}>
            <Alert.Heading>Oops! Se ha producido un error!</Alert.Heading>
            <p>{descError}</p>
          </Alert>
        </Modal.Body>
      </Modal>
    </Layout>
  );


};

export default UserProfile;         