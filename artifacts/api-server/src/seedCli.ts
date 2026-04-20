import { main as runDemoSeed } from "./demoSeed";
import { main as runDemoSeedContinue } from "./demoSeedContinue";
import { main as runDemoSeedPatients } from "./demoSeedPatients";

async function seed() {
  console.log("[seedCli] Starting demo seed...");
  await runDemoSeed();
  await runDemoSeedContinue();
  await runDemoSeedPatients();
  console.log("[seedCli] All seed steps complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seedCli] Failed:", err);
  process.exit(1);
});
