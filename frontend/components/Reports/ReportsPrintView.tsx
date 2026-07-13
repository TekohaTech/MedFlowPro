import { useEffect } from 'react';
import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '../ui/Button';

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
}: ReportsPrintViewProps) {
  useEffect(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.title = `MedFlow Pro - ${day}/${month}/${year}-${hours}:${minutes}h`;
    return () => { document.title = 'MedFlow Pro'; };
  }, []);

  return (
    <div style={{ padding: '1rem 2rem', maxWidth: '56rem', margin: '0 auto', overflowX: 'hidden' }}>
      <div className="flex justify-between mb-8 print:hidden">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
        <Button size="sm" onClick={() => {
          const now = new Date();
          const ts = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}-${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}h`;
          document.title = `MedFlow Pro - ${ts}`;
          window.print();
        }}>
          <Printer className="w-4 h-4" />
          Imprimir
        </Button>
      </div>

      <div style={s.card}>
        <div style={{ textAlign: 'center', ...s.borderBottom, paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, ...s.h1, margin: 0 }}>MedFlow Pro</h1>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, ...s.h2, marginTop: '0.25rem', marginBottom: 0 }}>Reporte de Actividad Profesional</h2>
          {userName && (
            <p style={{ fontSize: '1rem', fontWeight: 700, ...s.h1, marginTop: '0.75rem', marginBottom: '0.25rem' }}>
              {userName}{userSpecialty ? ` — ${userSpecialty}` : ''}
            </p>
          )}
          <p style={{ fontSize: '0.875rem', ...s.subtitle, marginTop: userName ? '0.25rem' : '0.25rem', marginBottom: 0 }}>
            {periodLabel} {institutionLabel ? `\u2022 ${institutionLabel}` : ''}
          </p>
          <p style={{ fontSize: '0.75rem', ...s.small, marginTop: '0.25rem', marginBottom: 0 }}>
            Generado: {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ textAlign: 'center', ...s.statBox }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', ...s.catLabel, margin: 0 }}>Total</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, ...s.catValue, margin: 0 }}>{formatCurrency(totalInvoiced)}</p>
          </div>
          <div style={{ textAlign: 'center', ...s.statGreen }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#16a34a', margin: 0 }}>Cobrado</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#15803d', margin: 0 }}>{formatCurrency(totalPaid)}</p>
          </div>
          <div style={{ textAlign: 'center', ...s.statOrange }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ea580c', margin: 0 }}>Pendiente</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#c2410c', margin: 0 }}>{formatCurrency(totalPending)}</p>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, ...s.sectionTitle, marginBottom: '0.75rem' }}>Resumen por Tipo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipBlue }}>
              <span style={{ fontWeight: 500 }}>Guardias:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalGuardias)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipPurple }}>
              <span style={{ fontWeight: 500 }}>Procedimientos:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalProcedimientos)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipGreen }}>
              <span style={{ fontWeight: 500 }}>Interconsultas:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalInterconsultas)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', ...s.chipBlue, background: '#fffbeb', borderRadius: '0.5rem', padding: '0.75rem' }}>
              <span style={{ fontWeight: 500 }}>Extras:</span>
              <span style={{ fontWeight: 700 }}>{formatCurrency(totalExtras)}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontWeight: 700, ...s.sectionTitle, marginBottom: '0.75rem' }}>Detalle de Actividades</h3>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr style={s.thead}>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>Fecha</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>Tipo</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>Institución</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, ...s.th }}>Detalle</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700, ...s.th }}>Monto</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', fontWeight: 700, ...s.th }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {actividades.sort((a, b) => b.date.localeCompare(a.date)).map((a, i) => (
                <tr key={i} style={s.rowBorder}>
                  <td style={{ padding: '0.5rem', ...s.td }}>{a.date}</td>
                  <td style={{ padding: '0.5rem', ...s.td }}>
                    {a.type === ShiftType.ACTIVE && 'Guardia'}
                    {a.type === ShiftType.CONSULTATION && 'Proc.'}
                    {a.type === ShiftType.PASSIVE && 'Inter.'}
                    {a.type === ShiftType.EXTRA && 'Extra'}
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
