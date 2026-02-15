use crate::assets::fonts;
use cosmic_text::{
    Attrs, Buffer as CosmicBuffer, Color as CosmicColor, Family, FontSystem, Metrics,
    Shaping, SwashCache, Weight,
};
use std::sync::Arc;
use tiny_skia::{Pixmap, PremultipliedColorU8};

/// Font weight identifiers for JetBrains Mono.
#[derive(Debug, Clone, Copy)]
pub enum FontWeight {
    Regular,
    Medium,
    SemiBold,
    Bold,
}

/// Shared font system loaded once at startup.
pub struct TextRenderer {
    pub font_system: FontSystem,
    pub swash_cache: SwashCache,
}

impl TextRenderer {
    pub fn new() -> Self {
        let mut font_system = FontSystem::new();

        // Load all embedded fonts
        font_system.db_mut().load_font_data(fonts::ANTON_REGULAR.to_vec());
        font_system.db_mut().load_font_data(fonts::JETBRAINS_MONO_REGULAR.to_vec());
        font_system.db_mut().load_font_data(fonts::JETBRAINS_MONO_MEDIUM.to_vec());
        font_system.db_mut().load_font_data(fonts::JETBRAINS_MONO_SEMIBOLD.to_vec());
        font_system.db_mut().load_font_data(fonts::JETBRAINS_MONO_BOLD.to_vec());

        let swash_cache = SwashCache::new();

        Self {
            font_system,
            swash_cache,
        }
    }

    /// Measure text width for a given font and size.
    pub fn measure_text(
        &mut self,
        text: &str,
        font_family: &str,
        font_size: f32,
        weight: FontWeight,
    ) -> f32 {
        let metrics = Metrics::new(font_size, font_size * 1.2);
        let mut buffer = CosmicBuffer::new(&mut self.font_system, metrics);

        let attrs = Attrs::new()
            .family(Family::Name(font_family))
            .weight(weight_to_cosmic(weight));

        buffer.set_text(&mut self.font_system, text, attrs, Shaping::Advanced);
        buffer.shape_until_scroll(&mut self.font_system, false);

        let mut max_width: f32 = 0.0;
        for run in buffer.layout_runs() {
            let line_w = run.line_w;
            if line_w > max_width {
                max_width = line_w;
            }
        }
        max_width
    }

    /// Render text into a Pixmap with the given color.
    /// Returns the pixmap and the actual text dimensions (width, height).
    pub fn render_text(
        &mut self,
        text: &str,
        font_family: &str,
        font_size: f32,
        weight: FontWeight,
        color: tiny_skia::Color,
        max_width: f32,
    ) -> (Pixmap, f32, f32) {
        let line_height = font_size * 1.2;
        let metrics = Metrics::new(font_size, line_height);
        let mut buffer = CosmicBuffer::new(&mut self.font_system, metrics);

        let attrs = Attrs::new()
            .family(Family::Name(font_family))
            .weight(weight_to_cosmic(weight));

        buffer.set_size(&mut self.font_system, Some(max_width), None);
        buffer.set_text(&mut self.font_system, text, attrs, Shaping::Advanced);
        buffer.shape_until_scroll(&mut self.font_system, false);

        // Measure actual bounds
        let mut total_width: f32 = 0.0;
        let mut total_height: f32 = 0.0;
        for run in buffer.layout_runs() {
            if run.line_w > total_width {
                total_width = run.line_w;
            }
            total_height = run.line_top + line_height;
        }

        let pix_w = (total_width.ceil() as u32).max(1);
        let pix_h = (total_height.ceil() as u32).max(1);
        let mut pixmap = Pixmap::new(pix_w, pix_h).unwrap();

        let cosmic_color = CosmicColor::rgba(
            (color.red() * 255.0) as u8,
            (color.green() * 255.0) as u8,
            (color.blue() * 255.0) as u8,
            (color.alpha() * 255.0) as u8,
        );

        buffer.draw(&mut self.font_system, &mut self.swash_cache, cosmic_color, |x, y, w, h, color| {
            let a = color.a();
            if a == 0 {
                return;
            }
            for py in y..(y + h as i32) {
                for px in x..(x + w as i32) {
                    if px >= 0 && (px as u32) < pix_w && py >= 0 && (py as u32) < pix_h {
                        let idx = (py as u32 * pix_w + px as u32) as usize;
                        let pixel = pixmap.pixels_mut();
                        if idx < pixel.len() {
                            let src_r = color.r();
                            let src_g = color.g();
                            let src_b = color.b();
                            let src_a = a;

                            // Alpha-blend onto existing pixel
                            let dst = pixel[idx];
                            let dst_r = dst.red();
                            let dst_g = dst.green();
                            let dst_b = dst.blue();
                            let dst_a = dst.alpha();

                            let sa = src_a as u16;
                            let da = dst_a as u16;
                            let out_a = sa + da * (255 - sa) / 255;

                            if out_a > 0 {
                                let out_r = ((src_r as u16 * sa + dst_r as u16 * da * (255 - sa) / 255) / out_a) as u8;
                                let out_g = ((src_g as u16 * sa + dst_g as u16 * da * (255 - sa) / 255) / out_a) as u8;
                                let out_b = ((src_b as u16 * sa + dst_b as u16 * da * (255 - sa) / 255) / out_a) as u8;
                                // Store as premultiplied
                                let pm_r = (out_r as u16 * out_a / 255) as u8;
                                let pm_g = (out_g as u16 * out_a / 255) as u8;
                                let pm_b = (out_b as u16 * out_a / 255) as u8;
                                pixel[idx] = PremultipliedColorU8::from_rgba(pm_r, pm_g, pm_b, out_a as u8).unwrap();
                            }
                        }
                    }
                }
            }
        });

        (pixmap, total_width, total_height)
    }
}

fn weight_to_cosmic(w: FontWeight) -> Weight {
    match w {
        FontWeight::Regular => Weight(400),
        FontWeight::Medium => Weight(500),
        FontWeight::SemiBold => Weight(600),
        FontWeight::Bold => Weight(700),
    }
}

/// Thread-safe shared text renderer.
pub type SharedTextRenderer = Arc<tokio::sync::Mutex<TextRenderer>>;

pub fn create_shared_renderer() -> SharedTextRenderer {
    Arc::new(tokio::sync::Mutex::new(TextRenderer::new()))
}
