import { closeSync, existsSync, openSync, readSync } from "node:fs";

export const PUBLISHED_BUILD_PLATFORM = "linux";
export const PUBLISHED_BUILD_ARCH = "x64";

const HEADER_SIZE = 4096;
const MAX_FAT_ARCH_COUNT = 30;

function mapElfMachine(machine) {
  return machine === 62 ? "x64" : machine === 183 ? "arm64" : null;
}

function mapMachCpuType(cpuType) {
  return cpuType === 0x01000007 ? "x64" : cpuType === 0x0100000c ? "arm64" : null;
}

function mapPeMachine(machine) {
  return machine === 0x8664 ? "x64" : machine === 0xaa64 ? "arm64" : null;
}

function readUInt16(buffer, offset, littleEndian) {
  return littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
}

function readUInt32(buffer, offset, littleEndian) {
  return littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);
}

function detectElfTarget(buffer) {
  if (buffer.length < 20 || buffer.readUInt32BE(0) !== 0x7f454c46) return null;
  const littleEndian = buffer[5] !== 2;
  const arch = mapElfMachine(readUInt16(buffer, 18, littleEndian));
  return arch ? { platform: "linux", architectures: [arch] } : null;
}

const THIN_MACH_MAGIC = new Map([
  [0xfeedface, false],
  [0xfeedfacf, false],
  [0xcefaedfe, true],
  [0xcffaedfe, true],
]);
const FAT_MACH_MAGIC = new Map([
  [0xcafebabe, false],
  [0xcafebabf, false],
  [0xbebafeca, true],
  [0xbfbafeca, true],
]);

function detectMachTarget(buffer) {
  if (buffer.length < 8) return null;
  const magic = buffer.readUInt32BE(0);

  if (THIN_MACH_MAGIC.has(magic)) {
    const arch = mapMachCpuType(readUInt32(buffer, 4, THIN_MACH_MAGIC.get(magic)));
    return arch ? { platform: "darwin", architectures: [arch] } : null;
  }
  if (!FAT_MACH_MAGIC.has(magic)) return null;

  const littleEndian = FAT_MACH_MAGIC.get(magic);
  const archCount = readUInt32(buffer, 4, littleEndian);
  if (archCount > MAX_FAT_ARCH_COUNT) return null;
  const entrySize = magic === 0xcafebabf || magic === 0xbfbafeca ? 32 : 20;
  const architectures = new Set();
  for (let index = 0; index < archCount; index += 1) {
    const offset = 8 + index * entrySize;
    if (offset + 4 > buffer.length) break;
    const arch = mapMachCpuType(readUInt32(buffer, offset, littleEndian));
    if (arch) architectures.add(arch);
  }
  return architectures.size > 0 ? { platform: "darwin", architectures: [...architectures] } : null;
}

function detectPeTarget(buffer) {
  if (buffer.length < 0x40 || buffer.readUInt16LE(0) !== 0x5a4d) return null;
  const peHeaderOffset = buffer.readUInt32LE(0x3c);
  if (peHeaderOffset + 6 > buffer.length || buffer.readUInt32LE(peHeaderOffset) !== 0x00004550) {
    return null;
  }
  const arch = mapPeMachine(buffer.readUInt16LE(peHeaderOffset + 4));
  return arch ? { platform: "win32", architectures: [arch] } : null;
}

export function detectNativeBinaryTarget(buffer) {
  return detectElfTarget(buffer) ?? detectMachTarget(buffer) ?? detectPeTarget(buffer);
}

export function readNativeBinaryTarget(binaryPath) {
  if (!existsSync(binaryPath)) return null;
  let fd;
  try {
    fd = openSync(binaryPath, "r");
    const buffer = Buffer.alloc(HEADER_SIZE);
    const bytesRead = readSync(fd, buffer, 0, HEADER_SIZE, 0);
    return detectNativeBinaryTarget(buffer.subarray(0, bytesRead));
  } catch (error) {
    console.warn(`  ⚠️  Could not read native binary at ${binaryPath}: ${error.message}`);
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

export function isNativeBinaryCompatible(
  binaryPath,
  { runtimePlatform = process.platform, runtimeArch = process.arch, dlopen = process.dlopen } = {}
) {
  const target = readNativeBinaryTarget(binaryPath);
  if (target) {
    const platformMatches =
      target.platform === runtimePlatform ||
      (target.platform === "linux" && runtimePlatform === "android");
    if (!platformMatches || !target.architectures.includes(runtimeArch)) return false;
  } else if (runtimePlatform !== PUBLISHED_BUILD_PLATFORM || runtimeArch !== PUBLISHED_BUILD_ARCH) {
    return false;
  }

  try {
    dlopen({ exports: {} }, binaryPath);
    return true;
  } catch (error) {
    console.warn(`  ⚠️  Native binary dlopen failed: ${error.message}`);
    return false;
  }
}
