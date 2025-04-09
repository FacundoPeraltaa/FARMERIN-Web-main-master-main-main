import React from 'react';

const ResultadosCargas = ({ titulo, actualizados, errores }) => {
  return (
    <div className="result-container">
      <h2 className="result-header">{titulo}</h2>

      {/* Registros Actualizados */}
      <div className="result-box success-box">
        <h3 className="result-title">Registros Actualizados</h3>
        {actualizados.length > 0 ? (
          <ul className="result-list">
            {actualizados.map((item, index) => (
              <li key={index} className="result-item">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="result-item">No hay registros actualizados.</p>
        )}
      </div>

      {/* Errores en la Carga */}
      <div className="result-box error-box">
        <h3 className="result-title">Errores en la Carga</h3>
        {errores.length > 0 ? (
          <ul className="result-list">
            {errores.map((item, index) => (
              <li key={index} className="result-item">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="result-item">No se encontraron errores.</p>
        )}
      </div>
    </div>
  );
};

export default ResultadosCargas;
