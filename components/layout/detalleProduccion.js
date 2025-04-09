import React, { useState, useEffect, useContext } from 'react';
import { FirebaseContext } from '../../firebase2';
import { format } from 'date-fns';

const DetalleProduccion = ({ prod }) => {
  const { id, fecha, prodM, prodT, produccion, desM, desT, descarte, guaM, guaT, guachera, fabrica, animalesEnOrd } = prod;
  const { firebase } = useContext(FirebaseContext);

  const [fecProd, setFecProd] = useState('');
  const [entregado, setEntregado] = useState(0);

  useEffect(() => {
    try {
      console.log("Fecha recibida:", fecha);
      const f = format(firebase.timeStampToDate(fecha), 'dd/MM/yyyy');
      setFecProd(f);
    } catch (error) {
      console.error("Error al formatear la fecha:", error);
      setFecProd('');
    }

    const e = (parseFloat(produccion) || 0) - (parseFloat(descarte) || 0) - (parseFloat(guachera) || 0);
    console.log("Entregado calculado:", e);
    setEntregado(e);
  }, []);

  const formatNumber = (num) => {
    console.log('📥 Valor original:', num, 'tipo:', typeof num);
  
    const numberValue = Number(num);
  
    if (isNaN(numberValue)) {
      console.warn('❌ Valor no numérico detectado:', num);
      return 0;
    }
  
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(numberValue);
  
    console.log('✅ Valor formateado:', formatted);
    return formatted;
  };
  

  // 🔢 Nueva función específica para prodIndv (1 decimal)
  const formatProdIndv = (num) => {
    const numberValue = parseFloat(num);
    if (isNaN(numberValue)) return 0;

    return new Intl.NumberFormat(navigator.language || 'es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(numberValue);
  };

  const animales = parseFloat(animalesEnOrd);
  const produccionNum = parseFloat(produccion);
  const prodIndv = !isNaN(animales) && animales !== 0 && !isNaN(produccionNum)
    ? produccionNum / animales
    : "-";

  console.log(`📊 Producción individual calculada para la fecha ${fecha?.toDate?.().toLocaleDateString?.() || fecha}: ${prodIndv}`);



  return (
    <tr>
      <td>{fecProd}</td>
      <td>{formatNumber(prodM)}</td>
      <td>{formatNumber(prodT)}</td>
      <td>{formatNumber(produccion)}</td>
      <td>{formatNumber(desM)}</td>
      <td>{formatNumber(desT)}</td>
      <td>{formatNumber(descarte)}</td>
      <td>{formatNumber(guaM)}</td>
      <td>{formatNumber(guaT)}</td>
      <td>{formatNumber(guachera)}</td>
      <td>{formatNumber(entregado)}</td>
      <td>{formatNumber(animalesEnOrd)}</td>
      <td>{formatProdIndv(prodIndv)}</td>
      <td>{fabrica}</td>
    </tr>
  );
};

export default DetalleProduccion;
