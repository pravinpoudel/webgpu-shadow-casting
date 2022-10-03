@group(0) @binding(0) var<uniform> lightProjectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage> modelMatrix:array<mat4x4<f32>>;

struct vOutput{
    @builtin(position) Position: vec4<f32>,
    @location(0) fragPosition: vec3<f32>
}

@vertex
fn main(@location(0) position:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) uv:vec2<f32>, @builtin(instance_index) index:u32)->vOutput{
    var vOut1:vOutput;
    var pos:vec4<f32> = lightProjectionMatrix* modelMatrix[index]* vec4(position, 1.0);
    vOut1.Position = pos;
    vOut1.fragPosition = pos.xyz;
    return vOut1;
}