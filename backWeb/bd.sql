CREATE TABLE dbventas.productos (
	id_producto INTEGER auto_increment NOT NULL,
	nombre varchar(100) NULL,
	descripcion varchar(300) NULL,
	imagen varchar(100) NULL,
	estado varchar(1) NULL,
	precio DECIMAL(10,2) NULL,
	CONSTRAINT productos_pk PRIMARY KEY (id_producto)
)
ENGINE=MyISAM
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;
