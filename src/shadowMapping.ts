import * as sphere from "./utils/sphere";
import * as box from "./utils/box";
import { getModelViewMatrix, getProjectionMatrix } from "./utils/math";
import { vec3, mat4 } from "gl-matrix";

import _shadowVS from "../shaders/shadowV.wgsl";
import _shadowFS from "../shaders/shadowF.wgsl";
import _shadowDepth from "../shaders/shadowDepth.wgsl";
import _shadowMapFrag from "../shaders/shadowDepthF.wgsl";

import "./style/style.css";

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
  _MBuffer: GPUBuffer,
  _LProjectionBuffer: GPUBuffer,
  _CViewProjectionBuffer: GPUBuffer,
  // _CProjectionBuffer: GPUBuffer,
  _dLBuffer: GPUBuffer,
  _colorBuffer: GPUBuffer,
  _shaderPipelineDesc_Primitive: any,
  _shaderPipelineDesc_depth: any,
  shadowDepthTexture: GPUTexture,
  renderDepthTexture: GPUTexture,
  shadowPassDescriptor: { depthStencilAttachment: any; colorAttachments: any },
  renderpassDescriptor: { depthStencilAttachment: any; colorAttachments: any },
  _shaderPipelineDesc_VB: any,
  shadowBindGroup: GPUBindGroup,
  renderBindGroup0: GPUBindGroup,
  renderBindGroup1: GPUBindGroup;

const xCount: number = 4;
const yCount: number = 4;
const lightPosition = [0.0, 100.0, 0.0];
let cameraPosition = { x: 50, y: 30, z: 20 };
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

