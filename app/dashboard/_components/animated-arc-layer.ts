import { ArcLayer } from "@deck.gl/layers"
import type { ArcLayerProps } from "@deck.gl/layers"

/**
 * Custom ArcLayer subclass that progressively draws arcs using a `coef`
 * uniform (0 = invisible, 1 = fully drawn). Animating `coef` from 0→1
 * produces a staggered "reveal" effect.
 */

interface AnimatedArcLayerProps<D> extends ArcLayerProps<D> {
  coef?: number
}

export class AnimatedArcLayer<D> extends ArcLayer<D> {
  static layerName = "AnimatedArcLayer"

  getShaders() {
    const shaders = super.getShaders()
    shaders.inject = {
      ...shaders.inject,
      "vs:#decl": "uniform float coef;",
      "vs:#main-end": `
        if (segmentRatio > coef) {
          gl_Position = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `,
      "fs:#decl": "uniform float coef;",
    }
    return shaders
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draw(opts: any) {
    const props = this.props as AnimatedArcLayerProps<D>
    const coef = props.coef ?? 1.0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (this.state as any).model
    if (model) {
      model.setUniforms({ coef })
    }
    super.draw(opts)
  }
}
