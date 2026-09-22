// test.ts
import { Dashboard } from "@dashwire/react-sdk";

const dashboard = new Dashboard({
  id: "mijn-test-project",
  name: "Mijn Test Project",
  server: {
    url: "http://localhost:4000",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGVzdCBKV1QiLCJzY29wZSI6ImRhc2h3aXJlLWFjY2VzcyIsImlhdCI6MTc5MDEwMDQwNH0.Vk2TNS92K5LG2KD7YMzW-gP2v9BqdSVRpjri8_nuEhg"
  }
});

let systemTerminal: any;

dashboard.section("Verlichting", (section) => {
  section.toggle("active", {
    label: "Lampen Aan",
    value: true,
    onChange: (val: boolean) => {
      console.log(`💡 Commando ontvangen: Lampen is nu ${val}`);
      systemTerminal.log.info(`Lampen status gewijzigd naar: ${val ? "AAN" : "UIT"}`);
    }
  });

  section.slider("brightness", {
    label: "Helderheid",
    value: 80,
    min: 30,
    max: 100,
    onChange: (val: number) => {
      console.log(`🎚️ Helderheid geüpdatet naar: ${val}`);
      systemTerminal.log.info(`Helderheid gewijzigd naar: ${val}`);
    }
  });
});

let statusHandle: any;

dashboard.section("Systeem", (section) => {
  section.action("restart", {
    label: "Herstart Systeem",
    onExecute: () => {
      systemTerminal.log.warn("Systeemherstart aangevraagd vanuit het dashboard!");
    }
  });

  statusHandle = section.status("status", {
    label: "Apparaat Status",
    value: "Operationeel",
    tone: "ok"
  });

  systemTerminal = section.terminal("system-logs", {
    label: "Systeem Logboeken",
    writable: true,
    onCommand: (cmd: string) => {
      systemTerminal.log.warn(`Commando ontvangen: ${cmd}`);
    }
  });
});

async function run() {
  console.log("🚀 Verbinden met Dashwire server...");
  await dashboard.connect();
  console.log("✅ Verbonden en geregistreerd!");

  let toggled = false;
  setInterval(() => {
    toggled = !toggled;
    const newVal = toggled ? "Onderhoud bezig" : "Operationeel";
    
    if (statusHandle) {
      statusHandle.setValue(newVal);
    }
    systemTerminal.log.info(`Status gewijzigd naar: ${newVal}`);
    console.log(`🔄 Status geüpdatet naar: ${newVal}`);
  }, 10000);

  setInterval(() => {
    const levels = ["debug", "info", "warn", "error"] as const;
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    systemTerminal.log[randomLevel](`Automatische testlog van niveau [${randomLevel}]`, { tijdstempel: Date.now() });
  }, 4000);
}

run().catch(console.error);