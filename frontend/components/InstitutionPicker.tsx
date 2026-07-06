import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Edit3, Trash2 } from 'lucide-react';
import { Institution } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { ConfirmModal } from './ui/ConfirmModal';
import { InstitutionEditForm } from './InstitutionEditForm';

interface InstitutionPickerProps {
  institutions: Institution[];
  selected: string;
  onSelect: (name: string) => void;
  onInstitutionChange: (inst: Institution) => void;
  onInstitutionDelete: (id: string) => void;
  activityMode?: 'guardia' | 'extra';
}

export function InstitutionPicker({
  institutions, selected, onSelect,
  onInstitutionChange, onInstitutionDelete, activityMode,
}: InstitutionPickerProps) {
  const [dropdown, setDropdown] = useState({ open: false, search: '' });
  const [instEditTarget, setInstEditTarget] = useState<'new' | Institution | null>(null);
  const [confirmDeleteInst, setConfirmDeleteInst] = useState<string | null>(null);
  const instRef = useRef<HTMLDivElement>(null);

  const filteredInstitutions = institutions.filter(i =>
    i.is_active && i.name.toLowerCase().includes(dropdown.search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (instRef.current && !instRef.current.contains(e.target as Node)) {
        setDropdown(prev => ({ ...prev, open: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteInst = async (id: string, name: string) => {
    try {
      await api.updateInstitution(id, { is_active: false });
      onInstitutionDelete(id);
      if (selected === name) onSelect('');
      setConfirmDeleteInst(null);
    } catch (e) {
      console.error('Error deleting institution', e);
    }
  };

  return (
    <div className="space-y-2">
      {instEditTarget ? (
        <InstitutionEditForm
          institution={instEditTarget === 'new' ? undefined : instEditTarget}
          activityMode={activityMode}
          onSave={(inst, newName) => {
            onInstitutionChange(inst);
            if (newName) onSelect(newName);
            setInstEditTarget(null);
          }}
          onCancel={() => setInstEditTarget(null)}
        />
      ) : (
        <div ref={instRef} className="relative">
          <div
            onClick={() => setDropdown(prev => ({ ...prev, open: !prev.open }))}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold flex items-center justify-between cursor-pointer"
            style={{ minHeight: '40px' }}
          >
            <span className={selected ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
              {selected || (activityMode === 'extra' ? 'Sin institución (opcional)' : 'Buscar o crear institución...')}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          {dropdown.open && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 z-20 shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <input type="text" value={dropdown.search} onChange={e => setDropdown(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Buscar institución..." autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-sm font-bold text-slate-900 dark:text-white" />
              </div>
              {filteredInstitutions.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">Sin resultados</p>
              ) : (
                filteredInstitutions.map(inst => (
                  <div key={inst.id} className="flex items-center px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <button type="button" onClick={() => { onSelect(inst.name); setDropdown(prev => ({ ...prev, open: false })); }}
                      className="flex-1 text-left text-sm font-bold truncate text-slate-900 dark:text-white" style={{ minHeight: '36px' }}>
                      {inst.name}
                    </button>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setInstEditTarget(inst)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-400 hover:text-blue-600">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setConfirmDeleteInst(inst.id)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button type="button" onClick={() => { setInstEditTarget('new'); setDropdown(prev => ({ ...prev, open: false })); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-blue-600 border-t border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" style={{ minHeight: '40px' }}>
                <Plus className="w-4 h-4" /> + Nueva Institución
              </button>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={!!confirmDeleteInst}
        title="Eliminar institución"
        message="¿Eliminar esta institución? Las actividades previas no se afectan."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (!confirmDeleteInst) return;
          const inst = institutions.find(i => i.id === confirmDeleteInst);
          if (inst) handleDeleteInst(confirmDeleteInst, inst.name);
        }}
        onCancel={() => setConfirmDeleteInst(null)}
      />
      {selected && !instEditTarget && !institutions.find(i => i.name.toLowerCase().trim() === selected.toLowerCase().trim() && i.is_active) && (
        <p className="text-[10px] text-amber-500 font-bold">
          Atención: Esta institución no está en tu lista de instituciones activas.
        </p>
      )}
    </div>
  );
}
