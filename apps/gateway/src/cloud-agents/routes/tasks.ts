import { NextResponse, type NextRequest } from "./next-compat.js";
import { getAgent } from "../domain/registry.js";
import type { CloudAgentTaskRow } from "../domain/db.js";
import {
  createCloudAgentTaskTable,
  insertCloudAgentTask,
  getAllCloudAgentTasks,
  getCloudAgentTasksByProvider,
  getCloudAgentTasksByStatus,
  deleteCloudAgentTask,
} from "../domain/db.js";
import {
  getCloudAgentCorsHeaders,
  getCloudAgentCredentials,
  requireCloudAgentManagementAuth,
  serializeCloudAgentTask,
} from "../domain/api.js";
import { CreateCloudAgentTaskSchema } from "../domain/types.js";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { emit } from "@orbit/core/events/eventBus";

function getLimit(value: string | null): number {
  const parsed = Number.parseInt(value || "50", 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(parsed, 500));
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { headers: getCloudAgentCorsHeaders(request) });
}

export async function GET(request: NextRequest) {
  try {
    const authError = await requireCloudAgentManagementAuth(request);
    if (authError) return authError;

    createCloudAgentTaskTable();

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider");
    const status = searchParams.get("status");
    const limit = getLimit(searchParams.get("limit"));

    let tasks: CloudAgentTaskRow[];
    if (providerId) {
      tasks = getCloudAgentTasksByProvider(providerId, limit);
    } else if (status) {
      tasks = getCloudAgentTasksByStatus(status, limit);
    } else {
      tasks = getAllCloudAgentTasks(limit);
    }

    return NextResponse.json(
      {
        data: tasks.map(serializeCloudAgentTask),
      },
      { headers: getCloudAgentCorsHeaders(request) }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
          "Internal server error",
      },
      { status: 500, headers: getCloudAgentCorsHeaders(request) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireCloudAgentManagementAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const validation = CreateCloudAgentTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: getCloudAgentCorsHeaders(request) }
      );
    }

    const validated = validation.data;

    const agent = getAgent(validated.providerId);
    if (!agent) {
      return NextResponse.json(
        { error: `Unknown provider: ${validated.providerId}` },
        { status: 400, headers: getCloudAgentCorsHeaders(request) }
      );
    }

    const credentials = await getCloudAgentCredentials(validated.providerId);
    if (!credentials) {
      return NextResponse.json(
        {
          error: `No active credentials configured for cloud agent provider: ${validated.providerId}`,
        },
        { status: 400, headers: getCloudAgentCorsHeaders(request) }
      );
    }

    const task = await agent.createTask(
      {
        prompt: validated.prompt,
        source: validated.source,
        options: validated.options || {},
      },
      credentials
    );

    createCloudAgentTaskTable();
    insertCloudAgentTask({
      id: task.id,
      provider_id: task.providerId,
      external_id: task.externalId || null,
      status: task.status,
      prompt: task.prompt,
      source: JSON.stringify(task.source),
      options: JSON.stringify(task.options),
      result: null,
      activities: JSON.stringify(task.activities),
      error: null,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
      completed_at: null,
    });
    emit("agent.task.updated", { source: "cloud-agent", taskId: task.id, state: task.status, timestamp: Date.now() });

    return NextResponse.json(
      {
        data: {
          id: task.id,
          providerId: task.providerId,
          externalId: task.externalId,
          status: task.status,
          prompt: task.prompt,
          source: task.source,
          options: task.options,
          createdAt: task.createdAt,
        },
      },
      { status: 201, headers: getCloudAgentCorsHeaders(request) }
    );
  } catch (error) {
    console.error("Failed to create cloud agent task", error);
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
          "Internal server error",
      },
      { status: 500, headers: getCloudAgentCorsHeaders(request) }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authError = await requireCloudAgentManagementAuth(request);
    if (authError) return authError;

    createCloudAgentTaskTable();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID required" },
        { status: 400, headers: getCloudAgentCorsHeaders(request) }
      );
    }

    deleteCloudAgentTask(taskId);
    emit("agent.task.updated", { source: "cloud-agent", taskId, state: "cancelled", timestamp: Date.now() });

    return NextResponse.json({ success: true }, { headers: getCloudAgentCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(error instanceof Error ? error.message : "Unknown error") ||
          "Internal server error",
      },
      { status: 500, headers: getCloudAgentCorsHeaders(request) }
    );
  }
}
