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
  table?: string;
  is_public?: boolean;
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
  id: string;
  msg: string;
  type: "success" | "error" | "info";
}

export interface UserData {
  role: Roles;
  uid: string;
  provider: "google.com" | "password";
  email?: string;
  apis: Api[];
}
export type Roles = "admin" | "usuario";

export type Tabs = "info" | "endpoints" | "logs" | "schema";

export type Panels = "dashboard" | "adminPanel";


export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
  unique?: boolean;
}

export interface SchemaFK {
  column: string;
  ref_table: string;
  ref_column: string;
}

export interface SchemaTable {
  table: string;
  columns: SchemaColumn[];
  foreign_keys: SchemaFK[];
}

export interface ApiSchema {
  api: string;
  db_type: string;
  tables: SchemaTable[];
}
