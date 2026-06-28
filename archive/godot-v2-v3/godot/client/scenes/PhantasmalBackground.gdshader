shader_type canvas_item;

uniform float grid_size = 40.0;
uniform float line_thickness = 2.0;
uniform vec4 line_color : source_color = vec4(0.0, 0.6, 1.0, 0.3);
uniform vec4 base_color : source_color = vec4(0.01, 0.01, 0.03, 1.0);
uniform float speed = 0.3;

void fragment() {
    vec2 uv = UV;
    vec2 fragCoord = FRAGCOORD.xy;
    
    // Moving grid
    vec2 pos = fragCoord + vec2(0.0, TIME * 20.0 * speed);
    vec2 grid = fract(pos / grid_size);
    
    // Grid lines
    vec2 lines = smoothstep(0.0, line_thickness / grid_size, grid) * 
                 (1.0 - smoothstep(1.0 - line_thickness / grid_size, 1.0, grid));
    
    float line_mask = 1.0 - (lines.x * lines.y);
    
    // Phantasmal glow
    float glow = sin(pos.y * 0.03 + TIME) * 0.5 + 0.5;
    vec4 final_line_color = line_color * mix(0.3, 1.0, glow);
    
    // Data bits
    float bit = step(0.99, fract(sin(dot(floor(pos / grid_size), vec2(12.9898, 78.233))) * 43758.5453 + TIME * 1.5));
    final_line_color += vec4(0.0, 1.0, 0.8, 1.0) * bit * line_mask;
    
    // Vertical fade
    float fade = smoothstep(0.0, 0.8, 1.0 - uv.y);
    
    COLOR = mix(base_color, final_line_color, line_mask * fade);
}
