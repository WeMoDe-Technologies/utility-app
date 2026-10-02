import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let ORANGE = CGColor(red: 0xE2/255, green: 0x56/255, blue: 0x1E/255, alpha: 1)
let INK    = CGColor(red: 0x1E/255, green: 0x1C/255, blue: 0x19/255, alpha: 1)
let BONE   = CGColor(red: 0xED/255, green: 0xEA/255, blue: 0xE1/255, alpha: 1)
let CARD   = CGColor(red: 0xFF/255, green: 0xFD/255, blue: 0xF7/255, alpha: 1)

func roundedRect(_ r: CGRect, _ radius: CGFloat) -> CGPath {
    CGPath(roundedRect: r, cornerWidth: radius, cornerHeight: radius, transform: nil)
}

func drawCaps(_ ctx: CGContext, _ text: String, font name: String, size: CGFloat,
              color: CGColor, center: CGPoint, tracking: CGFloat) {
    let font = CTFontCreateWithName(name as CFString, size, nil)
    let attrs: [CFString: Any] = [
        kCTFontAttributeName: font,
        kCTForegroundColorAttributeName: color,
        kCTKernAttributeName: tracking,
    ]
    let attributed = CFAttributedStringCreate(nil, text as CFString, attrs as CFDictionary)!
    let line = CTLineCreateWithAttributedString(attributed)
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    ctx.textPosition = CGPoint(x: center.x - b.width / 2 - b.minX + tracking / 2,
                               y: center.y - b.height / 2 - b.minY)
    CTLineDraw(line, ctx)
}

let W: CGFloat = 1284, H: CGFloat = 2778
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: nil, width: Int(W), height: Int(H), bitsPerComponent: 8,
                    bytesPerRow: 0, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!

// Bone field
ctx.setFillColor(BONE)
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

// Centred plate with its hard shadow
let side: CGFloat = 340
let plate = CGRect(x: (W - side) / 2, y: H / 2 - side / 2 + 90, width: side, height: side)
let radius = side * 0.14
let off = side * 0.055

ctx.setFillColor(INK)
ctx.addPath(roundedRect(plate.offsetBy(dx: off, dy: -off), radius)); ctx.fillPath()
ctx.setFillColor(ORANGE)
ctx.addPath(roundedRect(plate, radius)); ctx.fillPath()
ctx.setStrokeColor(INK); ctx.setLineWidth(side * 0.045)
ctx.addPath(roundedRect(plate.insetBy(dx: side * 0.0225, dy: side * 0.0225), radius * 0.9))
ctx.strokePath()
drawCaps(ctx, "KIT", font: "Arial-Black", size: side * 0.34, color: CARD,
         center: CGPoint(x: plate.midX, y: plate.midY), tracking: side * 0.012)

// Wordmark + rule beneath
drawCaps(ctx, "KIT", font: "Arial-Black", size: 96, color: INK,
         center: CGPoint(x: W / 2, y: plate.minY - 150), tracking: 22)
ctx.setFillColor(INK)
ctx.fill(CGRect(x: W / 2 - 150, y: plate.minY - 205, width: 300, height: 5))
drawCaps(ctx, "20 POCKET TOOLS", font: "Arial-Bold", size: 34,
         color: CGColor(red: 0x5A/255, green: 0x55/255, blue: 0x4C/255, alpha: 1),
         center: CGPoint(x: W / 2, y: plate.minY - 265), tracking: 9)

let image = ctx.makeImage()!
let dest = CGImageDestinationCreateWithURL(
    URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL,
    UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, image, nil)
CGImageDestinationFinalize(dest)
print("wrote splash")
