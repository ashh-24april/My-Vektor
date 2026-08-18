import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    "Advertencia: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos en las variables de entorno."
  );
}

// Inicializar el cliente SDK oficial de Supabase
// Se utiliza la Service Role Key para operaciones de administración (como subidas a Storage) desde el Backend.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
