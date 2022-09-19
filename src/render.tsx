import { vertex, vertex_shadow, fragment } from "./wgsl";

class renderer {
  constructor() {}

  async initialize() {
    const gpuNode: GPU = await navigator.gpu.requestAdapter();
  }
}
