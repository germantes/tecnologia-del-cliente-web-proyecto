import '../styles/cadenas.css'

function CadenaCard({ cadena, onEdit }) {
    return (
        <div className="cadena-card">
            <h3 className="titulo-cadena">{cadena.codigo_cadena}</h3>
            <p>
                <strong>Establecimiento: </strong><br/>
                {cadena.establecimiento || 'Sin establecimiento'}
            </p>
            {cadena.nombre_particular && (
                <p>
                    <strong>Nombre particular: </strong><br/>
                    {cadena.nombre_particular}
                </p>
            )}
            {cadena.empresa && (
                <p>
                    <strong>Empresa: </strong>
                    {cadena.empresa}
                </p>
            )}
            <div className="card-actions">
                <button className="btn-editar" onClick={() => onEdit(cadena)}>
                    Editar
                </button>
            </div>
        </div>
    );
}

export default CadenaCard;
