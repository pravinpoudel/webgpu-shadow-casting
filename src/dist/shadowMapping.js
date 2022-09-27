"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var sphere = require("./utils/sphere");
var box = require("./utils/box");
var math_1 = require("./utils/math");
var gl_matrix_1 = require("gl-matrix");
var shadowV_wgsl_1 = require("../shaders/shadowV.wgsl");
// const canvas: HTMLCanvasElement;
var device, context, format, size, sphereVertexBuffer, sphereIndicesBuffer, boxVertexBuffer, boxIndicesBuffer, shaderBindGroup, _shadowPipeline, _MBuffer, _cameraViewMatrix, _CProjectionMatrix, _LmvpMatrix, _dLBuffer, _colorBuffer;
var xCount = 4;
var yCount = 4;
var lightPosition = [20.0, 100.0, 50.0];
var cameraPosition = { x: 0, y: 10, z: 10 };
var eyePosition = gl_matrix_1.vec3.fromValues(cameraPosition.x, cameraPosition.y, cameraPosition.z);
var targetPosition = gl_matrix_1.vec3.fromValues(0, 0, 0);
//orthographic projection dimension
var left = -40;
var right = 40;
var bottom = -40;
var top = 40;
var near = -50;
var far = 200;
var screenCanvas = (document.getElementById("main-screen"));
function init(canvas) {
    return __awaiter(this, void 0, void 0, function () {
        var entry, adapter;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    entry = navigator.gpu;
                    if (!entry) {
                        console.warn("webgpu is not supported in your browser !!!");
                        throw new Error("webgpu is not supported");
                    }
                    return [4 /*yield*/, entry.requestAdapter()];
                case 1:
                    adapter = _a.sent();
                    if (!adapter) {
                        throw new Error("adapter not found");
                    }
                    return [4 /*yield*/, adapter.requestDevice()];
                case 2:
                    device = _a.sent();
                    if (!device) {
                        console.warn("no device found in the adapter");
                    }
                    context = canvas.getContext("webgpu");
                    console.log(context);
                    if (!context) {
                        return [2 /*return*/];
                    }
                    // need to find what is this for ??
                    format = navigator.gpu.getPreferredCanvasFormat();
                    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
                    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
                    context.configure({
                        device: device,
                        format: "bgra8unorm"
                    });
                    size = { width: canvas.width, height: canvas.height };
                    return [2 /*return*/];
            }
        });
    });
}
function initPipeline() {
    return __awaiter(this, void 0, void 0, function () {
        var _shaderPipelineDesc_VB, _shaderPipelineDesc_Primitive, _shaderPipelineDesc_depth, _vsShaderModule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _shaderPipelineDesc_VB = [
                        {
                            arrayStride: 8 * 4,
                            attributes: [
                                {
                                    shaderLocation: 0,
                                    offset: 0,
                                    format: "float32x3"
                                },
                                {
                                    shaderLocation: 1,
                                    offset: 3 * 4,
                                    format: "float32x3"
                                },
                                {
                                    shaderLocation: 2,
                                    offset: 6 * 4,
                                    format: "float32x2"
                                },
                            ]
                        },
                    ];
                    _shaderPipelineDesc_Primitive = {
                        topology: "triangle-list",
                        cullMode: "back"
                    };
                    _shaderPipelineDesc_depth = {
                        depthWriteEnabled: true,
                        depthCompare: "less",
                        format: "depth32float"
                    };
                    _vsShaderModule = device.createShaderModule({
                        code: shadowV_wgsl_1["default"]
                    });
                    return [4 /*yield*/, device.createRenderPipeline({
                            label: "light View Depth Pipeline",
                            layout: "auto",
                            vertex: {
                                module: _vsShaderModule,
                                entryPoint: "main",
                                buffers: _shaderPipelineDesc_VB
                            },
                            primitive: _shaderPipelineDesc_Primitive,
                            depthStencil: _shaderPipelineDesc_depth
                        })];
                case 1:
                    _shadowPipeline = (_a.sent());
                    return [2 /*return*/];
            }
        });
    });
}
function initVertexBuffer() {
    return __awaiter(this, void 0, void 0, function () {
        var stagingData, stagingData2, stagingData, stagingData2;
        return __generator(this, function (_a) {
            sphereVertexBuffer = device.createBuffer({
                label: "sphere vertex store buffer",
                size: sphere.vertex.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            stagingData = new Float32Array(sphereVertexBuffer.getMappedRange());
            stagingData.set(sphere.vertex);
            sphereVertexBuffer.unmap();
            sphereIndicesBuffer = device.createBuffer({
                label: "sphere indices store buffer",
                size: sphere.index.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            stagingData2 = new Uint16Array(sphereIndicesBuffer.getMappedRange());
            stagingData2.set(sphere.index);
            sphereIndicesBuffer.unmap();
            boxVertexBuffer = device.createBuffer({
                label: "box vertex store buffer",
                size: box.vertex.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            stagingData = new Float32Array(boxVertexBuffer.getMappedRange());
            stagingData.set(box.vertex);
            boxVertexBuffer.unmap();
            boxIndicesBuffer = device.createBuffer({
                label: "box indices store buffer",
                size: box.index.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            stagingData2 = new Uint16Array(boxIndicesBuffer.getMappedRange());
            stagingData2.set(box.index);
            boxIndicesBuffer.unmap();
            return [2 /*return*/];
        });
    });
}
function initInstancedBuffer() {
    return __awaiter(this, void 0, void 0, function () {
        var cameraProjectionMatrix, lightViewProjectionMatrix, lightViewMatrix, viewMatrix, mappedArray, _cameraViewMatrix, viewMatrixStagingBuff, mappedArray, mappedLightArray, mStagedArray, colorStagedArray, modelMatrices, colorData, count, localPositionReference, i, j;
        return __generator(this, function (_a) {
            cameraProjectionMatrix = math_1.getProjectionMatrix(screenCanvas.width / screenCanvas.height, 0.5 * Math.PI, 0.1, 1000, cameraPosition);
            lightViewProjectionMatrix = gl_matrix_1.mat4.create();
            gl_matrix_1.mat4.ortho(lightViewProjectionMatrix, left, right, bottom, top, near, far); // it does as (40-(-40) in gl-matrix m4.ortho
            lightViewMatrix = gl_matrix_1.mat4.create();
            gl_matrix_1.mat4.lookAt(lightViewMatrix, gl_matrix_1.vec3.fromValues(lightPosition[0], lightPosition[1], lightPosition[2]), targetPosition, gl_matrix_1.vec3.fromValues(0, 1, 0));
            gl_matrix_1.mat4.multiply(lightViewProjectionMatrix, lightViewProjectionMatrix, lightViewMatrix);
            viewMatrix = gl_matrix_1.mat4.create();
            gl_matrix_1.mat4.lookAt(viewMatrix, eyePosition, targetPosition, gl_matrix_1.vec3.fromValues(0, 0, 0));
            _dLBuffer = device.createBuffer({
                size: 3 * 4,
                usage: GPUBufferUsage.UNIFORM,
                mappedAtCreation: true
            });
            mappedArray = new Float32Array(_dLBuffer.getMappedRange());
            mappedArray.set(lightPosition);
            _dLBuffer.unmap();
            _cameraViewMatrix = device.createBuffer({
                size: 16 * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
                mappedAtCreation: true
            });
            viewMatrixStagingBuff = new Float32Array(_cameraViewMatrix.getMappedRange());
            viewMatrixStagingBuff.set(viewMatrix);
            _cameraViewMatrix.unmap();
            _CProjectionMatrix = device.createBuffer({
                size: 16 * 4,
                usage: GPUBufferUsage.UNIFORM,
                mappedAtCreation: true
            });
            mappedArray = new Float32Array(_CProjectionMatrix.getMappedRange());
            mappedArray.set(cameraProjectionMatrix);
            _CProjectionMatrix.unmap();
            _LmvpMatrix = device.createBuffer({
                size: 16 * 4,
                usage: GPUBufferUsage.UNIFORM,
                mappedAtCreation: true
            });
            mappedLightArray = new Float32Array(_LmvpMatrix.getMappedRange());
            mappedLightArray.set(lightViewProjectionMatrix);
            _LmvpMatrix.unmap();
            _MBuffer = device.createBuffer({
                size: xCount * yCount * 16 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                mappedAtCreation: true
            });
            mStagedArray = new Float32Array(_MBuffer.getMappedRange());
            _colorBuffer = device.createBuffer({
                size: xCount * yCount * 4 * 4,
                usage: GPUBufferUsage.UNIFORM,
                mappedAtCreation: true
            });
            colorStagedArray = new Float32Array(_colorBuffer.getMappedRange());
            modelMatrices = new Array(xCount * yCount);
            colorData = new Array(xCount * yCount);
            // const colorDataSet = new Float32Array(xCount * yCount * 4);
            {
                count = 0;
                localPositionReference = { x: 0, y: 0, z: 0 };
                for (i = 0; i < xCount; i++) {
                    for (j = 0; j < yCount; j++) {
                        localPositionReference.x = -7.0 + Math.random() * 20.0;
                        localPositionReference.y = -10 + Math.random() * 25.0;
                        localPositionReference.z = -5 + Math.random() * 20;
                        modelMatrices[count] = gl_matrix_1.mat4.create();
                        gl_matrix_1.mat4.translate(modelMatrices[count], modelMatrices[count], gl_matrix_1.vec3.fromValues(localPositionReference.x, localPositionReference.y, localPositionReference.z));
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
            return [2 /*return*/];
        });
    });
}
function stages() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, init(screenCanvas)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, initPipeline()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, initVertexBuffer()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, initInstancedBuffer()];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
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

//# sourceMappingURL=shadowMapping.js.map
