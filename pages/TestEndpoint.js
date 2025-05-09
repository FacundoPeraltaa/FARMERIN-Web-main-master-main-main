import React, { useState } from 'react';
import Layout from '../components/layout/layout';

export default function TestEndpoint() {
  const [endpoint, setEndpoint] = useState('/tolvas');
  const [host, setHost] = useState('192.168.0.123');
  const [respuesta, setRespuesta] = useState(null);
  const [error, setError] = useState('');

  const fetchDatos = async () => {
    const login = 'farmerin';
    const password = 'Farmerin*2021';

    const url = `http://${host}${endpoint}`;
    console.log('🌐 Haciendo request a:', url);

    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': 'Basic ' + btoa(`${login}:${password}`),
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      console.log('📦 Datos recibidos:', data);
      setRespuesta(data);
      setError('');
    } catch (err) {
      console.error('❌ Error en fetch:', err);
      setError('No se pudo obtener la respuesta del servidor');
      setRespuesta(null);
    }
  };

  return (
    <Layout>
    <div style={{ padding: 20 }}>
      <h2>Tester de Endpoint</h2>
      <div>
        <label>Host: </label>
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="192.168.100.150:1880"
        />
      </div>
      <div style={{ marginTop: 10 }}>
        <label>Endpoint: </label>
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="/ingresos"
        />
      </div>
      <button onClick={fetchDatos} style={{ marginTop: 15 }}>
        Obtener datos
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {respuesta && (
        <div style={{ marginTop: 20 }}>
          <h4>Respuesta:</h4>
          <pre>{JSON.stringify(respuesta, null, 2)}</pre>
        </div>
      )}
    </div>
    </Layout>
  );
}
