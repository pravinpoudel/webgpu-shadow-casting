import * as sphere from "./utils/sphere.js";
import * as box from "./utils/box.js";
import { getModelViewMatrix, getProjectionMatrix } from "./utils/math.js";
import { mat3, mat4 } from "../node_modules/gl-matrix/gl-matrix.js";

import _shadowVS from "../shaders/shadow.vertex.wgsl";
import _shadowFS from "../shaders/shadow.frag.wgsl";
import __shadowDepth from "../shaders/";

async function init(canvas) {
  const entry = navigator.gpu;
  if (!entry) {
    console.warn("webgpu is not supported in your browser !!!");
  }
  const adapter = await entry.requestAdapter();
  if (!adapter) {
    throw new Error("adapter not found");
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!context) {
    return;
  }

  // need to find what is this for ??
  const format = navigator.gpu.getPreferredCanvasFormat
    ? navigator.gpu.getPreferredCanvasFormat()
    : context.getPreferredFormat(adapter);

  canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
  });
  const size = { width: canvas.width, height: canvas.height };
  return { device, context, format, size };
}

async function initPipeline() {
  const _shaderPipelineDesc_VB = [
    {
      arrayStride: 8 * 4, // 3(position) + 3(normal) + 2(uv)
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x3",
        },
        {
          shaderLocation: 1,
          offset: 3 * 4,
          format: "float32x3",
        },
        {
          shaderLocation: 2,
          offset: 6 * 4,
          format: "float32x2",
        },
      ],
    },
  ];

  const _shaderPipelineDesc_Primitive = {
    topology: "triangle-list",
    cullMode: "back",
  };

  const _shaderPipelineDesc_depth = {
    depthWriteEnabled: true,
    depthCompare: "less",
    format: "depth32float",
  };
  const _vsShaderModule = device.createShaderModule({
    code: shadowDepth_VS,
  });

  const _shadowPipeline = await device.createPipeline({
    label: "light View Depth Pipeline",
    vertex: {
      module: _vsShaderModule,
      entryPoint: "main",
      buffers: _shaderPipelineDesc_VB,
    },
    primtive: _shaderPipelineDesc_Primitive,
    depthStencil: _shaderPipelineDesc_depth,
  });

  console.log(_shadowPipeline);
}

init();
initPipeline();

// // in sphere there is vertex count as well but that vertex count is number of vertex in that mesh not number of vec3
// const sphereVertexBuffer = device.createBuffer({
//     size: sphere.vertex.byteLength,
//     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//     mappedAtCreation: true
// });

// const sphereIndicesBuffer = device.createBuffer({
//     size: sphere.index.byteLength,
//     usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
//     mappedAtCreation: true
// });

// const boxVertexBuffer = device.createBuffer({
//     size: box.vertices.byteLength,
//     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//     mappedAtCreation: true
// });

// const boxIndicesBuffer = device.createBuffer({
//     size: box.vertices.byteLength,
//     usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
//     mappedAtCreation: true
// });

// const sphereBuffer = {
//     vertex:
//     index:
// }

// const boxBuffer = {
//     vertex:
//     indices:
// }

// device.queue.writeBuffer(sphereBuffer.vertex, 0, sphereBuffer.vertex);
// device.queue.writeBuffer(sphereBuffer.indices, 0, sphereBuffer.indices);
// device.queue.writeBuffer(boxBuffer.vertex, 0, boxBuffer.vertex);
// device.queue.writeBuffer(boxBuffer.indices, 0, boxBuffer.indices);
