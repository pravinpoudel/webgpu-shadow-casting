struct shaderIn{
 @location(0) color:vec4<f32>,
 @location(1) shadowPosition:vec3<f32>,
 @location(2) fragNormal:vec3<f32>
}


@group(1) @binding(0) var comparisionSampler:sampler_comparison;
@group(1) @binding(1) var d_texture:texture_depth_2d;
@group(1) @binding(2) var<uniform> lightposition: vec3<f32>;

@fragment
fn main(in1:shaderIn)->@location(0) vec4<f32>{
    var diffuseCofficient:f32 = dot(lightposition,in1.fragNormal);
    var specular:f32 = 0.0;
    var shadow:f32 = 0.0;
    var lightColor:vec3<f32> = vec3<f32>(1.0);
    var ambient:vec3<f32> = 0.6*lightColor;
    var textureSize:vec2<f32> = vec2<f32>(textureDimensions(d_texture).xy);
    var textelSize:vec2<f32> = vec2<f32>(1.0/textureSize.x, 1.0/textureSize.y);
    for(var i:f32=-1.0; i<=1.0; i = i+1.0){
        for(var j:f32= 0.0; j<=1.0; j = j+1.0){
            var newPosition:vec2<f32> = vec2<f32>(in1.shadowPosition.x + i*textelSize.x , in1.shadowPosition.y + j*textelSize.y);
            var sampledResult:f32 = textureSampleCompare(d_texture, comparisionSampler, newPosition.xy, in1.shadowPosition.z);    
            shadow += sampledResult;
        }
    }
    shadow = shadow/9.0; 
    var effectiveDiffuse:f32 = diffuseCofficient*shadow;
    var lighting:vec4<f32> = vec4(ambient, 1.0)*effectiveDiffuse*in1.color;
    return vec4<f32>(0.2, 0.2, 0.0, 1.0);
}