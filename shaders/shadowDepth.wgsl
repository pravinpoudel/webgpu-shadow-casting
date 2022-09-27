@group(0) @binding(0) var<storage> modelViewMatrix: array<mat4x4<f32>>;
@group(0) @binding(1) var<uniform> lightProjectionMatrix: mat4x4<f32>;

@vertex
fn main(@location(0) position:vec3<f32>, @builtin(instance_index) index:u32)->@builtin(position) vec4<f32>{
    return lightProjectionMatrix* modelViewMatrix[index]* vec4(position, 1.0);
}