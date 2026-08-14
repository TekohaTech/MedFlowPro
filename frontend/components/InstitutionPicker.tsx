import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Edit3, Trash2 } from 'lucide-react';
import { Institution } from '../types';
import { ConfirmModal } from './ui/ConfirmModal';
import { InstitutionEditForm } from './InstitutionEditForm';
import { useInstitutionDeactivate } from './useInstitutionForm';
import { getInstitutionColorMap } from '../lib/institutionColors';
import { cn } from '../lib/utils';
import { translations, type Language } from '../translations';

interface InstitutionPickerProps {
  institutions: Institution[];
  selected: string;
  onSelect: (name: string, inst?: Institution) => void;
  onInstitutionChange: (inst: Institution) => void;
  onInstitutionDelete: (id: string) => void;
  activityMode?: 'guardia' | 'extra';
  language: Language;
}

export function InstitutionPicker({
  institutions, selected, onSelect,
  onInstitutionChange, onInstitutionDelete, activityMode, language,
}: InstitutionPickerProps) {
  const t = translations[language];
  const { deactivate } = useInstitutionDeactivate();
  const [dropdown, setDropdown] = useState({ open: false, search: '' });
  const [instEditTarget, setInstEditTarget] = useState<'new' | Institution | null>(null);
  const [confirmDeleteInst, setConfirmDeleteInst] = useState<string | null>(null);
  const instRef = useRef<HTMLDivElement>(null);

  // Resolved colors for the dropdown dots — stored colors win, legacy
  // institutions without a color get a stable auto-assigned one.
  const colorMap = useMemo(() => getInstitutionColorMap(institutions), [institutions]);

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
    const ok = await deactivate(id);
    if (!ok) return;
    onInstitutionDelete(id);
    if (selected === name) onSelect('');
    setConfirmDeleteInst(null);
  };

  return (
    <div className="space-y-2">
      {instEditTarget ? (
        <InstitutionEditForm
          institution={instEditTarget === 'new' ? undefined : instEditTarget}
          institutions={institutions}
          activityMode={activityMode}
          language={language}
          onSave={(inst, newName) => {
            onInstitutionChange(inst);
            if (newName) onSelect(newName, inst);
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
            <span className={cn(selected ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
              {selected || (activityMode === 'extra' ? t.sinInstitucionOpcional : t.buscarOCrear)}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          {dropdown.open && (
            <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 z-20 shadow-lg max-h-60 overflow-y-auto">
              <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <input type="text" value={dropdown.search} onChange={e => setDropdown(prev => ({ ...prev, search: e.target.value }))}
                  placeholder={t.buscarInstitucion} autoFocus
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-sm font-bold text-slate-900 dark:text-white" />
              </div>
              {filteredInstitutions.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">{t.sinResultados}</p>
              ) : (
                filteredInstitutions.map(inst => {
                  const color = colorMap.get(inst.name);
                  return (
                    <div key={inst.id} className="flex items-center px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <button type="button" onClick={() => { onSelect(inst.name); setDropdown(prev => ({ ...prev, open: false })); }}
                        className="flex-1 flex items-center gap-2 text-left text-sm font-bold text-slate-900 dark:text-white min-w-0" style={{ minHeight: '36px' }}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={color ? { backgroundColor: color } : undefined} />
                        <span className="truncate">{inst.name}</span>
                      </button>
                      {/* Touch targets ≥ 36px (w-9 h-9) for mobile; hover states kept for desktop */}
                      <div className="flex gap-1 shrink-0">
                        <button type="button" onClick={() => setInstEditTarget(inst)}
                          aria-label={`${t.editar} ${inst.name}`}
                          className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-400 hover:text-blue-600 shrink-0">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setConfirmDeleteInst(inst.id)}
                          aria-label={`${t.eliminar} ${inst.name}`}
                          className="w-9 h-9 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-400 hover:text-red-500 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              <button type="button" onClick={() => { setInstEditTarget('new'); setDropdown(prev => ({ ...prev, open: false })); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-blue-600 border-t border-slate-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20" style={{ minHeight: '40px' }}>
                <Plus className="w-4 h-4" /> + {t.nuevaInstitucion}
              </button>
            </div>
          )}
        </div>
      )}
      <ConfirmModal
        open={!!confirmDeleteInst}
        title={t.eliminarInstitucion}
        message={t.eliminarInstitucionMsg}
        confirmLabel={t.eliminar}
        cancelLabel={t.cancelar}
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
          {t.institucionInactiva}
        </p>
      )}
    </div>
  );
}
