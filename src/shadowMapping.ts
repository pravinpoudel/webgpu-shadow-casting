import * as sphere from "./utils/sphere";
import * as box from "./utils/box";
import { getModelViewMatrix, getProjectionMatrix } from "./utils/math";
import { mat3, mat4 } from "gl-matrix";

import _shadowVS from "../shaders/shadowV.wgsl";
import _shadowFS from "../shaders/shadowF.wgsl";
import _shadowDepth from "../shaders/shadowDepth.wgsl";
import { pipeline } from "stream";

// const canvas: HTMLCanvasElement;
let device: GPUDevice,
  context: GPUCanvasContext,
  format: GPUTextureFormat,
  size: { width: number; height: number },
  sphereVertexBuffer: GPUBuffer,
  sphereIndicesBuffer: GPUBuffer,
  boxVertexBuffer: GPUBuffer,
  boxIndicesBuffer: GPUBuffer,
  shaderBindGroup: GPUBindGroup,
  _shadowPipeline: GPURenderPipeline;

const screenCanvas: HTMLCanvasElement = <HTMLCanvasElement>(
  document.getElementById("main-screen")
);

async function init(canvas: HTMLCanvasElement) {
  const entry: GPU = <GPU>navigator.gpu;
  if (!entry) {
    console.warn("webgpu is not supported in your browser !!!");
  }
  const adapter: GPUAdapter = <GPUAdapter>await entry.requestAdapter();
  if (!adapter) {
    throw new Error("adapter not found");
  }
  device = await adapter.requestDevice();
  context = <GPUCanvasContext>canvas.getContext("webgpu");
  if (!context) {
    return;
  }

  // need to find what is this for ??
  format = navigator.gpu.getPreferredCanvasFormat
    ? navigator.gpu.getPreferredCanvasFormat()
    : context.getPreferredFormat(adapter);

  canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  context.configure({
    device: device,
    format: navigator.gpu.getPreferredCanvasFormat(),
  });
  size = { width: canvas.width, height: canvas.height };
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
    code: _shadowVS,
  });

  _shadowPipeline = await device.createRenderPipeline({
    label: "light View Depth Pipeline",
    layout: "auto",
    vertex: {
      module: _vsShaderModule,
      entryPoint: "main",
      buffers: _shaderPipelineDesc_VB,
    } as GPUVertexState,
    primitive: _shaderPipelineDesc_Primitive as GPUPrimitiveState,
    depthStencil: _shaderPipelineDesc_depth as GPUDepthStencilState,
  });
}

async function initVertexBuffer() {
  sphereVertexBuffer = device.createBuffer({
    label: "sphere vertex store buffer",
    size: sphere.vertex.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  let stagingData = new Float32Array(sphereVertexBuffer.getMappedRange());
  stagingData.set(sphere.vertex);

  sphereIndicesBuffer = device.createBuffer({
    label: "sphere indices store buffer",
    size: sphere.index.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  stagingData = new Float32Array(sphereIndicesBuffer.getMappedRange());
  stagingData.set(sphere.index);

  boxVertexBuffer = device.createBuffer({
    label: "box vertex store buffer",
    size: box.vertex.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  stagingData = new Float32Array(boxVertexBuffer.getMappedRange());
  stagingData.set(box.vertex);

  boxIndicesBuffer = device.createBuffer({
    label: "box indices store buffer",
    size: box.index.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  stagingData = new Float32Array(boxIndicesBuffer.getMappedRange());
  stagingData.set(box.index);
}

async function initStorageBuffer() {}

init(screenCanvas);
// initPipeline();
initVertexBuffer();
initStorageBuffer();

//
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
