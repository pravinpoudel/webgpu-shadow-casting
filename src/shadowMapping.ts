import * as sphere from "./utils/sphere";
import * as box from "./utils/box";
import { getModelViewMatrix, getProjectionMatrix } from "./utils/math";
import { vec3, mat4 } from "gl-matrix";

import _shadowVS from "../shaders/shadowV.wgsl";
import _shadowFS from "../shaders/shadowF.wgsl";
import _shadowDepth from "../shaders/shadowDepth.wgsl";

// const canvas: HTMLCanvasElement;
let device: GPUDevice,
  context: GPUCanvasContext,
  format: GPUTextureFormat,
  size: { width: number; height: number },
  sphereVertexBuffer: GPUBuffer,
  sphereIndicesBuffer: GPUBuffer,
  boxVertexBuffer: GPUBuffer,
  boxIndicesBuffer: GPUBuffer,
  _shadowPipeline: GPURenderPipeline,
  _renderingPipeline: GPURenderPipeline,
  _MVBuffer: GPUBuffer,
  _CProjectionMatrix: GPUBuffer,
  _LProjectionMatrix: GPUBuffer,
  _dLBuffer: GPUBuffer,
  _colorBuffer: GPUBuffer,
  _shaderPipelineDesc_Primitive: any,
  _shaderPipelineDesc_depth: any,
  shadowDepthTexture: GPUTexture,
  renderDepthTexture: GPUTexture,
  shadowPassDescriptor: GPURenderPassDescriptor,
  renderpassDescriptor: GPURenderPassDescriptor;

const xCount: number = 4;
const yCount: number = 4;
const lightPosition = [20.0, 100.0, 50.0];
let cameraPosition = { x: 0, y: 10, z: 10 };
let eyePosition = vec3.fromValues(
  cameraPosition.x,
  cameraPosition.y,
  cameraPosition.z
);
let targetPosition = vec3.fromValues(0, 0, 0);

//orthographic projection dimension
const left = -40;
const right = 40;
const bottom = -40;
const top = 40;
const near = -50;
const far = 200;

const screenCanvas: HTMLCanvasElement = <HTMLCanvasElement>(
  document.getElementById("main-screen")
);

async function init(canvas: HTMLCanvasElement) {
  const entry: GPU = <GPU>navigator.gpu;
  if (!entry) {
    console.warn("webgpu is not supported in your browser !!!");
    throw new Error("webgpu is not supported");
  }
  const adapter: GPUAdapter = <GPUAdapter>await entry.requestAdapter();
  if (!adapter) {
    throw new Error("adapter not found");
  }
  device = await adapter.requestDevice();

  if (!device) {
    console.warn("no device found in the adapter");
  }

  context = <GPUCanvasContext>canvas.getContext("webgpu");
  console.log(context);

  if (!context) {
    return;
  }

  // need to find what is this for ??
  format = navigator.gpu.getPreferredCanvasFormat();
  canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
  canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  context.configure({
    device: device,
    format: "bgra8unorm",
  });
  size = { width: canvas.width, height: canvas.height };

  await stages();
}

async function initShadowPipeline() {
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

  _shaderPipelineDesc_Primitive = {
    topology: "triangle-list",
    cullMode: "back",
  };

  _shaderPipelineDesc_depth = {
    depthWriteEnabled: true,
    depthCompare: "less",
    format: "depth32float",
  };
  const _vsShaderModule = device.createShaderModule({
    code: _shadowDepth,
  });

  _shadowPipeline = (await device.createRenderPipeline({
    label: "light View Depth Pipeline",
    layout: "auto",
    vertex: {
      module: _vsShaderModule,
      entryPoint: "main",
      buffers: _shaderPipelineDesc_VB,
    } as GPUVertexState,
    primitive: _shaderPipelineDesc_Primitive as GPUPrimitiveState,
    depthStencil: _shaderPipelineDesc_depth as GPUDepthStencilState,
  })) as GPURenderPipeline;
}

