import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { webpush } from "@/lib/webpush";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // up to 60s on Vercel Hobby

async function handler(req: NextRequest) {
  // Verify cron secret. Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // when configured in vercel.json; external cron services can pass the same.
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const due = await prisma.reminder.findMany({
    where: {
      sentAt: null,
      remindAt: { lte: now },
    },
    include: {
      task: { select: { id: true, title: true, projectId: true } },
    },
    take: 100,
  });

  if (due.length === 0) {
    return NextResponse.json({ sent: 0, reminders: 0 });
  }

  let sentCount = 0;
  const expiredEndpoints: string[] = [];

  for (const reminder of due) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: reminder.userId },
    });

    if (subscriptions.length > 0) {
      const payload = JSON.stringify({
        title: reminder.task.title,
        body: "Rappel programmé",
        url: `/projects/${reminder.task.projectId}`,
        tag: `reminder-${reminder.id}`,
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sentCount++;
        } catch (err: unknown) {
          const e = err as { statusCode?: number; body?: string };
          if (e.statusCode === 404 || e.statusCode === 410) {
            // Subscription gone — drop it
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error("[cron] push failed", e.statusCode, e.body);
          }
        }
      }
    }

    // Mark as sent even if user had no devices — avoids infinite retries
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: now },
    });
  }

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }

  return NextResponse.json({
    sent: sentCount,
    reminders: due.length,
    cleaned: expiredEndpoints.length,
  });
}

export const GET = handler;
export const POST = handler;
