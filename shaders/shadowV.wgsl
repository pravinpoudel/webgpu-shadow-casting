struct VertexInput{   
 @builtin(instance_index) index: u32,
 @location(0) position:vec3<f32>, 
 @location(1) normal:vec3<f32>, 
 @location(2) uv:vec2<f32>
}

// bindgroup input
struct VertexOutput{
    @builtin(position) Position:vec4<f32>,
    @location(0) Color: vec4<f32>,
    @location(1) shadowPosition: vec3<f32>,
    @location(2) fragNormal: vec3<f32>,
};

@group(0) @binding(0) var<storage> modelMatrix : array<mat4x4<f32>>;
@group(0) @binding(1) var<storage> color:array<vec4<f32>>;
@group(0) @binding(2) var<uniform> lightViewProjectionMatrix: mat4x4<f32>;
@group(0) @binding(3) var<uniform> cameraViewProjectionMatrix: mat4x4<f32>;
@group(0) @binding(4) var<uniform> lightposition: vec3<f32>;

// sampler
@vertex
fn main(in1:VertexInput)->VertexOutput{
    var vo:VertexOutput;
    vo.Position= cameraViewProjectionMatrix*modelMatrix[in1.index]*vec4(in1.position, 1.0);
    vo.fragNormal = vec3((modelMatrix[in1.index]*vec4(in1.normal, 1.0)).xyz);
    vo.Color = color[in1.index];
    var shadowPos:vec4<f32> = lightViewProjectionMatrix*vec4(in1.position, 1.0);
    shadowPos.x = shadowPos.x*0.5 + 0.5;
    shadowPos.y = (shadowPos.y*(-0.5)) + 0.5;
    vo.shadowPosition = vec3(shadowPos.x, shadowPos.y, shadowPos.z);
    return vo;
}