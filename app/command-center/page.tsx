import { CommandCenter } from "@/components/sections/CommandCenter";

export default function CommandCenterPage() {
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="text-4xl font-orbitron font-bold text-white mb-8">Empire Command Center</h1>
      <p className="text-muted-foreground mb-8 font-mono">
        Remote deployment and telemetry control for the Dark Empire Trading Engine.
      </p>
      <CommandCenter />
    </div>
  );
}
