import cardStyles from '../styles/card-display.module.css';
import { getPerfil } from './session.js';

function ZonaCard({ zona, onViewStores, onEdit }) {
    const nombreDistrito = zona.distrito?.nombre_distrito || '-';
    const zonaGeografica = zona.zona?.zona_geografica || zona.zona_geografica || '-';
    const rol = getPerfil();

    return (
        <div className={cardStyles['card']}>
            <div className={cardStyles['brand']}>
                <h2>{zona.cp}</h2>
            </div>
            <div className={cardStyles['values']}>
                <div className={cardStyles['value']}>
                    <p>Localidad:</p>
                    <p>{zona.localidad || '-'}</p>
                </div>
                <div className={cardStyles['value']}>
                    <p>Distrito:</p>
                    <p>{nombreDistrito}</p>
                </div>
                <div className={cardStyles['value']}>
                    <p>Zona Geográfica:</p>
                    <p>{zonaGeografica}</p>
                </div>
            </div>
            <div className={cardStyles['card-buttons']} style={{ justifyContent: 'center' }}>
                <button
                    type="button"
                    className={`${cardStyles['btn']} ${cardStyles['btn-view-stores']}`}
                    onClick={() => onViewStores(zona)}
                >
                    Ver Tiendas
                </button>
                {rol === 'ADMINISTRADOR' && (
                    <button
                        type="button"
                        className={cardStyles['btn-edit']}
                        onClick={() => onEdit(zona)}
                    >
                        Editar
                    </button>
                )}
            </div>
        </div>
    );
}

export default ZonaCard;
