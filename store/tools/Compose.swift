import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers
import AppKit

// Kit's store frames: a coloured fascia band carrying the headline, closed by a
// heavy rule, with the device shot sitting in a drawn plate that overlaps it.
let INK  = CGColor(red: 0x1E/255, green: 0x1C/255, blue: 0x19/255, alpha: 1)
let BONE = CGColor(red: 0xED/255, green: 0xEA/255, blue: 0xE1/255, alpha: 1)
let CARD = CGColor(red: 0xFF/255, green: 0xFD/255, blue: 0xF7/255, alpha: 1)

func hex(_ s: String) -> CGColor {
    var v: UInt64 = 0; Scanner(string: s.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    return CGColor(red: CGFloat((v >> 16) & 0xff)/255, green: CGFloat((v >> 8) & 0xff)/255,
                   blue: CGFloat(v & 0xff)/255, alpha: 1)
}

/// Black or bone text, whichever stays legible on `bg`.
func onColour(_ bg: CGColor) -> CGColor {
    let c = bg.components!
    return (0.299*c[0] + 0.587*c[1] + 0.114*c[2]) > 0.62 ? INK : CARD
}

func roundedRect(_ r: CGRect, _ rad: CGFloat) -> CGPath {
    CGPath(roundedRect: r, cornerWidth: rad, cornerHeight: rad, transform: nil)
}

func draw(_ ctx: CGContext, _ text: String, font: String, size: CGFloat,
          color: CGColor, centerX: CGFloat, baselineY: CGFloat, tracking: CGFloat) {
    let f = CTFontCreateWithName(font as CFString, size, nil)
    let attrs: [CFString: Any] = [kCTFontAttributeName: f,
                                  kCTForegroundColorAttributeName: color,
                                  kCTKernAttributeName: tracking]
    let line = CTLineCreateWithAttributedString(
        CFAttributedStringCreate(nil, text as CFString, attrs as CFDictionary)!)
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    ctx.textPosition = CGPoint(x: centerX - b.width/2 - b.minX + tracking/2, y: baselineY)
    CTLineDraw(line, ctx)
}

func loadImage(_ path: String) -> CGImage {
    let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil)!
    return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}

struct Frame {
    let shot: String, out: String, accent: String
    let head: [String], sub: String
    let W: CGFloat, H: CGFloat
    // Proportions differ per store: the App Store canvas is 19.5:9 while Play
    // phone shots are 16:9, so the device has to be narrower there to fit.
    let bandFrac: CGFloat, devWFrac: CGFloat, devTopFrac: CGFloat
}

func render(_ f: Frame) {
    let cs = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: nil, width: Int(f.W), height: Int(f.H), bitsPerComponent: 8,
                        bytesPerRow: 0, space: cs,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    // The context is y-up and draws images upright, so rather than flipping it
    // (which would invert the screenshot and the type), convert each top-down
    // coordinate arithmetically. Y() takes a top edge and returns the context y
    // of a rect's BOTTOM edge.
    func Y(_ top: CGFloat) -> CGFloat { f.H - top }

    let accent = hex(f.accent)
    let fg = onColour(accent)
    let scale = f.W / 1320.0           // all metrics authored against the 6.9" canvas

    ctx.setFillColor(BONE); ctx.fill(CGRect(x: 0, y: 0, width: f.W, height: f.H))

    // Fascia band + closing rule
    let band = f.bandFrac * f.H
    ctx.setFillColor(accent); ctx.fill(CGRect(x: 0, y: Y(band), width: f.W, height: band))
    ctx.setFillColor(INK);    ctx.fill(CGRect(x: 0, y: Y(band + 9*scale), width: f.W, height: 9*scale))

    // Headline
    let headSize = (f.head.count > 1 ? 92.0 : 104.0) * scale
    var baseline = 250 * scale
    for lineText in f.head {
        draw(ctx, lineText, font: "Arial-Black", size: headSize, color: fg,
             centerX: f.W/2, baselineY: Y(baseline), tracking: 1.5*scale)
        baseline += headSize * 1.12
    }
    draw(ctx, f.sub, font: "Arial-BoldMT", size: 38*scale, color: fg,
         centerX: f.W/2, baselineY: Y(baseline + 36*scale), tracking: 2.5*scale)

    // Device plate, overlapping the band
    let shot = loadImage(f.shot)
    let dw = f.devWFrac * f.W
    let dh = dw * CGFloat(shot.height) / CGFloat(shot.width)
    let dx = (f.W - dw)/2
    let dy = f.devTopFrac * f.H               // top edge, in top-down coords
    let rect = CGRect(x: dx, y: Y(dy + dh), width: dw, height: dh)
    let rad  = 44 * scale
    let bw   = 9 * scale
    let off  = 26 * scale

    ctx.setFillColor(INK)                      // hard shadow
    ctx.addPath(roundedRect(rect.offsetBy(dx: off, dy: -off), rad)); ctx.fillPath()

    ctx.saveGState()                           // screenshot, clipped to the plate
    ctx.addPath(roundedRect(rect, rad)); ctx.clip()
    ctx.draw(shot, in: rect)
    ctx.restoreGState()

    ctx.setStrokeColor(INK); ctx.setLineWidth(bw)   // drawn border
    ctx.addPath(roundedRect(rect.insetBy(dx: bw/2, dy: bw/2), rad)); ctx.strokePath()

    let img = ctx.makeImage()!
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: f.out) as CFURL,
                                               UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil)
    CGImageDestinationFinalize(dest)
    print("  \((f.out as NSString).lastPathComponent)")
}

// argv: shots-dir out-dir  W H
let a = CommandLine.arguments
let shots = a[1], outDir = a[2], W = CGFloat(Double(a[3])!), H = CGFloat(Double(a[4])!)
let bandFrac = CGFloat(Double(a[5])!), devWFrac = CGFloat(Double(a[6])!), devTopFrac = CGFloat(Double(a[7])!)

let specs: [(String, String, [String], String)] = [
  ("01-home",      "#E2561E", ["EVERY TOOL,", "ONE TAP AWAY"], "20 EVERYDAY UTILITIES IN ONE APP"),
  ("02-calculator","#E2561E", ["CALCULATORS", "THAT ADD UP"],  "BASIC AND SCIENTIFIC, WITH HISTORY"),
  ("03-emi",       "#C2902B", ["MONEY,", "FIGURED OUT"],       "EMI · GST · SIP · TIPS · EXPENSES"),
  ("04-converter", "#2E6A66", ["CONVERT", "ANYTHING"],         "LENGTH · WEIGHT · TEMP · DATA · MORE"),
  ("05-color",     "#6B4A6E", ["PICK AND SAVE", "COLOURS"],    "HEX · RGB · HSL · CONTRAST CHECK"),
  ("06-themes",    "#E2561E", ["SIX RETRO", "THEMES"],         "PAPER · ENAMEL · BLUEPRINT · PHOSPHOR"),
  ("07-stopwatch", "#4C6B3C", ["TIMERS THAT", "KEEP TIME"],    "STOPWATCH · POMODORO · WORLD CLOCK"),
]

for (name, accent, head, sub) in specs {
    render(Frame(shot: "\(shots)/\(name).png", out: "\(outDir)/\(name).png",
                 accent: accent, head: head, sub: sub, W: W, H: H,
                 bandFrac: bandFrac, devWFrac: devWFrac, devTopFrac: devTopFrac))
}
