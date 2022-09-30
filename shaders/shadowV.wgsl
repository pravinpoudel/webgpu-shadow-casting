// bindgroup input
struct VertexOutput{
    @builtin(position) Position:vec4<f32>;
    @location(0) 
    @location(1) 
}

@group(0) binding(1) var <uniform> color:vec4<f32>;
// sampler

@vertex
fn main(@location(0) position:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) uv:vec2<f32>)->VertexOutput{
    let vo:VertexOutput;

    return vo;
}