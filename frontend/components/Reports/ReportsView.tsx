import { Transaction, UserProfile, UserSettings, Institution } from '../../types';
import { CalendarView } from '../Calendar/CalendarView';
import { ArrowLeft, Printer } from 'lucide-react';
import { translations } from '../../translations';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ReportsPrintView } from './ReportsPrintView';
import { ReportsFilterBar } from './ReportsFilterBar';
import { ReportsStatsCards } from './ReportsStatsCards';
import { useReportsFilters, ALL_INSTITUTIONS } from './useReportsFilters';

interface ReportsViewProps {
  transactions: Transaction[];
  institutions: Institution[];
  settings: UserSettings;
  profile: UserProfile;
  onBack: () => void;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDelete: (id: string) => void;
}

export function ReportsView({ transactions, institutions, settings, profile, onBack, onOpenForm, onDelete }: ReportsViewProps) {
  const t = translations[settings.language];

  const {
    periodFilter, institutionFilter, activityFilter, showPrintView,
    setPeriodFilter, setInstitutionFilter, setActivityFilter, setShowPrintView,
    filteredActividades, institutions: institutionNames,
    totalGuardias, totalProcedimientos, totalInterconsultas, totalExtras,
    totalInvoiced, totalPaid, totalPending, periodLabels,
  } = useReportsFilters(transactions, settings.language);

  if (showPrintView) {
    return (
      <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-900 print:bg-white overflow-y-auto print:static print:inset-auto print:overflow-visible print:h-auto">
        <ReportsPrintView
          periodLabel={periodLabels[periodFilter]}
          institutionLabel={institutionFilter !== ALL_INSTITUTIONS ? institutionFilter : ''}
          userName={profile.name}
          userSpecialty={profile.specialty}
          totalInvoiced={totalInvoiced}
          totalPaid={totalPaid}
          totalPending={totalPending}
          totalGuardias={totalGuardias}
          totalProcedimientos={totalProcedimientos}
          totalInterconsultas={totalInterconsultas}
          totalExtras={totalExtras}
          actividades={filteredActividades}
          onClose={() => setShowPrintView(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className={cn("text-2xl lg:text-3xl font-black tracking-tight", settings.darkMode ? "text-white" : "text-slate-900")}>
              {t.guardias}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{t.analisisDetallado}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowPrintView(true)} className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 rounded-2xl">
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">{t.imprimirPDF}</span>
        </Button>
      </header>

      <ReportsFilterBar
        periodFilter={periodFilter}
        institutionFilter={institutionFilter}
        activityFilter={activityFilter}
        institutions={institutionNames}
        periodLabels={periodLabels}
        language={settings.language}
        onPeriodChange={setPeriodFilter}
        onInstitutionChange={setInstitutionFilter}
        onActivityChange={setActivityFilter}
      />

      <ReportsStatsCards
        totalInvoiced={totalInvoiced}
        totalPaid={totalPaid}
        totalPending={totalPending}
        totalGuardias={totalGuardias}
        totalProcedimientos={totalProcedimientos}
        totalInterconsultas={totalInterconsultas}
        totalExtras={totalExtras}
        filteredActividades={filteredActividades}
      />

      <Card padding="sm" shadow="xl" className="lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">{t.calendarioActividades}</h3>
          <Button size="sm" onClick={() => onOpenForm()}>+ {t.registrar}</Button>
        </div>
        <CalendarView transactions={transactions} institutions={institutions} onOpenForm={onOpenForm} onDelete={onDelete} settings={settings} embedded />
      </Card>

      <button onClick={() => setShowPrintView(true)}
        className="w-full py-6 bg-slate-900 dark:bg-slate-800 rounded-2xl text-white shadow-2xl flex flex-col items-center justify-center gap-3 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all">
        <Printer className="w-8 h-8" />
        <div>
          <p className="font-bold text-lg">{t.exportarReporteCompleto}</p>
          <p className="text-sm text-slate-400">{t.pdfListoParaImprimir}</p>
        </div>
      </button>
    </div>
  );
}
