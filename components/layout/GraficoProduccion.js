// components/charts/GraficoProduccion.js
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

// 🔢 Formato con miles: 5.000
const formatNumber = (num) => {
  const numberValue = Number(num);
  if (isNaN(numberValue)) return 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  }).format(numberValue);
};

// 🔢 Formato decimal: 22,3
const formatProdIndv = (num) => {
  const numberValue = parseFloat(num);
  if (isNaN(numberValue)) return 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(numberValue);
};

// 📊 Tooltip personalizado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const prod = payload.find(p => p.dataKey === 'produccion')?.value;
    const animales = payload.find(p => p.dataKey === 'animales')?.value;
    const prodIndv = payload.find(p => p.dataKey === 'prodIndv')?.value;

    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10 }}>
        <p><strong>{label}</strong></p>
        <p>Producción: {formatNumber(prod)}</p>
        <p>Animales en ordeñe: {formatNumber(animales)}</p>
        <p>Prod. Individual: {formatProdIndv(prodIndv)}</p>
      </div>
    );
  }
  return null;
};

const GraficoProduccion = ({ data }) => {
  const formattedData = data.map(item => ({
    fecha: item.fecha.toDate ? item.fecha.toDate().toISOString().split('T')[0] : item.fecha,
    produccion: item.produccion,
    animales: item.animalesEnOrd,
    prodIndv: typeof item.prodIndv === 'number' ? item.prodIndv : 0
  }));

  return (
    <div style={{ width: '100%', height: 400, marginTop: 40 }}>
      <ResponsiveContainer>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="produccion" stroke="#8884d8" name="Producción" />
          <Line type="monotone" dataKey="animales" stroke="#82ca9d" name="Animales en ordeñe" />
          <Line type="monotone" dataKey="prodIndv" stroke="#ffc658" name="Prod. Individual" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GraficoProduccion;
