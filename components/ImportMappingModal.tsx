
import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';

interface ImportMappingModalProps {
  headers: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  onCancel: () => void;
}

const ImportMappingModal: React.FC<ImportMappingModalProps> = ({ headers, onConfirm, onCancel }) => {
  const [mapping, setMapping] = useState<Record<string, string>>({
    omNumber: '',
    description: '',
    workCenter: '',
    circuit: '',
    minDate: '',
    maxDate: ''
  });

  // Tenta pré-selecionar baseado em nomes comuns
  useEffect(() => {
    const autoMap: Record<string, string> = { ...mapping };
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
    
    headers.forEach(h => {
      const nh = normalize(h);
      if (['om', 'ordem', 'tag'].includes(nh)) autoMap.omNumber = h;
      if (['descricao', 'atividade', 'texto'].includes(nh)) autoMap.description = h;
      if (['ct', 'centro', 'setor', 'centrab'].includes(nh)) autoMap.workCenter = h;
      if (['circuito', 'circuit', 'loc', 'tagloc'].includes(nh)) autoMap.circuit = h;
      if (['inicio', 'minima', 'datamin'].includes(nh)) autoMap.minDate = h;
      if (['fim', 'maxima', 'datamax'].includes(nh)) autoMap.maxDate = h;
    });
    setMapping(autoMap);
  }, [headers]);

  const isValid = mapping.omNumber && mapping.description && mapping.workCenter;

  const fields = [
    { id: 'omNumber', label: 'Nº da OM (Identificador)', required: true },
    { id: 'description', label: 'Descrição da Atividade', required: true },
    { id: 'workCenter', label: 'Centro de Trabalho (Setor)', required: true },
    { id: 'circuit', label: 'Circuito (Localização)', required: false },
    { id: 'minDate', label: 'Data de Início (Opcional)', required: false },
    { id: 'maxDate', label: 'Data de Término (Opcional)', required: false },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
        <div className="p-8 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter">Mapear Planilha</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Selecione as colunas correspondentes</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={24} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {!isValid && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/50 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase leading-tight">Mapeie ao menos os campos obrigatórios (OM, Descrição e Setor) para prosseguir.</p>
            </div>
          )}

          {fields.map(field => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex justify-between">
                <span>{field.label}</span>
                {field.required && <span className="text-rose-500">Obrigatório</span>}
              </label>
              <select
                value={mapping[field.id]}
                onChange={(e) => setMapping({ ...mapping, [field.id]: e.target.value })}
                className={`w-full p-4 bg-gray-50 dark:bg-zinc-800 border-2 rounded-2xl outline-none font-bold text-sm transition-all appearance-none cursor-pointer ${
                  mapping[field.id] ? 'border-emerald-500 text-black dark:text-white' : 'border-gray-100 dark:border-zinc-700 text-zinc-400'
                }`}
              >
                <option value="">-- Não Mapeado --</option>
                {headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="p-8 bg-gray-50 dark:bg-zinc-800/50 border-t border-gray-100 dark:border-zinc-800 flex flex-col gap-3">
          <button
            onClick={() => onConfirm(mapping)}
            disabled={!isValid}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          >
            <CheckCircle2 size={20} /> Importar Dados Agora
          </button>
          <button onClick={onCancel} className="w-full py-3 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-rose-600 transition-colors">
            Cancelar Importação
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportMappingModal;