async function initVertexBuffer() {
  sphereVertexBuffer = device.createBuffer({
    label: "sphere vertex store buffer",
    size: sphere.vertex.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  var stagingData = new Float32Array(sphereVertexBuffer.getMappedRange());
  stagingData.set(sphere.vertex);
  sphereVertexBuffer.unmap();

  sphereIndicesBuffer = device.createBuffer({
    label: "sphere indices store buffer",
    size: sphere.index.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  var stagingData2 = new Uint16Array(sphereIndicesBuffer.getMappedRange());
  stagingData2.set(sphere.index);
  sphereIndicesBuffer.unmap();

  boxVertexBuffer = device.createBuffer({
    label: "box vertex store buffer",
    size: box.vertex.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  var stagingData = new Float32Array(boxVertexBuffer.getMappedRange());
  stagingData.set(box.vertex);
  boxVertexBuffer.unmap();

  boxIndicesBuffer = device.createBuffer({
    label: "box indices store buffer",
    size: box.index.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  var stagingData2 = new Uint16Array(boxIndicesBuffer.getMappedRange());
  stagingData2.set(box.index);
  boxIndicesBuffer.unmap();
}

async function sBufferInit() {
  // light P
  let lightViewProjectionMatrix = mat4.create();
  mat4.ortho(lightViewProjectionMatrix, left, right, bottom, top, near, far); // it does as (40-(-40) in gl-matrix m4.ortho

  _LProjectionBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  var mappedLightArray = new Float32Array(_LProjectionBuffer.getMappedRange());
  mappedLightArray.set(lightViewProjectionMatrix);
  _LProjectionBuffer.unmap();

  //light V
  let lightViewMatrix = mat4.create();
  mat4.lookAt(
    lightViewMatrix,
    vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]),
    targetPosition,
    vec3.fromValues(0, 1, 0)
  );

  _LViewBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  var mappedLightArray = new Float32Array(_LViewBuffer.getMappedRange());
  mappedLightArray.set(lightViewMatrix);
  _LViewBuffer.unmap();
}

async function rBufferInit() {
  let cameraProjectionMatrix = getProjectionMatrix(
    screenCanvas.width / screenCanvas.height,
    0.5 * Math.PI,
    0.1,
    1000,
    cameraPosition
  );

  // we will create and pass whole MVP of light
  let lightViewProjectionMatrix = mat4.create();
  mat4.ortho(lightViewProjectionMatrix, left, right, bottom, top, near, far); // it does as (40-(-40) in gl-matrix m4.ortho
  let lightViewMatrix = mat4.create();
  mat4.lookAt(
    lightViewMatrix,
    vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]),
    targetPosition,
    vec3.fromValues(0, 1, 0)
  );

  _CViewBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  let viewMatrixStagingBuff = new Float32Array(_CViewBuffer.getMappedRange());
  viewMatrixStagingBuff.set(viewMatrix);
  _CViewBuffer.unmap();

  _CProjectionBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  var mappedArray = new Float32Array(_CProjectionBuffer.getMappedRange());
  mappedArray.set(cameraProjectionMatrix);
  _CProjectionBuffer.unmap();
}

async function initInstancedBuffer() {
  _dLBuffer = device.createBuffer({
    size: 3 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });

  var mappedArray = new Float32Array(_dLBuffer.getMappedRange());
  mappedArray.set(lightPosition);
  _dLBuffer.unmap();

  _MBuffer = device.createBuffer({
    size: xCount * yCount * 16 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  let mStagedArray = new Float32Array(_MBuffer.getMappedRange());

  _colorBuffer = device.createBuffer({
    size: xCount * yCount * 4 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });

  let colorStagedArray = new Float32Array(_colorBuffer.getMappedRange());

  const modelMatrices = new Array(xCount * yCount);
  // const modelMatricesData = new Float32Array(xCount * yCount * 16 * 4);

  const colorData = new Array(xCount * yCount);
  // const colorDataSet = new Float32Array(xCount * yCount * 4);

  {
    let count = 0;
    let localPositionReference = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < xCount; i++) {
      for (let j = 0; j < yCount; j++) {
        localPositionReference.x = -7.0 + Math.random() * 20.0;
        localPositionReference.y = -10 + Math.random() * 25.0;
        localPositionReference.z = -5 + Math.random() * 20;
        modelMatrices[count] = mat4.create();
        mat4.translate(
          modelMatrices[count],
          modelMatrices[count],
          vec3.fromValues(
            localPositionReference.x,
            localPositionReference.y,
            localPositionReference.z
          )
        );
        mStagedArray.set(modelMatrices[count], 16 * count);
        // modelMatricesData.set(modelMatrices[count], count * 16);
        colorData[count] = [Math.random(), Math.random(), Math.random()];
        colorStagedArray.set(colorData[count], count * 4);
        count++;
      }
    }
  }
  _MBuffer.unmap();
  _colorBuffer.unmap();
}

function createBindGroup() {
  shadowBindGroup = device.createBindGroup({
    label: "show mapping bind group",
    layout: _shadowPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: _LViewBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: _LProjectionBuffer,
        },
      },
    ],
  });

  renderBindGroup = device.createBindGroup({
    label: "render shaderpass bind group",
    layout: _renderingPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0
      }
    ],
    {
      binding: 1
    },
    {
      binding: 2
    },
    {
      binding: 3
    }, {

    }
  });
}

