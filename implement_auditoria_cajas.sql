-- Tabla para el registro de auditoría
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario TEXT NOT NULL,
    rol TEXT,
    sucursal TEXT,
    accion TEXT NOT NULL,
    detalles TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para el control de turnos y estado de las cajas
CREATE TABLE cash_shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sucursal TEXT NOT NULL,
    estado TEXT NOT NULL CHECK (estado IN ('abierta', 'cerrada')),
    abierto_por TEXT,
    monto_inicial NUMERIC DEFAULT 0,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    cerrado_por TEXT,
    monto_final NUMERIC,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS si es necesario (opcional)
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cash_shifts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow all" ON audit_logs FOR ALL USING (true);
-- CREATE POLICY "allow all" ON cash_shifts FOR ALL USING (true);
