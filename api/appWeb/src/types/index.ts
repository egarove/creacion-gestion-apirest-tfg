export interface LangOption {
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface DbOption {
  icon: string;
  label: string;
}

export interface Endpoint {
  method: string;
  path: string;
  function_name: string;
  logic: string;
}

export interface Api {
  api_name: string;
  status: string;
  backup_status: string;
  port: number;
  backup_port?: number;
  language?: string;
  db: string;
  columns?: string[];
  endpoints?: Endpoint[];
  generar_ui?: boolean;
}

export interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'info';
}
