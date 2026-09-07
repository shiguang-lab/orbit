import assert from "node:assert/strict";
import { test } from "node:test";
import type { NetworkInterfaceInfo } from "node:os";
import { resolveNetworkInfo } from "../src/network/network-info.js";

function address(address: string, internal = false): NetworkInterfaceInfo {
  return {
    address,
    netmask: "255.255.255.0",
    family: "IPv4",
    mac: "00:00:00:00:00:00",
    internal,
    cidr: `${address}/24`,
  };
}

test("advertises the split edge port and separates LAN from Tailscale addresses", async () => {
  const result = await resolveNetworkInfo(null, {
    env: { EDGE_GATEWAY_PORT: "9100" },
    networkInterfaces: () => ({
      lo0: [address("127.0.0.1", true)],
      en0: [address("192.168.1.20")],
      tailscale0: [address("100.64.10.3")],
    }),
    getTailscaleStatus: async () => ({
      running: true,
      tunnelUrl: "https://machine.example.ts.net/",
      apiUrl: "https://machine.example.ts.net/v1",
    }),
  });

  assert.deepEqual(result, {
    localUrl: "http://localhost:9100/v1",
    lanUrls: ["http://192.168.1.20:9100/v1"],
    tailscaleUrl: "https://machine.example.ts.net/v1",
    tailscaleIpUrl: "http://100.64.10.3:9100/v1",
    port: 9100,
    tailscaleDetails: {
      connected: true,
      ip: "100.64.10.3",
      magicDns: null,
      hostname: null,
      source: "network-interface",
    },
  });
});

test("uses a Tailscale request host when the edge status command is unavailable", async () => {
  const result = await resolveNetworkInfo("100.100.10.4:9443", {
    env: { EDGE_GATEWAY_PORT: "invalid" },
    networkInterfaces: () => ({}),
    getTailscaleStatus: async () => {
      throw new Error("edge unavailable");
    },
  });

  assert.equal(result.localUrl, "http://localhost:8787/v1");
  assert.equal(result.tailscaleUrl, "http://100.100.10.4:9443/v1");
  assert.equal(result.tailscaleIpUrl, "http://100.100.10.4:8787/v1");
  assert.equal(result.port, 8787);
  assert.deepEqual(result.tailscaleDetails, {
    connected: true,
    ip: "100.100.10.4",
    magicDns: null,
    hostname: null,
    source: "passive-request",
  });
});

test("discovers Tailscale from environment variables in NAS deployment", async () => {
  const result = await resolveNetworkInfo(null, {
    env: {
      EDGE_GATEWAY_PORT: "8787",
      TAILSCALE_IP: "100.87.115.78",
      TAILSCALE_HOSTNAME: "my-nas",
      MAGIC_DNS: "my-nas.ts.net",
    },
    networkInterfaces: () => ({
      eth0: [address("172.18.0.2")], // Docker bridge network
    }),
  });

  assert.equal(result.localUrl, "http://localhost:8787/v1");
  assert.equal(result.tailscaleIpUrl, "http://100.87.115.78:8787/v1");
  assert.equal(result.tailscaleUrl, "https://my-nas.ts.net/v1");
  assert.equal(result.tailscaleDetails?.connected, true);
  assert.equal(result.tailscaleDetails?.ip, "100.87.115.78");
  assert.equal(result.tailscaleDetails?.magicDns, "my-nas.ts.net");
  assert.equal(result.tailscaleDetails?.source, "env");
});
