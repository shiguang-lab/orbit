const workerOwnedState = {
  initialized: true,
  modelSyncInitialized: false,
  backgroundServicesOwner: "worker",
} as const;

export async function POST() {
  return Response.json({
    success: true,
    ...workerOwnedState,
    message: "Cloud sync scheduling is owned by the worker",
  });
}

export async function GET() {
  return Response.json({
    ...workerOwnedState,
    message: "Cloud sync scheduling is owned by the worker",
  });
}
