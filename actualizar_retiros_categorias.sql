-- Agregar la columna de categoría a la tabla de retiros de caja
ALTER TABLE public.cash_withdrawals
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Otros';
