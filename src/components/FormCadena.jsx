import React, { useState } from 'react';
import { getAuthHeaders } from './session';
import '../styles/editar_cadena.css';

function FormCadena({ onClose, existingCadenas, onCadenaCreated }) {
    const [formData, setFormData] = useState({
        codigoCadena: '',
        establecimiento: '',
        nombreParticular: '',
        empresa: '',
    });
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        // 1. Validación: Comprobar si el código de cadena ya existe
        const codeExists = existingCadenas.some(cadena => 
            String(cadena.codigo_cadena) === String(formData.codigoCadena)
        );

        if (codeExists) {
            setError('El código de cadena ya existe.');
            setIsSubmitting(false);
            return;
        }

        try {
            // 2. Envío a la API
            const response = await fetch('/api/cadenas', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    codigo_cadena: formData.codigoCadena,
                    establecimiento: formData.establecimiento,
                    nombre_particular: formData.nombreParticular,
                    empresa: formData.empresa,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al crear la cadena.');
            }

            const newCadena = await response.json();
            
            // 3. Notificar al componente padre y cerrar
            onCadenaCreated(newCadena);
            onClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }}>
            <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '700px', margin: '0 auto', padding: '0'}}>
                <div className="total">
                    <div className="form-header">
                        <h1>Crear Nueva Cadena</h1>
                    </div>

                    {error && (
                        <div style={{ backgroundColor: '#ffe6e6', color: '#d46262', textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', padding: '15px', borderBottom: '2px solid #d46262' }}>
                            {error}
                        </div>
                    )}

                    <div className="tablas">
                        <table>
                            <tbody>
                                <tr>
                                    <td className="etiqueta-campo">Código</td>
                                    <td><input type="text" name="codigoCadena" value={formData.codigoCadena} onChange={handleChange} required /></td>
                                </tr>
                                <tr>
                                    <td className="etiqueta-campo">Establecimiento</td>
                                    <td><input type="text" name="establecimiento" value={formData.establecimiento} onChange={handleChange} required /></td>
                                </tr>
                                <tr>
                                    <td className="etiqueta-campo">Nombre particular</td>
                                    <td><input type="text" name="nombreParticular" value={formData.nombreParticular} onChange={handleChange} /></td>
                                </tr>
                                <tr>
                                    <td className="etiqueta-campo">Empresa</td>
                                    <td><input type="text" name="empresa" value={formData.empresa} onChange={handleChange} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="botones">
                        <button type="button" className="btn-cerrar" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-guardar" disabled={isSubmitting}>
                            {isSubmitting ? 'Creando...' : 'Crear'}
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}

export default FormCadena;