const REDOC_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Orbit API Reference</title><meta name="description" content="Redoc-rendered OpenAPI 3.0 spec for the Orbit v1 API." />
<link rel="icon" href="/favicon.ico" /><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}#redoc-container{min-height:100vh}.or-fallback{padding:24px;max-width:800px;margin:64px auto;line-height:1.6;color:#1a1a1a}.or-fallback h1{font-size:24px;margin-bottom:12px}.or-fallback a{color:#06c}.or-fallback code{background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:13px}</style></head>
<body><noscript><div class="or-fallback"><h1>JavaScript required</h1><p>Redoc needs JavaScript to render the OpenAPI spec. The raw spec is also <a href="/openapi.yaml">available as YAML</a>.</p></div></noscript>
<div id="redoc-container"></div><script src="https://cdn.redocly.com/redoc/latest/bundles/redoc.standalone.js"></script><script>if(typeof Redoc!=="undefined"){Redoc.init("/openapi.yaml",{scrollYOffset:0,hideDownloadButton:false,expandResponses:"200,201",jsonSampleExpandLevel:2,pathInMiddlePanel:true,requiredPropsFirst:true,sortPropsAlphabetically:false,theme:{colors:{primary:{main:"#0066cc"}},typography:{fontSize:"15px",fontFamily:"-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"}}},document.getElementById("redoc-container"))}else{document.getElementById("redoc-container").innerHTML='<div class="or-fallback"><h1>Redoc CDN unreachable</h1><p>The Redoc bundle did not load. The raw spec is still <a href="/openapi.yaml">available as YAML</a>.</p></div>'}</script></body></html>`;

export function GET(): Response {
  return new Response(REDOC_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=300", "X-Robots-Tag": "noindex" } });
}
