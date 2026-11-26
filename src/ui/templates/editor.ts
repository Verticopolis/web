import { html, nothing, type TemplateResult } from "lit-html";
import { iconTemplate } from "@verticopolis/components/windows/icons";
import { editorActionRow, editorCardTemplate, editorFact } from "@verticopolis/components/windows/editorCard";
import { isOperational, isTenanted } from "@verticopolis/engine/model/unitState";
import { isCommercialKind, isHotelKind } from "@verticopolis/components/presentation/viewKinds";
import {
  catalogFilmRebook,
  catalogTicketPrice,
  filmEditAction,
  filmPolicyEditAction,
  catalogHouseholdPrice,
  catalogResidents,
  rungFor,
  type Catalog,
  type CatalogCalendar,
  type CatalogRentCadence,
} from "@verticopolis/engine/catalog/catalogTypes";
import { catalogFacility, catalogOpenAt } from "@verticopolis/components/render/catalogIndex";
import type { ScreenDetail, UnitDetail } from "@verticopolis/engine/port/panels";
import { catalogCalendar, priceOptionsFor, rentPerCollection } from "../catalogPricing";
import type { CalendarKind } from "@verticopolis/engine/model/engineTypes";
import { hasAccessDiagnostic, occupantsText } from "../../game/cardLines";
import { rungPickerTemplate, type RungChoice } from "./rungPicker";
import { groupDigits } from "@verticopolis/components/windows/format";

/**
 * The unit editor card, a pure function of (card, catalog, hour, options),
 * drawn on the components' editor card frame (`windows/editorCard`); a
 * shaft's card is the components' `windows/shaftEditor`. It is rendered every
 * pump: lit's binding diff patches only the values that changed, so the
 * buttons and the rename input keep their element identity across refreshes,
 * and a refresh can never recreate a button mid-click. Each button and select
 * is a lit binding that hands its action to `opts.act`. The `data-edit` and
 * `data-field` attributes stay as markers that tests and tooling read.
 *
 * The mobile diagnostics block folds in the card's diagnostic lines (the
 * engine's facts worded by `game/portUnitDiagnostics.ts`, shared with the
 * desktop inspector card). The caller builds those lines on mobile only and
 * hands them over as `diag`; the block renders only when there is at least
 * one line.
 */

/** A theater's screens, the first from its own fields: none off a cinema,
 *  and a second only where it runs two (#1950). */
function cinemaScreens(u: UnitDetail): ScreenDetail[] {
  if (u.kind !== "cinema") return [];
  const first: ScreenDetail = { filmPolicy: u.filmPolicy, filmDays: u.filmDays ?? 0, filmTier: u.filmTier ?? "new" };
  return u.screen2 ? [first, u.screen2] : [first];
}

/** Modern's real-world calendar pays lease rent each month, not each quarter (#2255). */
function leaseLandsMonthly(calendar: CatalogCalendar): boolean {
  return calendar.leasePeriodDays !== calendar.quarterDays;
}

/** A quarterly or monthly rent as one collection pays it on the tower's
 *  calendar (#2107). Where the calendar scales the rent (Modern), the card
 *  leads with what lands each collection and names the rate the price
 *  controls set, so a $10,000 office reads "$333" on the canon calendar's
 *  3-day quarter and "$3,333" on the real-world calendar's 30-day month
 *  (#2255), rather than a figure it never pays. */
function rentLine(cadence: CatalogRentCadence, price: number, calendar: CatalogCalendar): string {
  const paid = rentPerCollection(cadence, price, calendar);
  if (paid === price) return `$${groupDigits(price)}`;
  const leaseUnit = leaseLandsMonthly(calendar) ? "month" : "quarter";
  const period =
    cadence === "quarterly"
      ? `${calendar.leasePeriodDays}-day ${leaseUnit}`
      : `${calendar.maintenancePeriodDays}-day month`;
  return `$${groupDigits(paid)} (the $${groupDigits(price)} rate scaled to a ${period})`;
}

