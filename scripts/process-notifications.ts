import { processPendingNotificationQueue } from "../src/lib/server/notification-queue";

function readLimitArgument() {
  const flagIndex = process.argv.indexOf("--limit");

  if (flagIndex === -1) {
    return 25;
  }

  const rawValue = process.argv[flagIndex + 1];
  const limit = Number(rawValue);

  if (!rawValue || Number.isNaN(limit) || !Number.isFinite(limit) || limit < 1) {
    throw new Error("Informe um valor valido para --limit.");
  }

  return Math.floor(limit);
}

async function main() {
  const limit = readLimitArgument();
  const summary = await processPendingNotificationQueue({ take: limit });

  console.log(`[notifications] pendentes processados=${summary.processed}`);
  console.log(`[notifications] enviados=${summary.sent}`);
  console.log(`[notifications] falharam=${summary.failed}`);
  console.log(`[notifications] suprimidos=${summary.suppressed}`);
  console.log(`[notifications] ignorados=${summary.skipped}`);

  if (summary.warnings.length > 0) {
    console.log("[notifications] avisos:");

    for (const warning of summary.warnings.slice(0, 10)) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error("[notifications] falha ao processar a fila", error);
  process.exit(1);
});
