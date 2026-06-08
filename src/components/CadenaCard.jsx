import '../styles/tiendas.css'

function CadenaCard({cadena}) {
    return (
        <div className="tienda-card">
            <h3 className="titulo-tienda">{cadena.codigo_cadena}</h3>
            <p>
                <strong>Establecimiento: </strong><br/>
                {cadena.establecimiento || 'Sin establecimiento'}
            </p>
            <p>
                <strong>Nombre particular: </strong><br/>
                {cadena.nombre_particular || 'Sin nombre'}
            </p>
            <p>
                <strong>Empresa: </strong>
                {cadena.empresa_cadena || 'Sin empresa'}
            </p>
        </div>
    );
}

export default CadenaCard;