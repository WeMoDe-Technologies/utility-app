import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Kit's marks, drawn the way the app draws everything: flat fields, drawn
// rules, a hard offset shadow, and stencilled caps.
let ORANGE = CGColor(red: 0xE2/255, green: 0x56/255, blue: 0x1E/255, alpha: 1)
let INK    = CGColor(red: 0x1E/255, green: 0x1C/255, blue: 0x19/255, alpha: 1)
let BONE   = CGColor(red: 0xFF/255, green: 0xFD/255, blue: 0xF7/255, alpha: 1)

func roundedRect(_ r: CGRect, _ radius: CGFloat) -> CGPath {
    CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

/// Centre a line of text and draw it.
func drawCaps(_ ctx: CGContext, _ text: String, size: CGFloat, color: CGColor,
              center: CGPoint, tracking: CGFloat) {
    let font = CTFontCreateWithName("Arial-Black" as CFString, size, nil)
    // kCTKernAttributeName rather than AppKit's .kern — this is CoreText only.
    let attrs: [CFString: Any] = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: color,
        kCTKernAttributeName: tracking,
    ]
    let attributed = CFAttributedStringCreate(nil, text as CFString, attrs as CFDictionary)!
    let line = CTLineCreateWithAttributedString(attributed)
    let bounds = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    // Kerning adds trailing space after the final glyph, which drags the
    // optical centre left; add half of it back.
    ctx.textPosition = CGPoint(x: center.x - bounds.width / 2 - bounds.minX + tracking / 2,
                               y: center.y - bounds.height / 2 - bounds.minY)
    CTLineDraw(line, ctx)
}

func render(path: String, size: CGFloat, fullBleed: Bool) {
    let cs = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: nil, width: Int(size), height: Int(size),
                              bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    else { fatalError("no context") }

    let full = CGRect(x: 0, y: 0, width: size, height: size)

    if fullBleed {
        // iOS masks the icon itself, so the field runs edge to edge.
        ctx.setFillColor(ORANGE); ctx.fill(full)
    } else {
        ctx.clear(full)   // Android foreground layer stays transparent
    }

    // Android keeps only the centre ~66%; keep the plate inside that.
    let plateSide = fullBleed ? size * 0.70 : size * 0.52
    let plate = CGRect(x: (size - plateSide) / 2, y: (size - plateSide) / 2,
                       width: plateSide, height: plateSide)
    let radius = plateSide * 0.14
    let offset = plateSide * 0.055

    // Hard offset shadow, then the plate on top — Kit's core motif.
    ctx.setFillColor(INK)
    ctx.addPath(roundedRect(plate.offsetBy(dx: offset, dy: -offset), radius))
    ctx.fillPath()

    ctx.setFillColor(fullBleed ? BONE : ORANGE)
    ctx.addPath(roundedRect(plate, radius))
    ctx.fillPath()

    ctx.setStrokeColor(INK)
    ctx.setLineWidth(plateSide * 0.045)
    ctx.addPath(roundedRect(plate.insetBy(dx: plateSide * 0.0225, dy: plateSide * 0.0225),
                            radius * 0.9))
    ctx.strokePath()

    drawCaps(ctx, "KIT",
             size: plateSide * 0.34,
             color: fullBleed ? INK : BONE,
             center: CGPoint(x: plate.midX, y: plate.midY),
             tracking: plateSide * 0.012)

    guard let image = ctx.makeImage(),
          let dest = CGImageDestinationCreateWithURL(
              URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { fatalError("no image") }
    CGImageDestinationAddImage(dest, image, nil)
    CGImageDestinationFinalize(dest)
    print("wrote \(path)")
}

let args = CommandLine.arguments
render(path: args[1], size: 1024, fullBleed: true)
render(path: args[2], size: 1024, fullBleed: false)
