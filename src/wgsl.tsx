const vertex = `

struct Uniforms{
    ViewProjectionMatrix: mat<4x4>f32;
    lightViewProjectionMatrix: mat<4x4>f32;
    modelMatrix: mat<4x4>f32; 
    ligtPosition: vec3<f32>;
};

struct VertexOut{
    @location(0) fragPosition: vec3<f32>;
    @location(1)
    @location(2)
}

@builtin(position) Position: vec4<f32>;


@group(0) @binding(0) var<storage, read> nodes: Nodes;
@group(0) @binding(1) var<uniform> uniforms:Uniforms;

@location(0) position: vec3<f32>;
@location(1) normal: vec3<f32>;

@vertex
fn main(position, normal)->VertexOut{
    var vertexout:outVertexOut;

    return vertexout;
}
`;

const vertex_shadow = ``;

const fragment = `

struct Uniforms{
    ViewProjectionMatrix: mat<4x4>f32;
    lightViewProjectionMatrix: mat<4x4>f32;
    modelMatrix: mat<4x4>f32; 
    ligtPosition: vec3<f32>;
};

struct FSInput{
    @location(0) fragPosition: vec3<f32>;
    @location(1) 
    @location(2) shadowPosition: vec3<f32>
}
@fragment
fn main()->location(0) vec4<f32>{

}
`;

export { vertex, vertex_shadow, fragment };
