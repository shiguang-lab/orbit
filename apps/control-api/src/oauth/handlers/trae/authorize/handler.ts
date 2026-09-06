import { createProviderConnection } from "@shiguang-gateway/core-domain/control/models";
import { parseTraeCallbackQuery } from "./parse-callback.js";

function callbackCopy(request: Request, success: boolean) {
  const zh = request.headers.get("accept-language")?.toLowerCase().includes("zh") === true;
  if (zh) {
    return success
      ? { title: "Trae 授权成功", body: "可以关闭此授权窗口。" }
      : { title: "Trae 授权失败", body: "请返回控制台重试。" };
  }
  return success
    ? { title: "Trae authorization succeeded", body: "You can close this authorization window." }
    : { title: "Trae authorization failed", body: "Return to the dashboard and try again." };
}

function htmlClose(request: Request, message: Record<string, unknown>): Response {
  const success = message.success === true;
  const copy = callbackCopy(request, success);
  const safe = JSON.stringify({ type: "trae-oauth-callback", ...message }).replace(/</g, "\\u003c");
  return new Response(
    `<!doctype html><html><body style="font:16px sans-serif;padding:40px">
      <h2 style="margin:0 0 8px">${copy.title}</h2><p>${copy.body}</p>
      <script>(function(){try{if(!window.opener)return;var msg=${safe};var loc=window.location;var targets=[loc.origin];var alt=loc.hostname==="127.0.0.1"?"localhost":loc.hostname==="localhost"?"127.0.0.1":null;if(alt)targets.push(loc.protocol+"//"+alt+(loc.port?":"+loc.port:""));targets.forEach(function(t){try{window.opener.postMessage(msg,t)}catch(e){}})}catch(e){}})();setTimeout(function(){window.close()},${success ? 800 : 4000});</script>
    </body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/** Root callback required verbatim by Trae's OAuth server. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseTraeCallbackQuery(url.searchParams);
  if (!parsed.ok) return htmlClose(request, { success: false, error: parsed.error });
  try {
    const connection = await createProviderConnection(parsed.record);
    return htmlClose(request, {
      success: true,
      connectionId: connection?.id,
      loginTraceId: url.searchParams.get("loginTraceID") || null,
    });
  } catch (error) {
    console.error("[trae callback] error:", error);
    return htmlClose(request, { success: false, error: "Internal error during callback" });
  }
}
