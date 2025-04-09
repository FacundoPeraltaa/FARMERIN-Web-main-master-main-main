import React, { useContext, useState, useEffect } from 'react';
import { FirebaseContext } from '../firebase2';
import Layout from '../components/layout/layout';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Modal } from 'react-bootstrap';

const GraficoMachoHembra = () => {
    const { firebase, tamboSel } = useContext(FirebaseContext);
    const [data, setData] = useState([]);
    const [barData, setBarData] = useState([]);
    const [year, setYear] = useState(2025);

    useEffect(() => {
        if (!tamboSel) return;
        
        const fetchAnimales = async () => {
            try {
                const startDate = new Date(`${year}-01-01`);
                const endDate = new Date(`${year}-12-31`);
                
                const animalesSnapshot = await firebase.db.collection('animal')
                    .where('idtambo', '==', tamboSel.id)
                    .get();
                const animales = animalesSnapshot.docs.map((doc) => doc.data());
                
                const machosSnapshot = await firebase.db.collection('macho')
                    .where('idtambo', '==', tamboSel.id)
                    .get();
                const machos = machosSnapshot.docs.map((doc) => doc.data());

                // Filtrar por fecha de ingreso
                const filtrados = animales.filter(a => {
                    const fechaIngreso = a.ingreso ? new Date(a.ingreso) : null;
                    return fechaIngreso && fechaIngreso >= startDate && fechaIngreso <= endDate;
                });

                const vacas = filtrados.filter(a => a.categoria === 'Vaca').length;
                const vaquillonas = filtrados.filter(a => a.categoria === 'Vaquillona').length;
                const vacasMbaja = filtrados.filter(a => a.categoria === 'Vaca' && a.mbaja).length;
                const vaquillonasMbaja = filtrados.filter(a => a.categoria === 'Vaquillona' && a.mbaja).length;
                const terneros = machos.filter(m => m.cat === 'ternero' && m.ingreso && new Date(m.ingreso) >= startDate && new Date(m.ingreso) <= endDate).length;

                const total = vacas + vaquillonas + vacasMbaja + vaquillonasMbaja + terneros;
                
                setData([
                    { name: 'Vacas', value: (vacas / total) * 100, count: vacas },
                    { name: 'Vaquillonas', value: (vaquillonas / total) * 100, count: vaquillonas },
                    { name: 'Vacas (mbaja)', value: (vacasMbaja / total) * 100, count: vacasMbaja },
                    { name: 'Vaquillonas (mbaja)', value: (vaquillonasMbaja / total) * 100, count: vaquillonasMbaja },
                    { name: 'Terneros', value: (terneros / total) * 100, count: terneros }
                ]);
                
                // Datos para gráfico de barras
                const meses = Array.from({ length: 12 }, (_, i) => ({
                    mes: new Date(year, i, 1).toLocaleString('es-ES', { month: 'short' }),
                    Vacas: 0, Vaquillonas: 0, Terneros: 0, 'Vacas (mbaja)': 0, 'Vaquillonas (mbaja)': 0
                }));
                
                filtrados.forEach(a => {
                    const fecha = new Date(a.ingreso);
                    const mesIndex = fecha.getMonth();
                    if (a.categoria === 'Vaca') meses[mesIndex].Vacas++;
                    if (a.categoria === 'Vaquillona') meses[mesIndex].Vaquillonas++;
                    if (a.categoria === 'Vaca' && a.mbaja) meses[mesIndex]['Vacas (mbaja)'] = Math.max(1, meses[mesIndex]['Vacas (mbaja)'] + 1);
                    if (a.categoria === 'Vaquillona' && a.mbaja) meses[mesIndex]['Vaquillonas (mbaja)'] = Math.max(1, meses[mesIndex]['Vaquillonas (mbaja)'] + 1);
                });
                
                machos.forEach(m => {
                    if (m.cat === 'ternero' && m.ingreso) {
                        const fecha = new Date(m.ingreso);
                        const mesIndex = fecha.getMonth();
                        meses[mesIndex].Terneros++;
                    }
                });
                
                setBarData(meses);
            } catch (error) {
                console.error('Error obteniendo animales:', error);
            }
        };
        
        fetchAnimales();
    }, [tamboSel, firebase, year]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF'];

    return (
        <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <button onClick={() => setYear(year === 2024 ? 2025 : 2024)} style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #007bff, #00c6ff)', color: '#fff', fontWeight: 'bold', transition: '0.3s', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                    Ver datos de {year === 2024 ? 2025 : 2024}
                </button>
            </div>
            </div>
            <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>Distribución de Animales en {year} - {tamboSel?.nombre}</h2>
            <p style={{ textAlign: 'center', fontSize: '16px', marginBottom: '20px' }}>Este gráfico de torta muestra la distribución porcentual y la cantidad de animales registrados en el tambo durante el año {year}.</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>
                <PieChart width={400} height={400}>
                    <Pie
                        data={data}
                        cx='50%'
                        cy='50%'
                        labelLine={false}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value, count }) => `${name}: ${count} (${value.toFixed(1)}%)`}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${props.payload.count} (${value.toFixed(1)}%)`, name]} />
                    <Legend />
                </PieChart>
                <h2 style={{ textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}>Cantidad de Animales Ingresados por Mes en {year} - {tamboSel?.nombre}</h2>
                <p style={{ textAlign: 'center', fontSize: '16px', marginBottom: '20px' }}>Este gráfico de barras muestra la cantidad de animales ingresados en el tambo mes a mes durante {year}.</p>
                <ResponsiveContainer width='80%' height={400}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Vacas" fill="#0088FE" />
                    <Bar dataKey="Vaquillonas" fill="#00C49F" />
                    <Bar dataKey="Terneros" fill="#FFBB28" />
                    <Bar dataKey="Vacas (mbaja)" fill="#FF8042" />
                    <Bar dataKey="Vaquillonas (mbaja)" fill="#A28DFF" />
                </BarChart>
            </ResponsiveContainer>
            </div>
            </div>
    );
};

export default GraficoMachoHembra;