async function initRenderingPipeline() {
  const vertexModule = device.createShaderModule({ code: _shadowVS });
  const fragmentModule = device.createShaderModule({ code: _shadowFS });
  const _shaderFragmentDesc = {
    module: fragmentModule,
    entryPoint: "main",
    targets: [
      {
        format: format,
      },
    ],
  };

  _renderingPipeline = (await device.createRenderPipeline({
    label: "render pipeline",
    layout: "auto",
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: _shaderPipelineDesc_VB,
    } as GPUVertexState,
    fragment: _shaderFragmentDesc,
    primitive: _shaderPipelineDesc_Primitive,
    depthStencil: _shaderPipelineDesc_depth,
  })) as GPURenderPipeline;
}

function createDepthTexture() {
  shadowDepthTexture = device.createTexture({
    size: [screenCanvas.width, screenCanvas.height, 1],
    format: "depth32float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  renderDepthTexture = device.createTexture({
    size: [screenCanvas.width, screenCanvas.height, 1],
    format: "depth32float",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
}

function createRenderPassDescriptor() {
  shadowPassDescriptor = {
    colorAttachments: [],
    depthStencilAttachment: {
      view: shadowDepthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  renderpassDescriptor = {
    colorAttachments: [
      {
        view: undefined,
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: renderDepthTexture.createView(),
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };
}

function drawMultipleInstances(pass: any) {
  pass.setVertexBuffer(0, sphereVertexBuffer);
  pass.setIndexBuffer(sphereIndicesBuffer, "uint16");
  pass.drawIndexed(sphere.indexCount, (xCount * yCount) / 2);

  pass.setVertexBuffer(0, boxVertexBuffer);
  pass.setIndexBuffer(boxIndicesBuffer, "uint16");
  pass.drawIndexed(box.indexCount, (xCount * yCount) / 2);
}

function render() {
  const depthEncoder = device.createCommandEncoder();
  renderpassDescriptor.colorAttachments[0].view = context
    .getCurrentTexture()
    .createView();

  const depthRenderPass = depthEncoder.beginRenderPass(shadowPassDescriptor);
  depthRenderPass.setPipeline(_shadowPipeline);
  depthRenderPass.setBindGroup(0, shadowBindGroup);
  drawMultipleInstances(depthRenderPass);
  depthRenderPass.end();

  const renderingPass = depthEncoder.beginRenderPass(renderpassDescriptor);
  renderingPass.setPipeline(_renderingPipeline);
  renderingPass.setBindGroup(0, renderBindGroup);
  drawMultipleInstances(renderingPass);
  renderingPass.end();
  requestAnimationFrame(render);
}

render();

// async function initInstancedBuffer() {
//   let cameraProjectionMatrix = getProjectionMatrix(
//     screenCanvas.width / screenCanvas.height,
//     0.5 * Math.PI,
//     0.1,
//     1000,
//     cameraPosition
//   );

//   // we will create and pass whole MVP of light
//   let lightViewProjectionMatrix = mat4.create();
//   mat4.ortho(lightViewProjectionMatrix, -40, 40, -40, 40, -50, 200);
//   let lightViewMatrix = mat4.create();
//   mat4.lookAt(
//     lightViewMatrix,
//     vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]),
//     vec3.fromValues(0, 0, 0),
//     vec3.fromValues(0, 1, 0)
//   );

//   mat4.multiply(
//     lightViewProjectionMatrix,
//     lightViewProjectionMatrix,
//     lightViewMatrix
//   );
//   const viewMatrix = mat4.create();

//   mat4.lookAt(
//     viewMatrix,
//     eyePosition,
//     targetPosition,
//     vec3.fromValues(0, 0, 0)
//   );

//   _dLBuffer = device.createBuffer({
//     size: 3 * 4,
//     usage: GPUBufferUsage.UNIFORM,
//     mappedAtCreation: true,
//   });

//   var mappedArray = new Float32Array(_dLBuffer.getMappedRange());
//   mappedArray.set(lightPosition);
//   _dLBuffer.unmap();
//   // check the limit of Uniform

//   _CProjectionMatrix = device.createBuffer({
//     size: 16 * 4,
//     usage: GPUBufferUsage.UNIFORM,
//     mappedAtCreation: true,
//   });

//   var mappedArray = new Float32Array(_CProjectionMatrix.getMappedRange());
//   mappedArray.set(cameraProjectionMatrix);

//   _LProjectionMatrix = device.createBuffer({
//     size: 16 * 4,
//     usage: GPUBufferUsage.UNIFORM,
//     mappedAtCreation: true,
//   });

//   _MVBuffer = device.createBuffer({
//     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//     size: numInstances * 16,
//     mappedAtCreation: true,
//   });

//   _colorBuffer = device.createBuffer({
//     size: numInstances * 4 * 4,
//     usage: GPUBufferUsage.UNIFORM,
//     mappedAtCreation: true,
//   });
// }

// initShaderBuffer();

//_shadowPipeline.setVertexBuffer(0, sphereVertexBuffer);

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
