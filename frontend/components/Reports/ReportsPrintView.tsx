import { useEffect } from 'react';
import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../ui/Button';
import { translations, type Language } from '../../translations';

interface ReportsPrintViewProps {
  periodLabel: string;
  institutionLabel: string;
  userName: string;
  userSpecialty: string;
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalGuardias: number;
  totalProcedimientos: number;
  totalInterconsultas: number;
  totalExtras: number;
  actividades: Transaction[];
  onClose: () => void;
  language: Language;
}

const s = {
  card: { background: '#fff', color: '#0f172a', padding: '2rem', borderRadius: '1rem', border: '1px solid #e2e8f0' },
  borderBottom: { borderBottom: '1px solid #e2e8f0' },
  h1: { color: '#0f172a' },
  h2: { color: '#475569' },
  subtitle: { color: '#64748b' },
  small: { color: '#94a3b8' },
  statBox: { background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem' },
  statGreen: { background: '#f0fdf4', borderRadius: '0.75rem', padding: '1rem' },
  statOrange: { background: '#fff7ed', borderRadius: '0.75rem', padding: '1rem' },
  catLabel: { color: '#64748b' },
  catValue: { color: '#0f172a' },
  chipBlue: { background: '#eff6ff', borderRadius: '0.5rem', padding: '0.75rem' },
  chipPurple: { background: '#faf5ff', borderRadius: '0.5rem', padding: '0.75rem' },
  chipGreen: { background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.75rem' },
  sectionTitle: { color: '#334155' },
  thead: { background: '#f1f5f9' },
  th: { color: '#0f172a' },
  td: { color: '#0f172a' },
  tdNote: { color: '#94a3b8' },
  rowBorder: { borderBottom: '1px solid #f1f5f9' },
};

function formatPrintTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}-${pad(now.getHours())}:${pad(now.getMinutes())}h`;
}

export function ReportsPrintView({
  periodLabel,
  institutionLabel,
  userName,
  userSpecialty,
  totalInvoiced,
  totalPaid,
  totalPending,
  totalGuardias,
  totalProcedimientos,
  totalInterconsultas,
  totalExtras,
  actividades,
  onClose,
  language,
}: ReportsPrintViewProps) {
  const t = translations[language];
  useEffect(() => {
    document.title = `MedFlow Pro - ${formatPrintTimestamp()}`;
    return () => { document.title = 'MedFlow Pro'; };
  }, []);

  return (
    <div style={{ padding: '1rem 2rem', maxWidth: '56rem', margin: '0 auto', overflowX: 'hidden' }}>
      <div className="flex justify-between mb-8 print:hidden">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
          {t.volver}
        </Button>
        <Button size="sm" onClick={() => {
          document.title = `MedFlow Pro - ${formatPrintTimestamp()}`;
          window.print();
        }}>
          <Printer className="w-4 h-4" />
          {t.imprimir}
        </Button>
      </div>

      <div style={s.card}>
        <div style={{ textAlign: 'center', ...s.borderBottom, paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, ...s.h1, margin: 0 }}>MedFlow Pro</h1>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, ...s.h2, marginTop: '0.25rem', marginBottom: 0 }}>{t.reporteActividadProfesional}</h2>
          {userName && (
            <p style={{ fontSize: '1rem', fontWeight: 700, ...s.h1, marginTop: '0.75rem', marginBottom: '0.25rem' }}>
              {userName}{userSpecialty ? ` — ${userSpecialty}` : ''}
            </p>
          )}
          <p style={{ fontSize: '0.875rem', ...s.subtitle, marginTop: userName ? '0.25rem' : '0.25rem', marginBottom: 0 }}>
            {periodLabel} {institutionLabel ? `\u2022 ${institutionLabel}` : ''}
          </p>
          <p style={{ fontSize: '0.75rem', ...s.small, marginTop: '0.25rem', marginBottom: 0 }}>
            {t.generado} {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center', ...s.statBox }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', ...s.catLabel, margin: 0 }}>Total</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, ...s.catValue, margin: 0 }}>{formatCurrency(totalInvoiced)}</p>
          </div>
          <div style={{ textAlign: 'center', ...s.statGreen }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#16a34a', margin: 0 }}>{t.cobrado}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', margin: 0 }}>{formatCurrency(totalPaid)}</p>
          </div>
          <div style={{ textAlign: 'center', ...s.statOrange }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ea580c', margin: 0 }}>{t.pendiente}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c2410c', margin: 0 }}>{formatCurrency(totalPending)}</p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, ...s.sectionTitle, marginBottom: '0.75rem' }}>{t.resumenPorTipo}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipBlue }}>
              <span style={{ fontWeight: 500 }}>{t.guardiasLabel}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalGuardias)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipPurple }}>
              <span style={{ fontWeight: 500 }}>{t.procedimientosLabel}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalProcedimientos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipGreen }}>
              <span style={{ fontWeight: 500 }}>{t.interconsultasLabel}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalInterconsultas)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipBlue, background: '#fffbeb', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <span style={{ fontWeight: 500 }}>{t.extrasLabel}</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalExtras)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontWeight: 700, ...s.sectionTitle, marginBottom: '0.75rem' }}>{t.detalleActividades}</h3>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={s.thead}>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.fecha}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.tipoLabel}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.institucionLabel}</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.detalleLabel}</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.montoLabel}</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700, ...s.th }}>{t.estadoLabelTable}</th>
              </tr>
            </thead>
            <tbody>
              {actividades.sort((a, b) => b.date.localeCompare(a.date)).map((a, i) => (
                <tr key={i} style={s.rowBorder}>
                  <td style={{ padding: '0.5rem', ...s.td }}>{a.date}</td>
                  <td style={{ padding: '0.5rem', ...s.td }}>
                    {a.type === ShiftType.ACTIVE && t.guardiaRow}
                    {a.type === ShiftType.CONSULTATION && t.tipoProced}
                    {a.type === ShiftType.PASSIVE && t.inter}
                    {a.type === ShiftType.EXTRA && t.tipoExtra}
                  </td>
                  <td style={{ padding: '0.5rem', ...s.td }}>{a.institution}</td>
                  <td style={{ padding: '0.5rem', fontSize: '0.75rem', ...s.td }}>
                    {a.type === ShiftType.CONSULTATION && a.procedureName}
                    {a.type === ShiftType.PASSIVE && `${a.specialty}${a.patientLocation === 'extraservicio' ? ' (Extra)' : ''}`}
                    {a.type === ShiftType.ACTIVE && `${a.hours}h`}
                    {a.type === ShiftType.EXTRA && a.conceptName}
                    {a.notes && !/undefined|null|NaN/i.test(a.notes) && a.notes.trim().length > 0 && <span style={{ display: 'block', ...s.tdNote, fontStyle: 'italic' }}>{'\uD83D\uDCDD'} {a.notes}</span>}
                  </td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 500, ...s.td }}>{formatCurrency(a.amount)}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'right', ...s.td }}>
                    {a.status === PaymentStatus.PAID ? '\u2713' : '\u23F3'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
