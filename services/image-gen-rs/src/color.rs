use tiny_skia::Color;

/// Parse a hex color string (#RGB, #RRGGBB) into a tiny-skia Color.
pub fn parse_hex(hex: &str) -> Option<Color> {
    let hex = hex.trim_start_matches('#');
    match hex.len() {
        3 => {
            let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).ok()?;
            let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).ok()?;
            let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).ok()?;
            Some(Color::from_rgba8(r, g, b, 255))
        }
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).ok()?;
            let g = u8::from_str_radix(&hex[2..4], 16).ok()?;
            let b = u8::from_str_radix(&hex[4..6], 16).ok()?;
            Some(Color::from_rgba8(r, g, b, 255))
        }
        _ => None,
    }
}

/// Parse a CSS color: hex (#RRGGBB) or rgba(r,g,b,a) or "transparent".
pub fn parse_css_color(s: &str) -> Option<Color> {
    let s = s.trim();
    if s == "transparent" {
        return Some(Color::from_rgba8(0, 0, 0, 0));
    }
    if s.starts_with('#') {
        return parse_hex(s);
    }
    if s.starts_with("rgba(") && s.ends_with(')') {
        let inner = &s[5..s.len() - 1];
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() == 4 {
            let r: u8 = parts[0].trim().parse().ok()?;
            let g: u8 = parts[1].trim().parse().ok()?;
            let b: u8 = parts[2].trim().parse().ok()?;
            let a: f32 = parts[3].trim().parse().ok()?;
            return Some(Color::from_rgba8(r, g, b, (a * 255.0) as u8));
        }
    }
    if s.starts_with("rgb(") && s.ends_with(')') {
        let inner = &s[4..s.len() - 1];
        let parts: Vec<&str> = inner.split(',').collect();
        if parts.len() == 3 {
            let r: u8 = parts[0].trim().parse().ok()?;
            let g: u8 = parts[1].trim().parse().ok()?;
            let b: u8 = parts[2].trim().parse().ok()?;
            return Some(Color::from_rgba8(r, g, b, 255));
        }
    }
    None
}

/// Lighten a hex color by a percentage (same algorithm as TypeScript).
pub fn lighten_hex(hex: &str, percent: f32) -> String {
    let hex = hex.trim_start_matches('#');
    let num = u32::from_str_radix(hex, 16).unwrap_or(0);
    let amt = (2.55 * percent).round() as i32;
    let r = (((num >> 16) & 0xff) as i32 + amt).min(255).max(0) as u32;
    let g = (((num >> 8) & 0xff) as i32 + amt).min(255).max(0) as u32;
    let b = ((num & 0xff) as i32 + amt).min(255).max(0) as u32;
    format!("#{:06x}", (r << 16) | (g << 8) | b)
}

/// Darken a hex color by a percentage (same algorithm as TypeScript).
pub fn darken_hex(hex: &str, percent: f32) -> String {
    let hex = hex.trim_start_matches('#');
    let num = u32::from_str_radix(hex, 16).unwrap_or(0);
    let amt = (2.55 * percent).round() as i32;
    let r = (((num >> 16) & 0xff) as i32 - amt).min(255).max(0) as u32;
    let g = (((num >> 8) & 0xff) as i32 - amt).min(255).max(0) as u32;
    let b = ((num & 0xff) as i32 - amt).min(255).max(0) as u32;
    format!("#{:06x}", (r << 16) | (g << 8) | b)
}

/// Convert a hex color to rgba() string with given alpha.
pub fn add_alpha(hex: &str, alpha: f32) -> String {
    let hex = hex.trim_start_matches('#');
    let num = u32::from_str_radix(hex, 16).unwrap_or(0);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    format!("rgba({}, {}, {}, {})", r, g, b, alpha)
}