(async () => {
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

  async function stages() {
    await init(screenCanvas);
    await initShadowPipeline();
    await initVertexBuffer();
    await rBufferInit();
    await sBufferInit();
    await initInstancedBuffer();
    await initRenderingPipeline();
    createDepthTexture();
    createRenderPassDescriptor();
    _createBindGroup();
  }

  await stages();

  async function initShadowPipeline() {
    _shaderPipelineDesc_VB = [
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
    const fragmentModule = device.createShaderModule({ code: _shadowMapFrag });

    const _shaderFragmentDesc1 = {
      module: fragmentModule,
      entryPoint: "main",
      targets: [
        {
          format: format,
        },
      ],
    };

    _shadowPipeline = (await device.createRenderPipeline({
      label: "light View Depth Pipeline",
      layout: "auto",
      vertex: {
        module: _vsShaderModule,
        entryPoint: "main",
        buffers: _shaderPipelineDesc_VB,
      } as GPUVertexState,
      // fragment: _shaderFragmentDesc1,
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
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
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
    let lightViewMatrix = mat4.create();
    mat4.lookAt(
      lightViewMatrix,
      vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]),
      targetPosition,
      vec3.fromValues(0, 1, 0)
    );
    let lightViewProjectionMatrix = mat4.create();
    mat4.ortho(lightViewProjectionMatrix, left, right, bottom, top, near, far);
    mat4.multiply(
      lightViewProjectionMatrix,
      lightViewProjectionMatrix,
      lightViewMatrix
    );

    _LProjectionBuffer = device.createBuffer({
      size: 16 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    var mappedLightArray = new Float32Array(
      _LProjectionBuffer.getMappedRange()
    );
    mappedLightArray.set(lightViewProjectionMatrix);
    _LProjectionBuffer.unmap();

    _dLBuffer = device.createBuffer({
      size: 3 * 4,
      usage: GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });

    var mappedArray = new Float32Array(_dLBuffer.getMappedRange());
    mappedArray.set(lightPosition);
    _dLBuffer.unmap();
  }

  async function rBufferInit() {
    // const viewMatrix = mat4.create();
    // mat4.lookAt(
    //   viewMatrix,
    //   eyePosition,
    //   targetPosition,
    //   vec3.fromValues(0, 0, 0)
    // );
    let aspect = screenCanvas.width / screenCanvas.height;
    let cameraProjectionMatrix = getProjectionMatrix(
      aspect,
      0.5 * Math.PI,
      0.1,
      1000,
      cameraPosition
    );

    // const cameraViewProjectionMatrix = mat4.create();
    // mat4.multiply(
    //   cameraViewProjectionMatrix,
    //   viewMatrix,
    //   cameraProjectionMatrix
    // );

    _CViewProjectionBuffer = device.createBuffer({
      size: 16 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
      mappedAtCreation: true,
    });

    let viewMatrixStagingBuff = new Float32Array(
      _CViewProjectionBuffer.getMappedRange()
    );
    viewMatrixStagingBuff.set(cameraProjectionMatrix);
    _CViewProjectionBuffer.unmap();

    // _CProjectionBuffer = device.createBuffer({
    //   size: 16 * 4,
    //   usage: GPUBufferUsage.UNIFORM,
    //   mappedAtCreation: true,
    // });
    // var mappedArray = new Float32Array(_CProjectionBuffer.getMappedRange());
    // mappedArray.set(cameraProjectionMatrix);
    // _CProjectionBuffer.unmap();
  }

  async function initInstancedBuffer() {
    _MBuffer = device.createBuffer({
      size: xCount * yCount * 16 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    let mStagedArray = new Float32Array(_MBuffer.getMappedRange());

    _colorBuffer = device.createBuffer({
      size: xCount * yCount * 4 * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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
          if (i * xCount + j == xCount * yCount - 1.0) {
            const position = { x: 0, y: -10, z: -20 };
            const rotation = { x: 0, y: 0, z: 0 };
            const scale = { x: 50, y: 0.5, z: 40 };
            const modelView = getModelViewMatrix(position, rotation, scale);
            mStagedArray.set(modelView, 16 * count);
            // modelMatricesData.set(modelMatrices[count], count * 16);
            colorData[count] = [1.0, 1.0, 1.0, 1.0];
            colorStagedArray.set(colorData[count], count * 4);
            count++;
            continue;
          }
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
          colorData[count] = [
            Math.random(),
            Math.random(),
            Math.random(),
            Math.random(),
          ];
          colorStagedArray.set(colorData[count], count * 4);
          count++;
        }
      }
    }
    _MBuffer.unmap();
    _colorBuffer.unmap();
  }

  function _createBindGroup() {
    shadowBindGroup = device.createBindGroup({
      label: "show mapping bind group",
      layout: _shadowPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: _LProjectionBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: _MBuffer,
          },
        },
      ],
    });

    renderBindGroup0 = device.createBindGroup({
      label: "render shaderpass bind group 0",
      layout: _renderingPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: {
            buffer: _MBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: _colorBuffer,
          },
        },
        {
          binding: 2,
          resource: {
            buffer: _LProjectionBuffer,
          },
        },
        {
          binding: 3,
          resource: {
            buffer: _CViewProjectionBuffer,
          },
        },
      ],
    });

    renderBindGroup1 = device.createBindGroup({
      label: "render shaderpass bind group 1",
      layout: _renderingPipeline.getBindGroupLayout(1),
      entries: [
        {
          binding: 0,
          resource: device.createSampler({
            compare: "less",
          }),
        },
        {
          binding: 1,
          resource: shadowDepthTexture.createView(),
        },
        {
          binding: 2,
          resource: {
            buffer: _dLBuffer,
          },
        },
      ],
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
      usage:
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
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
          view: null,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: renderDepthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };
  }

  function drawMultipleInstances(pass: any) {
    pass.setVertexBuffer(0, sphereVertexBuffer);
    pass.setIndexBuffer(sphereIndicesBuffer, "uint16");
    pass.drawIndexed(sphere.indexCount, (xCount * yCount) / 2, 0, 0, 0);

    pass.setVertexBuffer(0, boxVertexBuffer);
    pass.setIndexBuffer(boxIndicesBuffer, "uint16");
    pass.drawIndexed(
      box.indexCount,
      xCount * yCount,
      0,
      0,
      (xCount * yCount) / 2.0
    );
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
    renderingPass.setBindGroup(0, renderBindGroup0);
    renderingPass.setBindGroup(1, renderBindGroup1);
    drawMultipleInstances(renderingPass);
    renderingPass.end();

    const commands = depthEncoder.finish();
    device.queue.submit([commands]);
    requestAnimationFrame(render);
  }

  render();
})();
