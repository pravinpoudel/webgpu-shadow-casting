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
  shaderBindGroup: GPUBindGroup,
  _shadowPipeline: GPURenderPipeline,
  _MBuffer: GPUBuffer,
  _cameraViewMatrix: GPUBuffer,
  _CProjectionMatrix: GPUBuffer,
  _LmvpMatrix: GPUBuffer,
  _dLBuffer: GPUBuffer,
  _colorBuffer: GPUBuffer;

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

  _shadowPipeline = <GPURenderPipeline>await device.createRenderPipeline({
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

async function initInstancedBuffer() {
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
  mat4.multiply(
    lightViewProjectionMatrix,
    lightViewProjectionMatrix,
    lightViewMatrix
  );

  const viewMatrix = mat4.create();
  mat4.lookAt(
    viewMatrix,
    eyePosition,
    targetPosition,
    vec3.fromValues(0, 0, 0)
  );

  _dLBuffer = device.createBuffer({
    size: 3 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });

  var mappedArray = new Float32Array(_dLBuffer.getMappedRange());
  mappedArray.set(lightPosition);
  _dLBuffer.unmap();

  var _cameraViewMatrix = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });

  let viewMatrixStagingBuff = new Float32Array(
    _cameraViewMatrix.getMappedRange()
  );
  viewMatrixStagingBuff.set(viewMatrix);
  _cameraViewMatrix.unmap();

  _CProjectionMatrix = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  var mappedArray = new Float32Array(_CProjectionMatrix.getMappedRange());
  mappedArray.set(cameraProjectionMatrix);
  _CProjectionMatrix.unmap();

  _LmvpMatrix = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true,
  });
  var mappedLightArray = new Float32Array(_LmvpMatrix.getMappedRange());
  mappedLightArray.set(lightViewProjectionMatrix);
  _LmvpMatrix.unmap();

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

async function stages() {
  await init(screenCanvas);
  await initPipeline();
  await initVertexBuffer();
  await initInstancedBuffer();
}

stages();
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
