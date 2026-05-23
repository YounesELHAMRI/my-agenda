export type DueTone = "past" | "today" | "soon" | "future";

export function formatDueDate(date: Date | string): { label: string; tone: DueTone } {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (due < today) {
    return {
      label: due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      tone: "past",
    };
  }
  if (due.getTime() === today.getTime()) {
    return { label: "Aujourd'hui", tone: "today" };
  }
  if (due.getTime() === tomorrow.getTime()) {
    return { label: "Demain", tone: "soon" };
  }
  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  if (due < sevenDaysOut) {
    return {
      label: due.toLocaleDateString("fr-FR", { weekday: "long" }),
      tone: "soon",
    };
  }
  if (due.getFullYear() === today.getFullYear()) {
    return {
      label: due.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
      tone: "future",
    };
  }
  return {
    label: due.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    tone: "future",
  };
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateInputValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
