import cardStyles from '../styles/card-display.module.css';

function CadenaCard({ cadena, onEdit }) {
    return (
        <div className={cardStyles['card']}>
            <div className={cardStyles['brand']}>
                <h2>{cadena.codigo_cadena}</h2>
            </div>
            <div className={cardStyles['values']}>
                <div className={cardStyles['value']}>
                    <p>Establecimiento:</p>
                    <p>{cadena.establecimiento || '-'}</p>
                </div>
                {cadena.nombre_particular && (
                    <div className={cardStyles['value']}>
                        <p>Nombre particular:</p>
                        <p>{cadena.nombre_particular}</p>
                    </div>
                )}
                {cadena.empresa && (
                    <div className={cardStyles['value']}>
                        <p>Empresa:</p>
                        <p>{cadena.empresa}</p>
                    </div>
                )}
            </div>
            <div className={cardStyles['card-buttons']} style={{ justifyContent: 'center' }}>
                <button type="button" className={cardStyles['btn']} onClick={() => onEdit(cadena)}>
                    Editar
                </button>
            </div>
        </div>
    );
}

export default CadenaCard;
