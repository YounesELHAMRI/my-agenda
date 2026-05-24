"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Bell, X } from "lucide-react";
import {
  toDateTimeInputValue,
  fromDateTimeInputValue,
  formatDateTime,
} from "@/lib/date";
import { ensurePushSubscription, isPushSupported } from "@/lib/push";

export function RemindersSection({ taskId }: { taskId: string }) {
  const utils = trpc.useUtils();
  const [newAt, setNewAt] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: reminders = [] } = trpc.reminder.listForTask.useQuery({
    taskId,
  });

  const subscribePush = trpc.push.subscribe.useMutation();

  const create = trpc.reminder.create.useMutation({
    onSuccess: () => {
      setNewAt("");
      setErr(null);
      utils.reminder.listForTask.invalidate({ taskId });
    },
  });

  const del = trpc.reminder.delete.useMutation({
    onSuccess: () => utils.reminder.listForTask.invalidate({ taskId }),
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const date = fromDateTimeInputValue(newAt);
    if (!date) return;
    if (date.getTime() <= Date.now()) {
      setErr("Choisis une date dans le futur");
      return;
    }

    try {
      setErr(null);
      // Make sure this device can receive pushes
      const subscription = await ensurePushSubscription();
      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await subscribePush.mutateAsync({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          userAgent: navigator.userAgent,
        });
      }
      create.mutate({ taskId, remindAt: date });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur inconnue");
    }
  }

  const supported = isPushSupported();

  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 block">
        Rappels
      </label>

      {reminders.length > 0 && (
        <ul className="space-y-1 mb-2">
          {reminders.map((r) => {
            const sent = r.sentAt != null;
            return (
              <li
                key={r.id}
                className="flex items-center gap-2 text-sm py-1 px-2 rounded-md bg-gray-50 dark:bg-gray-800"
              >
                <Bell
                  size={14}
                  className={sent ? "text-gray-400" : "text-blue-500"}
                />
                <span
                  className={
                    sent
                      ? "flex-1 text-gray-400 line-through"
                      : "flex-1 text-gray-700 dark:text-gray-200"
                  }
                >
                  {formatDateTime(r.remindAt)}
                </span>
                <button
                  type="button"
                  onClick={() => del.mutate({ id: r.id })}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Supprimer le rappel"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          type="datetime-local"
          value={newAt}
          onChange={(e) => setNewAt(e.target.value)}
          min={toDateTimeInputValue(new Date())}
          className="flex-1 text-sm bg-transparent border border-dashed border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-solid text-gray-900 dark:text-gray-50"
        />
        <button
          type="submit"
          disabled={!newAt || create.isPending || !supported}
          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-700 flex-shrink-0"
        >
          Rappel
        </button>
      </form>

      {!supported && (
        <p className="text-xs text-gray-500 mt-1">
          Notifications non supportées par ce navigateur.
        </p>
      )}
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}
