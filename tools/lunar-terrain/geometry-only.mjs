/** Read-only GLB geometry loader for numerical tests; never changes the asset. */
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export async function geometryOnly(path) {
  const file = readFileSync(path);
  const length = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + length).toString());
  delete json.materials;
  delete json.textures;
  delete json.images;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  let text = Buffer.from(JSON.stringify(json));
  text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
  const binary = file.subarray(20 + length);
  const output = Buffer.alloc(20 + text.length + binary.length);
  output.writeUInt32LE(0x46546c67, 0);
  output.writeUInt32LE(2, 4);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(text.length, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  text.copy(output, 20);
  binary.copy(output, 20 + text.length);
  const gltf = await new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}
