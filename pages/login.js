import React, { useState, useEffect } from 'react';
import LayoutLogin from '../components/layout/layoutLogin';
import Router from 'next/router';
import CrearCuenta from './crear-cuenta';
//formato del formulario
import { Contenedor, ContenedorPoliticas, ContenedorLogin, ContenedorSpinner, ContenedorPass } from '../components/ui/Elementos';
import { Form, Button, Alert, Spinner, Row, Container, Col, Image, Modal } from 'react-bootstrap';
import firebase from '../firebase2'
import { IoMdEyeOff, IoMdEye } from 'react-icons/io';

//hook de validacion de formualarios
import useValidacion from '../hook/useValidacion';
//importo las reglas de validacion para crear cuenta
import validarIniciarSesion from '../validacion/validarIniciarSesion';

//State inicial para el hook de validacion (inicializo vacío)
const STATE_INICIAL = {
  email: '',
  password: ''
}

const Login = () => {
  const [procesando, guardarProcesando] = useState(false);
  const [error, guardarError] = useState(false);

  const { valores, errores, handleSubmit, handleChange, handleBlur } = useValidacion(STATE_INICIAL, validarIniciarSesion, iniciarSesion);

  const { email, password } = valores;

  const [showPass, setShowPass] = useState(false);
  const [show, setShow] = useState(false);
  const [showPoliticas, setShowPoliticas] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailToReset, setEmailToReset] = useState("");
  const [alert, setAlert] = useState({ show: false, title: '', message: '', color: '#DD6B55' });
  const [showAlert, setShowAlert] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleClosePoliticas = () => setShowPoliticas(false);
  const handleShowPoliticas = () => setShowPoliticas(true);

  const handleCloseForgotPassword = () => setShowForgotPassword(false);
  const handleShowForgotPassword = () => setShowForgotPassword(true);

  const handleChangeEmail = (e) => {
    setEmailToReset(e.target.value);
  };

  async function iniciarSesion() {
    guardarProcesando(true);
    setShowLoader(true);
    try {
      await firebase.login(email, password);
      await Router.push('/');
    } catch (error) {
      console.error('Hubo un error:', error.message);
      guardarError('Correo o contraseña incorrectos. Inténtalo nuevamente.');
    } finally {
      guardarProcesando(false);
      setShowLoader(false);
    }
  }
  
  // Mostrar el mensaje de error en el formulario
  {error && <Alert variant="danger">{error}</Alert>}
  

  const forgotPassword = async () => {
    guardarProcesando(true);
    try {
      await firebase.auth.sendPasswordResetEmail(emailToReset);
      setAlert({
        show: true,
        title: '¡ATENCIÓN!',
        message: "TE HEMOS ENVIADO UN MAIL PARA RESTABLECER TU CONTRASEÑA, SI NO LO HAS RECIBIDO REVISA EN SPAM",
        color: '#399dad'
      });
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setAlert({
        show: true,
        title: '¡ATENCIÓN!',
        message: "EL CORREO INGRESADO NO SE ENCUENTRA REGISTRADO EN FARMERIN",
        color: 'red'
      });
    } finally {
      guardarProcesando(false);
    }
    setShowAlert(true);
  };

  useEffect(() => {
    const handleRouteChangeComplete = () => {
        setShowLoader(false);
    };

    Router.events.on('routeChangeComplete', handleRouteChangeComplete);
    return () => {
        Router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, []);

  return (
    <div className="wrapperLoginFarmerin">
      {showLoader ? (
        <div className="loaderContainer">
          <div className="loader">
            <div className="load"></div>
            <div className="loader-text">Cargando datos de Farmerin...</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="formLoginFarmerin">
          <h1 className="titleLoginFarmerin">Ingresar a Farmerin</h1>
          <div className="inpLoginFarmerin">
            <Form.Control
              type="email"
              id="email"
              placeholder="Correo electrónico"
              name="email"
              value={email}
              onChange={handleChange}
              required
              className="input"
            />
            <i className="fa-solid fa-user"></i>
          </div>
          {errores.email && <Alert variant="danger">{errores.email}</Alert>}
          
          <div className="inpLoginFarmerin" style={{ display: 'flex', alignItems: 'center' }}>
            <Form.Control
              type={showPass ? 'text' : 'password'}
              id="password"
              placeholder="Contraseña"
              name="password"
              value={password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
              className="input"
              style={{ flex: 1 }}
            />
            <Button
              variant="light"
              onClick={() => setShowPass(!showPass)}
              size='sm'
              style={{ marginLeft: '8px' }}
            >
              {showPass ? <IoMdEyeOff size={20} /> : <IoMdEye size={20} />}
            </Button>
            <i className="fa-solid fa-lock"></i>
          </div>
          {errores.password && <Alert variant="danger">{errores.password}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          
          <button type="submit" className="submitLoginFarmerin">
            Iniciar sesión
          </button>
          <p className="footerLoginFarmerin">
            ¿Olvidaste tu contraseña?{" "}
            <Button variant="link" onClick={handleShowForgotPassword}>
              Recuperar
            </Button>
          </p>
          <p className="footerLoginFarmerin">
            ¿No tenes una cuenta?{" "}
            <Button variant="link" onClick={handleShow}>
              Regístrate en Farmerin
            </Button>
          </p>
          <p className="footerFarmerinDiv">Farmerin Division S.A. - © 2020</p>
          <img src="logoBAJA.png" alt="Logo de Farmerin" className="logoLetras" />
        </form>
      )}
      
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>
            <h3>Registrarse</h3>
            <p>Es rápido y fácil</p>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CrearCuenta />
        </Modal.Body>
      </Modal>
      
      <div className="bannerLoginFarmerin">
        <h1 className="wel_textLoginFarmerin">Bienvenido a Farmerin</h1>
        <p className="paraLoginFarmerin"></p>
      </div>
      
      <Modal show={showForgotPassword} onHide={handleCloseForgotPassword}>
        <Modal.Header closeButton>
          <Modal.Title>Recuperar Contraseña</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Ingresa tu correo electrónico</Form.Label>
              <Form.Control
                type="email"
                placeholder="Correo Electrónico"
                value={emailToReset}
                onChange={handleChangeEmail}
                required
              />
            </Form.Group>
            <Button
              variant="info"
              onClick={forgotPassword}
              style={{ width: '100%' }}
              disabled={procesando}
            >
              {procesando ? "Procesando..." : "Enviar Mail de Recuperación"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      
      <Modal show={showAlert} onHide={() => setShowAlert(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{alert.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{alert.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAlert(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Login;