function CadenaCard({ cadena, onEdit }) {
    return (
        <div className="card">
            <div className="brand">
                <h2>{cadena.codigo_cadena}</h2>
            </div>
            <div className="values">
                <div className="value">
                    <p>Establecimiento:</p>
                    <p>{cadena.establecimiento || '-'}</p>
                </div>
                {cadena.nombre_particular && (
                    <div className="value">
                        <p>Nombre particular:</p>
                        <p>{cadena.nombre_particular}</p>
                    </div>
                )}
                {cadena.empresa && (
                    <div className="value">
                        <p>Empresa:</p>
                        <p>{cadena.empresa}</p>
                    </div>
                )}
            </div>
            <div className="card-actions" style={{ padding: '15px', textAlign: 'center' }}>
                <button className="btn-editar" type="button" onClick={() => onEdit(cadena)}>
                    Editar
                </button>
            </div>
        </div>
    );
}

export default CadenaCard;