/** What the unit editor card takes besides the unit, the catalog and the hour. */
export interface UnitEditorOptions {
  /** Runs a button's action (its `data-edit`), or the rung picker's
   *  (`rung`) when its choice changes. */
  act(action: string): void;
  /** The title bar's ✕. */
  close(): void;
  /** A phone's card, which folds in the problem lines (`diag`). */
  readonly mobile?: boolean;
  readonly diag?: readonly TemplateResult[];
  /** The calendar the tower chose (the view header's `modernCalendar`); left
   *  out, the mode's default calendar. */
  readonly calendar?: CalendarKind;
}

/** The unit editor card. */
export function unitEditorTemplate(
  u: UnitDetail,
  catalog: Catalog,
  hour: number,
  opts: UnitEditorOptions,
): TemplateResult {
  const mobile = opts.mobile ?? false;
  const diag = opts.diag ?? [];
  const calendar = opts.calendar;
  /** A button's or the rung picker's handler: hands its action to the game. */
  const act = (action: string) => () => opts.act(action);
  const f = catalogFacility(catalog, u.kind);
  const floorLabel = u.floor >= 1 ? `Floor ${u.floor}` : `Basement ${1 - u.floor}`;
  const canRename = u.kind === "office" || u.kind === "condo";
  const rcfg = f.rent;
  const rows: TemplateResult[] = [editorFact("Location", floorLabel), editorFact("Status", u.state, "status")];
  // A venue people come to in person shows its live customer count; "(closed)"
  // only for a tenanted venue outside business hours, a vacant or
  // under-construction unit already tells that story in its Status row. The
  // engine sends null for a venue nobody is sent to in person (a spa, a shop),
  // whose patronage block counts its customers instead. Everything else reads
  // occupants against the unit's real occupancy (a Modern condo's household,
  // the flat catalog value for the rest), never a bare `5/3` for a big family.
  if (isCommercialKind(u.kind) && f.population > 0) {
    const closed = isTenanted(u) && !catalogOpenAt(f, hour);
    if (u.customersIn !== null)
      rows.push(editorFact("Customers", `${u.customersIn}${closed ? " (closed)" : ""}`, "customers"));
  } else if (f.population) {
    rows.push(
      editorFact(
        "Occupants",
        occupantsText(u.occupants, catalogResidents(f, u.residents), u.workersComing),
        "occupants",
      ),
    );
  }
  // On mobile the folded-in diagnostics carry the richer access reachability
  // line, so the plain Yes/No row would duplicate it: drop it there. But keep
  // it for a zero-population service kind (security/medical/housekeeping/metro),
  // whose diagnostics emit NO access line, so its connectivity still shows.
  if (!mobile || !hasAccessDiagnostic(catalog, u)) {
    const served = u.served;
    // The third state (#370): the floor is CONNECTED to the lobby (served) yet no
    // commuter completes the trip, so "Yes" would lie. Reachability is uncapped
    // now (#503), so this happens only in Classic, when the sole path is a
    // stair/escalator climb past the walk budget. Only kinds that draw
    // commuters/visitors read it (hasAccessDiagnostic, the same predicate the
    // diagnostics line uses); zero-population service kinds keep plain Yes/No.
    // "No route" echoes the inspector sentence and the stats footnote.
    const cutOff = served && hasAccessDiagnostic(catalog, u) && !u.reachable;
    let text = "Yes";
    if (!served) text = "No";
    else if (cutOff) text = "No route";
    rows.push(
      editorFact(
        "Elevator access",
        html`<span style="color:${served && !cutOff ? "var(--good)" : "var(--bad)"}">${text}</span>`,
        "served",
      ),
    );
  }
  const evalPct = Math.round(u.satisfaction * 100);
  rows.push(
    editorFact("Eval", html`<span class="evalbar"><span style="width:${evalPct}%"></span></span> ${evalPct}%`, "eval"),
  );
  if (rcfg) {
    let label = "Quarterly rent";
    if (u.kind === "condo") label = "Sale price";
    else if (isHotelKind(u.kind)) label = "Room rate";
    else if (rcfg.cadence === "maintenancePeriod" || leaseLandsMonthly(catalogCalendar(catalog, calendar)))
      label = "Monthly rent";
    // For a SOLD condo the "Sale price" is what it actually fetched, the
    // household-scaled amount (and exactly what the buy-back will reclaim), not
    // the base asking. householdPrice falls back to the base when there's no
    // household, so Classic and unsold condos are unchanged. "No Rate" reads
    // where the price normally shows for a unit taken off the market.
    let rent = "No Rate";
    if (!u.noRate && u.kind === "condo") rent = `$${groupDigits(catalogHouseholdPrice(catalog, u.price, u.residents))}`;
    else if (!u.noRate && isHotelKind(u.kind)) rent = `$${groupDigits(u.price)}/night`;
    else if (!u.noRate) rent = rentLine(rcfg.cadence, u.price, catalogCalendar(catalog, calendar));
    rows.push(editorFact(label, rent, "rent"));
  }
  // A theater shows a film on each screen, and the player pays to show
  // another; the catalog lists the mode's films and their prices (#1932,
  // #1950). A Modern theater runs two screens, each with its own row.
  const { films } = catalog.economy;
  const filmLabel = (tier: string | null) => films.find((film) => film.key === tier)?.label ?? "—";
  const screens = cinemaScreens(u);
  if (u.kind === "cinema" && isOperational(u)) {
    // A gutted/burning/under-construction cinema shows no film, omit the rows.
    if (screens.length > 1) {
      screens.forEach((screen, i) => {
        const days = screen.filmDays === 1 ? "1 day" : `${screen.filmDays} days`;
        rows.push(
          editorFact(
            `Screen ${i + 1}`,
            `${filmLabel(screen.filmTier)}, ${days}`,
            i === 0 ? "showing" : `showing${i + 1}`,
          ),
        );
      });
    } else {
      rows.push(editorFact("Now showing", filmLabel(u.filmTier), "showing"));
      rows.push(editorFact("Days showing", u.filmDays ?? 0, "filmDays"));
    }
  }
  if (u.state === "gutted") {
    rows.push(editorFact("Scrap value", "$0"));
    // The pixel warning icon, not the bare glyph: this panel is not a
    // message rail, so no emoji mapper runs on it, and a bare U+26A0 shows as
    // a missing-glyph box on a system without symbol fonts (#794). The icon is
    // hidden from screen readers, so a hidden word keeps the spoken cue.
    rows.push(
      editorFact(
        html`${iconTemplate("warning")}<span class="visually-hidden">Warning</span>`,
        "Gutted: bulldoze and rebuild.",
      ),
    );
  } else {
    rows.push(editorFact("Resale value", `$${groupDigits(f.resaleRefund)}`));
  }

  const actions: TemplateResult[] = [];
  if (canRename) {
    // The `value` binding is an ATTRIBUTE (sets the input's default), so a
    // re-render while the player is typing never clobbers the live text or
    // caret; the label only changes when a rename commits.
    actions.push(
      editorActionRow(
        html`<input class="field" id="ed-name" value=${u.label} /><button class="btn" data-edit="rename" @click=${act("rename")}>Rename</button>`,
      ),
    );
  }
  // Price control, chosen off the SHAPE of priceOptions(), never the mode
  // string: a ladder renders the 1994 rung picker; a band keeps the existing
  // nudge steppers. A SOLD condo is price-locked: the ladder shows the picker
  // DISABLED at the locked rung (the design system's "show why a thing cannot
  // be pressed"); the band keeps today's hidden-row behavior.
  const priceShape = priceOptionsFor(catalog, u.kind);
  if (priceShape?.shape === "ladder") {
    const locked = u.kind === "condo" && u.everOccupied;
    const current: RungChoice = u.noRate ? "noRate" : rungFor(priceShape.rungs, u.price).level;
    let ariaLabel = "Rent level";
    if (u.kind === "condo") ariaLabel = "Sale price level";
    else if (isHotelKind(u.kind)) ariaLabel = "Room rate level";
    actions.push(
      editorActionRow(
        rungPickerTemplate({
          id: "ed-rung",
          rungs: priceShape.rungs,
          current,
          ariaLabel,
          disabled: locked,
          onChange: act("rung"),
        }),
      ),
    );
    // Batch-price every unit of this kind at once (no per-room grind); a sold
    // condo keeps only its locked picker.
    if (!locked) {
      actions.push(
        editorActionRow(
          html`<button class="btn" data-edit="batchKind" @click=${act("batchKind")}>Set all ${f.name.toLowerCase()}s…</button>`,
        ),
      );
    }
  } else if (rcfg && !(u.kind === "condo" && u.everOccupied)) {
    // Price adjuster: offices/hotels any time, condos only while still unsold.
    const what = u.kind === "condo" ? "price" : "rent";
    actions.push(
      editorActionRow(
        html`<button class="btn" data-edit="rentDown" @click=${act("rentDown")}>– ${what}</button><button class="btn" data-edit="rentUp" @click=${act("rentUp")}>+ ${what}</button>`,
      ),
    );
    // Batch-price every unit of this kind at once (no per-room grind).
    actions.push(
      editorActionRow(
        html`<button class="btn" data-edit="batchKind" @click=${act("batchKind")}>Set all ${f.name.toLowerCase()}s…</button>`,
      ),
    );
  }
  // Each screen's films to book, then the film it books again once its film
  // is spent, where the mode rebooks (#1950). Only an open theater shows a
  // film (the engine refuses the others); with two screens each names itself.
  screens.forEach((screen, i) => {
    const named = screens.length > 1;
    if (isOperational(u)) {
      const book = films.map(
        (film) =>
          html`<button class="btn" data-edit=${filmEditAction(film.key, i)} @click=${act(filmEditAction(film.key, i))}>${film.label} ($${groupDigits(film.price)})</button>`,
      );
      if (named) actions.push(html`<div class="ed-screen">Book a film on screen ${i + 1}</div>`);
      actions.push(editorActionRow(html`${book}`));
    }
    const rebook = catalogFilmRebook(catalog, screen.filmPolicy);
    if (rebook) {
      const label = rebook.film === null ? "Off" : filmLabel(rebook.film);
      const what = named ? `Screen ${i + 1} auto-rebook` : "Auto-rebook";
      actions.push(
        editorActionRow(
          html`<button class="btn" data-edit=${filmPolicyEditAction(i)} @click=${act(filmPolicyEditAction(i))}>${what}: ${label} ▸</button>`,
        ),
      );
    }
  });
  // The theater's ticket price (#1950), where the mode has one.
  const ticket = u.kind === "cinema" ? catalogTicketPrice(catalog, u.ticketPrice) : null;
  if (ticket) {
    actions.push(
      editorActionRow(
        html`<button class="btn" data-edit="ticketPrice" @click=${act("ticketPrice")}>Ticket price: ${ticket.label} ▸</button>`,
      ),
    );
  }
  // Canon retail reroll: only offer on shop / fastFood / restaurant. Legacy
  // retail units without a subtype still get the button so a player can opt
  // into a variant. Kinds without a canon list are gated out at the action
  // handler (rerollSubtype returns undefined), but the button belongs off
  // their card to avoid a visible no-op affordance.
  if (u.kind === "shop" || u.kind === "fastFood" || u.kind === "restaurant") {
    actions.push(
      editorActionRow(
        html`<button class="btn" data-edit="changeVariety" @click=${act("changeVariety")}>Change variety ▸</button>`,
      ),
    );
  }
  actions.push(
    editorActionRow(html`<button class="btn danger" data-edit="sell" @click=${act("sell")}>Sell / Bulldoze</button>`),
  );

  // On mobile, fold the inspector card's diagnostics in as a live block between
  // the stats and the controls (one panel, no separate card). Desktop leaves
  // them to the hover card, so the block only exists on mobile.
  // Only the mobile fold-in shows the diagnostics, so only the mobile caller
  // pays for computing them (the engine's facts query can walk the tower);
  // desktop leaves the block to the hover card.
  const diagnostics = diag.length ? html`<div class="ed-diagnostics" data-field="diagnostics">${diag}</div>` : nothing;
  // Canon retail variant titles the editor card too, matching the inspector.
  return editorCardTemplate({
    key: `unit:${u.id}`,
    title: u.subtype ?? f.name,
    facts: rows,
    block: diagnostics,
    actions,
    close: () => opts.close(),
  });
}
