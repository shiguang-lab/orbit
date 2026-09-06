import initializeCloudSync from "@shiguang-gateway/core-domain/control/cloud-sync-initialize";
import { startModelSyncScheduler } from "@shiguang-gateway/core-domain/control/model-sync-scheduler";

let syncInitialized = false;
let modelSyncInitialized = false;

export async function POST() {
  try {
    if (syncInitialized) {
      return Response.json({ message: "Cloud sync already initialized" });
    }

    await initializeCloudSync();
    syncInitialized = true;

    if (!modelSyncInitialized) {
      startModelSyncScheduler();
      modelSyncInitialized = true;
    }

    return Response.json({
      success: true,
      message: "Cloud sync initialized successfully",
      modelSyncEnabled: true,
    });
  } catch (error) {
    console.log("Error initializing cloud sync:", error);
    return Response.json({ error: "Failed to initialize cloud sync" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({
    initialized: syncInitialized,
    modelSyncInitialized,
    message: syncInitialized ? "Cloud sync is running" : "Cloud sync not initialized",
  });
}
