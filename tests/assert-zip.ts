import assert from 'node:assert/strict';
import {crc32} from 'node:zlib';

// Validate stored ZIP exports with Node's independent CRC implementation, without unzip.
export function assertZip(bytes: Uint8Array, files: Record<string, string | Uint8Array>) {
  const zip = Buffer.from(bytes), end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  const count = zip.readUInt16LE(end + 10), start = zip.readUInt32LE(end + 16);
  assert.equal(zip.readUInt16LE(end + 8), count);
  assert.equal(count, Object.keys(files).length);
  assert.equal(start + zip.readUInt32LE(end + 12), end);
  const found: string[] = [];
  let position = start;
  for (let i = 0; i < count; i++) {
    assert.equal(zip.readUInt32LE(position), 0x02014b50);
    assert.equal(zip.readUInt16LE(position + 10), 0);
    const size = zip.readUInt32LE(position + 24), checksum = zip.readUInt32LE(position + 16);
    assert.equal(zip.readUInt32LE(position + 20), size);
    const length = zip.readUInt16LE(position + 28), local = zip.readUInt32LE(position + 42);
    const name = zip.subarray(position + 46, position + 46 + length).toString('utf8');
    assert.ok(Object.hasOwn(files, name));
    assert.equal(zip.readUInt32LE(local), 0x04034b50);
    assert.equal(zip.readUInt16LE(local + 8), 0);
    assert.equal(zip.readUInt32LE(local + 14), checksum);
    assert.equal(zip.readUInt32LE(local + 18), size);
    assert.equal(zip.readUInt32LE(local + 22), size);
    assert.equal(zip.subarray(local + 30, local + 30 + zip.readUInt16LE(local + 26)).toString('utf8'), name);
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(dataStart, dataStart + size);
    assert.deepEqual(data, Buffer.from(files[name]));
    assert.equal(crc32(data), checksum);
    found.push(name);
    position += 46 + length + zip.readUInt16LE(position + 30) + zip.readUInt16LE(position + 32);
  }
  assert.equal(position, end);
  assert.deepEqual(found.sort(), Object.keys(files).sort());
}
