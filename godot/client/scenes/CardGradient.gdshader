shader_type canvas_item;

uniform vec4 top_color : source_color = vec4(0.1, 0.1, 0.1, 1.0);
uniform vec4 bottom_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform vec4 border_color : source_color = vec4(0.8, 0.6, 0.2, 1.0);
uniform float border_width : hint_range(0.0, 10.0) = 2.0;
uniform float corner_radius : hint_range(0.0, 50.0) = 10.0;
uniform vec2 size = vec2(102.0, 120.0);
uniform float hover_intensity : hint_range(0.0, 1.0) = 0.0;

float rounded_box(vec2 center, vec2 half_size, float radius) {
    vec2 q = abs(center) - half_size + vec2(radius);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

void fragment() {
    vec2 uv = UV;
    vec2 pos = uv * size;
    vec2 center = pos - size * 0.5;
    
    float dist = rounded_box(center, size * 0.5, corner_radius);
    float alpha = smoothstep(0.5, -0.5, dist);
    
    if (alpha == 0.0) {
        discard;
    }
    
    float border_dist = rounded_box(center, size * 0.5 - vec2(border_width), max(0.0, corner_radius - border_width));
    float border_alpha = smoothstep(0.5, -0.5, border_dist);
    
    vec4 gradient = mix(top_color, bottom_color, uv.y);
    
    // Premium phantasmal shimmer
    float shimmer = sin(uv.x * 8.0 - uv.y * 12.0 + TIME * 1.2) * 0.5 + 0.5;
    gradient.rgb += vec3(0.08, 0.1, 0.15) * shimmer;
    gradient.rgb += vec3(0.25, 0.25, 0.3) * hover_intensity;
    
    vec4 col = mix(border_color, gradient, border_alpha);
    
    COLOR = vec4(col.rgb, col.a * alpha);
}
