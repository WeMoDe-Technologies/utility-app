import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers
import AppKit

let INK    = CGColor(red: 0x1E/255, green: 0x1C/255, blue: 0x19/255, alpha: 1)
let BONE   = CGColor(red: 0xED/255, green: 0xEA/255, blue: 0xE1/255, alpha: 1)
let CARD   = CGColor(red: 0xFF/255, green: 0xFD/255, blue: 0xF7/255, alpha: 1)
let ORANGE = CGColor(red: 0xE2/255, green: 0x56/255, blue: 0x1E/255, alpha: 1)

func hex(_ s: String) -> CGColor {
    var v: UInt64 = 0; Scanner(string: s).scanHexInt64(&v)
    return CGColor(red: CGFloat((v >> 16) & 0xff)/255, green: CGFloat((v >> 8) & 0xff)/255,
                   blue: CGFloat(v & 0xff)/255, alpha: 1)
}
func rr(_ r: CGRect, _ rad: CGFloat) -> CGPath {
    CGPath(roundedRect: r, cornerWidth: rad, cornerHeight: rad, transform: nil)
}
func text(_ ctx: CGContext, _ s: String, _ font: String, _ size: CGFloat, _ color: CGColor,
          x: CGFloat, baselineY: CGFloat, tracking: CGFloat, centered: Bool = false) {
    let f = CTFontCreateWithName(font as CFString, size, nil)
    let attrs: [CFString: Any] = [kCTFontAttributeName: f,
                                  kCTForegroundColorAttributeName: color,
                                  kCTKernAttributeName: tracking]
    let line = CTLineCreateWithAttributedString(
        CFAttributedStringCreate(nil, s as CFString, attrs as CFDictionary)!)
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    ctx.textPosition = CGPoint(x: centered ? x - b.width/2 - b.minX + tracking/2 : x - b.minX,
                               y: baselineY)
    CTLineDraw(line, ctx)
}

let W: CGFloat = 1024, H: CGFloat = 500
let ctx = CGContext(data: nil, width: Int(W), height: Int(H), bitsPerComponent: 8,
                    bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
func Y(_ top: CGFloat) -> CGFloat { H - top }

// Orange field
ctx.setFillColor(ORANGE); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))

// KIT plate, left
let side: CGFloat = 250
let plate = CGRect(x: 78, y: Y(125 + side), width: side, height: side)
ctx.setFillColor(INK); ctx.addPath(rr(plate.offsetBy(dx: 14, dy: -14), 36)); ctx.fillPath()
ctx.setFillColor(CARD); ctx.addPath(rr(plate, 36)); ctx.fillPath()
ctx.setStrokeColor(INK); ctx.setLineWidth(11)
ctx.addPath(rr(plate.insetBy(dx: 5.5, dy: 5.5), 32)); ctx.strokePath()
text(ctx, "KIT", "Arial-Black", 86, INK, x: plate.midX, baselineY: Y(290),
     tracking: 3, centered: true)

// Wordmark + strapline, right
let tx: CGFloat = 400
text(ctx, "20 TOOLS.",  "Arial-Black", 82, CARD, x: tx, baselineY: Y(200), tracking: 2)
text(ctx, "ONE APP.",   "Arial-Black", 82, CARD, x: tx, baselineY: Y(290), tracking: 2)
ctx.setFillColor(INK); ctx.fill(CGRect(x: tx, y: Y(330), width: 300, height: 7))
text(ctx, "CALCULATORS · CONVERTERS · TIMERS", "Arial-BoldMT", 23, CARD,
     x: tx, baselineY: Y(382), tracking: 2.2)
text(ctx, "WORKS OFFLINE · NO ACCOUNT · NO ADS", "Arial-BoldMT", 23, INK,
     x: tx, baselineY: Y(420), tracking: 2.2)

// Tool ink chips along the bottom edge, like a colour key
let chips = ["2E6A66","C2902B","6B4A6E","4C6B3C","27566B","A6392B","B5705A","3C5A7D"]
var cx: CGFloat = 78
for c in chips {
    let r = CGRect(x: cx, y: Y(455), width: 30, height: 30)
    ctx.setFillColor(hex(c)); ctx.addPath(rr(r, 5)); ctx.fillPath()
    ctx.setStrokeColor(INK); ctx.setLineWidth(3)
    ctx.addPath(rr(r.insetBy(dx: 1.5, dy: 1.5), 4)); ctx.strokePath()
    cx += 40
}

let img = ctx.makeImage()!
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[1]) as CFURL,
                                           UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, img, nil)
CGImageDestinationFinalize(dest)
print("feature graphic written")
