import cardStyles from '../styles/card-display.module.css';
import {getPerfil} from './session.js';

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function CampaniaCard({ campania, onEdit }) {
    const rol = getPerfil();
    return (
        <div className={cardStyles['card']}>
            <div className={cardStyles['brand']}>
                <h2>{campania.nombre}</h2>
            </div>
            <div className={cardStyles['values']}>
                <div className={cardStyles['value']}>
                    <p>Tipo:</p>
                    <p>{campania.tipo}</p>
                </div>
                <div className={cardStyles['value']}>
                    <p>Fecha de inicio:</p>
                    <p>{formatDate(campania.fecha_inicio)}</p>
                </div>
                <div className={cardStyles['value']}>
                    <p>Fecha de fin:</p>
                    <p>{formatDate(campania.fecha_fin)}</p>
                </div>
            </div>
            {rol === 'ADMINISTRADOR' && (
                <div className={cardStyles['card-buttons']} style={{ justifyContent: 'center' }}>
                    <button type="button" className={cardStyles['btn']} onClick={() => onEdit(campania)}>
                        Editar
                    </button>
                </div>
            )}
        </div>
    );
}

export default CampaniaCard;
