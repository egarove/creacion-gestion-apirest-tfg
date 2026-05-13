import type { Endpoint } from "../types";
import EndpointCard from "./EndpointCard";
import EndpointForm from "./EndpointForm";

interface EndpointsTabProps {
  endpoints: Endpoint[];
  addingEndpoint: boolean;
  newEndpoint: Endpoint;
  savingEndpoint: boolean;
  onAddingChange: (adding: boolean) => void;
  onNewEndpointChange: (endpoint: Endpoint) => void;
  onSubmitEndpoint: () => void;
}

export default function EndpointsTab({
  endpoints,
  addingEndpoint,
  newEndpoint,
  savingEndpoint,
  onAddingChange,
  onNewEndpointChange,
  onSubmitEndpoint,
}: EndpointsTabProps) {
  // Se puede crear aqui la parte del código con la función del endpoint para poder editar lo que hace la función, pero por ahora lo dejamos así para no complicar demasiado la UI. Solo se podrá elegir el tipo de lógica (select, insert, update, delete) y luego se generará una función básica con esa lógica.
  return (
    <div>
      {endpoints.length === 0 && !addingEndpoint && (
        <div className="text-center text-textMuted text-sm py-8">
          Sin endpoints definidos
        </div>
      )}
      <div className="space-y-2 mb-3">
        {endpoints.map((ep, i) => (
          <EndpointCard key={i} endpoint={ep} />
        ))}
      </div>
      {addingEndpoint && (
        <EndpointForm
          newEndpoint={newEndpoint}
          saving={savingEndpoint}
          onEndpointChange={onNewEndpointChange}
          onCancel={() => onAddingChange(false)}
          onSubmit={onSubmitEndpoint}
        />
      )}
      {!addingEndpoint && (
        <button
          onClick={() => onAddingChange(true)}
          className="w-full py-2.5 rounded-xl border border-dashed border-borderNormal text-textMuted hover:text-primary hover:border-primary text-xs font-semibold transition-colors"
        >
          <i className="fas fa-plus mr-1.5"></i>Nuevo endpoint
        </button>
      )}
    </div>
  );
}
