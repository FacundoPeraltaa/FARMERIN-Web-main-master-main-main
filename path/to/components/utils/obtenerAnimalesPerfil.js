// ... existing code ...
            const vaquillonasSnapshot = await firebase.db
            .collection('animal')
            .where('idtambo', '==', tamboSel.id)
            .where('estpro', '!=', 'cria') 
            .where('mbaja', '==', '')
            .get();
            const vaquillonasData = vaquillonasSnapshot.docs.map((doc) => doc.data());
            // Unificar búsqueda de crías
            const criasData = vaquillonasData.filter((vaca) => vaca.estpro === 'cria');
            console.log('VAQUILLONAS',vaquillonasData);            
            setVaquillonas(vaquillonasData.length);
            setVaquillonasEnOrdeñe(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'En Ordeñe').length);
            setVaquillonasSecas(vaquillonasData.filter((vaquillona) => vaquillona.estpro === 'seca').length);
            // Mostrar crías en la lista de vaquillonas
            setCrias(criasData.length);
// ... existing code ...
            <Modal show={showVaquillonasModal} onClose={() => setShowVaquillonasModal(false)} title="Lista de Vaquillonas">
                <div>
                    <p>Vaquillonas: {vaquillonas}</p>
                    <p>Vaquillonas en Ordeñe: {vaquillonasEnOrdeñe}</p>
                    <p>Vaquillonas Secas: {vaquillonasSecas}</p>
                    <p>Crias: {crias}</p> {/* Mostrar crías aquí */}
                </div>
            </Modal>
// ... existing code ...