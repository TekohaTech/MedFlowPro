import { PaymentStatus, Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { formatCompactAmount } from './calendarUtils';

export interface DurationLineSpec {
  /** 1-based visual row — a line keeps the same slot for its whole life
      (persistent across days, so it never jumps up when lines above end). */
  slot: number;
  /** Institution name — drives the color (dedupe is caller-side now). */
  institution: string;
  /** A guardia STARTS today — renders the solid dot (+ desktop amount). */
  startsToday: boolean;
  /** A guardia ENDS today — renders the vertical end marker. */
  endsToday: boolean;
}

interface DurationLinesProps {
  /** One spec per rendered line (a split day yields TWO lines per institution). */
  lines: DurationLineSpec[];
  colorMap: Map<string, string>;
  /** Desktop-only: render the guardia's amount next to the dot (CSS-hidden on
      mobile — hidden lg:inline). */
  showAmounts?: boolean;
  /** First ACTIVE start transaction per institution (used for the amount). */
  startShiftByInstitution?: Map<string, Transaction>;
}

// Guardia-duration marker, visible at ALL breakpoints (single representation
// of guardias on the calendar): a solid dot at the START day of each guardia +
// a segment in the SAME opaque institution color as the dot (no translucency).
// On desktop (showAmounts) the line shows dot + amount + segment; on mobile
// the amount is CSS-hidden (hidden lg:inline) and the cell shows the count
// badge instead. The grid "lines" are the calendar grid's own background
// showing through the 1px gap between cells (gap-px) — so the container is
// WIDENED by 18px (w-[calc(100%+18px)]) and shifted 9px each way (-mx-[9px]):
// width:100% alone would only SHIFT the box, leaving a 17px hole (8px padding
// + 8px + 1px gap) at every cell boundary. The widened box spans from 1px over
// the left gap to 1px over the right gap, and relative z-[5] paints it ABOVE
// the grid background: the line truly crosses the calendar grid. The end
// marker is PER GUARDIA (a guardia ends on the day equal to its endDate): on
// that day the segment stops short (mr-1 rounded-r-full) and a short VERTICAL
// end marker marks "termina acá". When one guardia ENDS the same day another
// one STARTS (same institution), the caller renders TWO distinct lines — the
// ending one (segment + marker, no dot) and the starting one (dot + amount +
// segment). Vertical spacing comes from SLOTS rendered POSITIONALLY: the
// container has a 2px flex gap and renders ONE child per slot — the real line
// row for occupied slots, an invisible 8px SPACER (h-2) for empty ones. A line
// in slot s always has EXACTLY s-1 preceding children (8px each + 2px gap), so
// its absolute Y position is (s-1)*10px from the container top — IDENTICAL
// across days whether the slots above it are real lines or gaps. A line that
// ends leaves a spacer in its slot; the lines below NEVER move. Every row has
// a UNIFORM 8px height (h-2) so segments sit on the SAME axis in every cell.
export function DurationLines({
  lines, colorMap, showAmounts = false, startShiftByInstitution,
}: DurationLinesProps) {
  if (lines.length === 0) return null;

  // One child per slot: occupied slots render the line, empty slots an
  // invisible 8px spacer — slot s always has exactly s-1 preceding children.
  const bySlot = new Map(lines.map(l => [l.slot, l]));
  const maxSlot = Math.max(...lines.map(l => l.slot), 0);

  return (
    <div
      aria-hidden
      data-testid="duration-lines"
      className="flex flex-col gap-[2px] mt-1 -mx-[9px] w-[calc(100%+18px)] min-w-0 relative z-[5]"
    >
      {Array.from({ length: maxSlot }, (_, i) => {
        const slot = i + 1;
        const line = bySlot.get(slot);
        if (!line) {
          // Empty slot above a lower line — keeps its Y position identical
          // across days whether the slot held a line or not.
          return <div key={`gap-${slot}`} data-testid="duration-slot-gap" className="h-2" />;
        }
        const { institution, startsToday, endsToday } = line;
        const color = colorMap.get(institution);
        if (!color) {
          // Unknown institution (no color mapping) — keep the slot occupied so
          // lines below stay at their persistent Y position (same rule as an
          // empty slot: the row accounting must not collapse).
          return <div key={`gap-${slot}`} data-testid="duration-slot-gap" className="h-2" />;
        }
        const tx = startsToday && showAmounts
          ? startShiftByInstitution?.get(institution)
          : undefined;
        return (
          <div
            key={`${institution}-${startsToday ? 'start' : 'end'}`}
            data-testid="duration-line"
            // Every row keeps the SAME height (h-2 = 8px) so the 3px segment
            // is centered on the SAME vertical axis in every cell: a start day
            // (dot = 8px) and a plain coverage day render the segment at the
            // exact same height — the guardia line stays perfectly straight
            // across 24/48/72h, the segment comes out of the dot's center.
            // On a START day the row gets pl-1.5 so the dot sits a bit away
            // from the cell's left edge (nicer); the flex-1 segment still runs
            // to the right gap, so the line still crosses into the next day.
            // With an amount the row adds lg:gap-1 (DESKTOP only — on mobile
            // the amount is display:none, and a base gap would still apply
            // between dot and segment, breaking the flush dot->segment look).
            className={cn(
              "flex items-center w-full min-w-0 h-2",
              startsToday && "pl-1.5",
              startsToday && showAmounts && "lg:gap-1",
            )}
          >
            {startsToday && (
              <div
                data-testid="duration-dot"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
            )}
            {tx && (
              <span
                data-testid="duration-amount"
                className={cn(
                  "hidden lg:inline text-[7px] font-black leading-none truncate shrink-0",
                  tx.status === PaymentStatus.PAID ? "text-green-600 dark:text-green-500" : "text-slate-900 dark:text-white"
                )}
              >
                {formatCompactAmount(tx.amount)}
              </span>
            )}
            <div
              data-testid="duration-segment"
              className={cn(
                "h-[3px] flex-1 min-w-0",
                endsToday && "mr-1 rounded-r-full",
              )}
              style={{ backgroundColor: color }}
            />
            {endsToday && (
              <div
                data-testid="duration-end-marker"
                className="w-[2px] h-2 rounded-full shrink-0 mr-1"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
