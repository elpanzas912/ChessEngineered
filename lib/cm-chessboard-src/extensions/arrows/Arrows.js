/**
 * Authors and copyright: Barak Michener (@barakmich) and Stefan Haack (@shaack)
 * Repository: https://github.com/shaack/cm-chessboard
 * License: MIT, see file 'LICENSE'
 */

import {Extension, EXTENSION_POINT} from "../../model/Extension.js"
import {Svg} from "../../lib/Svg.js"
import {Utils} from "../../lib/Utils.js"

export const ARROW_TYPE = {
    default: {class: "arrow-success"},
    success: {class: "arrow-success"},
    secondary: {class: "arrow-secondary"},
    warning: {class: "arrow-warning"},
    info: {class: "arrow-info"},
    danger: {class: "arrow-danger"}
}

export class Arrows extends Extension {

    /** @constructor */
    constructor(chessboard, props = {}) {
        super(chessboard)
        this.registerExtensionPoint(EXTENSION_POINT.afterRedrawBoard, () => {
            this.onRedrawBoard()
        })
        this.registerExtensionPoint(EXTENSION_POINT.destroy, () => {
            this.onDestroy()
        })
        this.props = {
            sprite: "extensions/arrows/arrows.svg",
            slice: "arrowDefault",
            headSize: 7,
            offsetFrom: 0,
            offsetTo: 0.55
        }
        Object.assign(this.props, props)
        if (this.chessboard.props.assetsCache) {
            this.chessboard.view.cacheSpriteToDiv("cm-chessboard-arrows", this.getSpriteUrl())
        }
        chessboard.addArrow = this.addArrow.bind(this)
        chessboard.getArrows = this.getArrows.bind(this)
        chessboard.removeArrows = this.removeArrows.bind(this)
        this.arrowGroup = Svg.addElement(chessboard.view.markersTopLayer, "g", {class: "arrows", style: "pointer-events: none"})
        this.instanceId = Math.random().toString(36).slice(2, 10)
        this.arrows = []
    }

    onDestroy() {
        this.arrows.length = 0
        if (this.arrowGroup && this.arrowGroup.parentNode) {
            this.arrowGroup.parentNode.removeChild(this.arrowGroup)
        }
        delete this.chessboard.addArrow
        delete this.chessboard.getArrows
        delete this.chessboard.removeArrows
    }

    onRedrawBoard() {
        while (this.arrowGroup.firstChild) {
            this.arrowGroup.removeChild(this.arrowGroup.firstChild)
        }
        this.arrows.forEach((arrow) => {
            this.drawArrow(arrow)
        })
    }

    drawArrow(arrow) {
        const view = this.chessboard.view
        const arrowsGroup = Svg.addElement(this.arrowGroup, "g")
        arrowsGroup.setAttribute("data-arrow", arrow.from + arrow.to)
        arrowsGroup.setAttribute("class", "arrow " + arrow.type.class)
        const ptFrom = view.squareToPoint(arrow.from)
        const ptTo = view.squareToPoint(arrow.to)
        const defs = Svg.addElement(arrowsGroup, "defs")
        const id = "arrow-" + this.instanceId + "-" + arrow.from + arrow.to
        const marker = Svg.addElement(defs, "marker", {
            id: id,
            markerWidth: this.props.headSize,
            markerHeight: this.props.headSize,
            refX: 20,
            refY: 20,
            viewBox: "0 0 40 40",
            orient: "auto",
            class: "arrow-head",
        })

        Svg.addElement(marker, "path", {
            d: "M13.6380471,11.3573439 L23.0265544,19.1369941 C23.4518122,19.4893778 23.5108883,20.1197808 23.1585046,20.5450386 C23.1090352,20.6047384 23.0527907,20.6584826 22.9909045,20.705188 L13.6023972,27.7906743 C13.1615654,28.1233691 12.5344983,28.0357067 12.2018035,27.594875 C12.0708444,27.4213498 12,27.2098744 12,26.9924778 L12,12.1273413 C12,11.5750565 12.4477153,11.1273413 13,11.1273413 C13.2329818,11.1273413 13.4586517,11.2086906 13.6380471,11.3573439 Z"
        })

        // Compute centers of start and end squares
        const cx1 = ptFrom.x + view.squareWidth / 2
        const cy1 = ptFrom.y + view.squareHeight / 2
        const cx2 = ptTo.x + view.squareWidth / 2
        const cy2 = ptTo.y + view.squareHeight / 2

        // Offset the line so it starts/ends at the edge of an invisible circle inside each square
        const dx = cx2 - cx1
        const dy = cy2 - cy1
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        // compute radii from props: factor relative to half of the square size
        const halfMin = Math.min(view.squareWidth, view.squareHeight) / 2
        const clamp01 = (v) => Math.max(0, Math.min(1, v))
        const rFrom = halfMin * clamp01(this.props.offsetFrom)
        const rTo = halfMin * clamp01(this.props.offsetTo)
        const x1 = cx1 + ux * rFrom
        const y1 = cy1 + uy * rFrom
        const x2 = cx2 - ux * rTo
        const y2 = cy2 - uy * rTo

        const width = ((view.scalingX + view.scalingY) / 2) * 16
        let lineFill = Svg.addElement(arrowsGroup, "line")
        lineFill.setAttribute('x1', x1.toString())
        lineFill.setAttribute('x2', x2.toString())
        lineFill.setAttribute('y1', y1.toString())
        lineFill.setAttribute('y2', y2.toString())
        lineFill.setAttribute('class', 'arrow-line')
        lineFill.setAttribute("marker-end", "url(#" + id + ")")
        lineFill.setAttribute('stroke-width', width + "px")
    }

    addArrow(type, from, to) {
        this.arrows.push(new Arrow(from, to, type))
        this.onRedrawBoard()
    }

    getArrows(type = undefined, from = undefined, to = undefined) {
        let arrows = []
        this.arrows.forEach((arrow) => {
            if (arrow.matches(from, to, type)) {
                arrows.push(arrow)
            }
        })
        return arrows
    }

    removeArrows(type = undefined, from = undefined, to = undefined) {
        this.arrows = this.arrows.filter((arrow) => !arrow.matches(from, to, type))
        this.onRedrawBoard()
    }

    getSpriteUrl() {
        if(Utils.isAbsoluteUrl(this.props.sprite)) {
            return this.props.sprite
        } else {
            return this.chessboard.props.assetsUrl + this.props.sprite
        }
    }
}

class Arrow {
    constructor(from, to, type) {
        this.from = from
        this.to = to
        this.type = type
    }

    matches(from = undefined, to = undefined, type = undefined) {
        if (from && from !== this.from) {
            return false
        }
        if (to && to !== this.to) {
            return false
        }
        return !(type && type !== this.type)
    }
}
