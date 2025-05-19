import React from 'react';
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, Tooltip, Legend,
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
const TooltipGeneral = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const prod = payload.find(p => p.dataKey === 'produccion')?.value;
    const vacas = payload.find(p => p.dataKey === 'animales')?.value;
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 6 }}>
        <p><strong>{label}</strong></p>
        <p>🍼 Producción: <strong>{formatNumber(prod)} lts</strong></p>
        <p>🐄 Vacas en ordeñe: <strong>{formatNumber(vacas)}</strong></p>
      </div>
    );
  }
  return null;
};

const GraficoProduccion = ({ data, promedioTotal }) => {
  const formattedData = data.map(item => ({
    fecha: item.fecha.toDate ? item.fecha.toDate().toISOString().split('T')[0] : item.fecha,
    produccion: item.produccion,
    animales: item.animalesEnOrd
  }));

  return (
    <div style={{ width: '100%', marginTop: 40 }}>
      {/* Título */}
      <h3 style={{ textAlign: 'center', marginBottom: 5 }}>
        Producción Total y Vacas en Ordeñe
      </h3>

      {/* Subtítulo del promedio individual total */}
      {typeof promedioTotal === 'number' && (
        <p style={{
          textAlign: 'center',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#d32f2f',
          marginBottom: 20
        }}>
          Prom. Individual Total: {formatProdIndv(promedioTotal)} lts/vaca
        </p>
      )}

      {/* Gráfico */}
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={formattedData}
            margin={{ top: 20, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            
            {/* Eje Y izquierdo: Producción */}
            <YAxis
              yAxisId="left"
              tickFormatter={formatNumber}
              label={{ value: 'Producción (lts)', angle: -90, position: 'insideLeft' }}
            />
            
            {/* Eje Y derecho: Vacas en ordeñe */}
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatNumber}
              label={{ value: 'Vacas en ordeñe', angle: -90, position: 'insideRight' }}
            />

            <Tooltip content={<TooltipGeneral />} />
            <Legend verticalAlign="top" height={36} />

            <Bar
              dataKey="produccion"
              barSize={30}
              fill="#81d4fa"
              name="🍼 Producción"
              yAxisId="left"
            />

            <Line
              type="monotone"
              dataKey="animales"
              stroke="#66bb6a"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="🐄 Vacas en ordeñe"
              yAxisId="right"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraficoProduccion;
