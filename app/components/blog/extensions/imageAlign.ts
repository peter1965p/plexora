import Image from '@tiptap/extension-image'
import { mergeAttributes, ResizableNodeView } from '@tiptap/core'

// Erweitert das Standard-Image-Node um ein "align"-Attribut (links/rechts/zentriert),
// das als Inline-Style (float bzw. block+margin:auto) direkt im <img>-Tag landet —
// dadurch braucht der öffentliche Blog-Renderer keine eigene CSS-Logik dafür.
export const ImageAlign = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          if (el.style.float === 'left' || el.style.float === 'right') return el.style.float
          if (el.style.display === 'block' && el.style.marginLeft === 'auto') return 'center'
          return null
        },
        renderHTML: (attrs: { align?: string | null }) => {
          if (attrs.align === 'left' || attrs.align === 'right') {
            const side = attrs.align === 'left' ? '0 20px 12px 0' : '0 0 12px 20px'
            return { style: `float:${attrs.align};max-width:50%;height:auto;margin:${side}` }
          }
          if (attrs.align === 'center') {
            return { style: 'display:block;float:none;margin:16px auto;max-width:100%;height:auto' }
          }
          return { style: 'max-width:100%;height:auto' }
        },
      },
    }
  },

  // Der eingebaute Resize-NodeView von @tiptap/extension-image baut das <img>-Element
  // einmalig beim Mount und aktualisiert es bei Attribut-Änderungen NICHT erneut (nur
  // width/height werden über die Resize-Callbacks live gepflegt). Ohne diesen Override
  // würde ein Klick auf "links ausrichten" zwar den Dokumentzustand (und damit den
  // gespeicherten HTML-Output) korrekt ändern, aber im Editor visuell nichts passieren,
  // bis man z.B. neu tippt. Fix: bei align-Änderung false zurückgeben, damit ProseMirror
  // den NodeView neu aufbaut und die neue Ausrichtung sofort sichtbar wird.
  addNodeView() {
    if (!this.options.resize || typeof this.options.resize !== 'object' || !this.options.resize.enabled || typeof document === 'undefined') {
      return null
    }
    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize

    return ({ node, getPos, HTMLAttributes, editor }: any) => {
      const el = document.createElement('img')
      el.draggable = false
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null) return
        if (key === 'width' || key === 'height') return
        el.setAttribute(key, value as string)
      })
      if (mergedAttributes.src != null) el.src = mergedAttributes.src

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width: number, height: number) => {
          el.style.width = `${width}px`
          el.style.height = `${height}px`
        },
        onCommit: (width: number, height: number) => {
          const pos = getPos()
          if (pos === undefined) return
          editor.chain().setNodeSelection(pos).updateAttributes(this.name, { width, height }).run()
        },
        onUpdate: (updatedNode: any) => {
          if (updatedNode.type !== node.type) return false
          if (updatedNode.attrs.align !== node.attrs.align) return false
          return true
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      })

      const dom = nodeView.dom as HTMLElement
      dom.style.visibility = 'hidden'
      dom.style.pointerEvents = 'none'
      el.onload = () => {
        dom.style.visibility = ''
        dom.style.pointerEvents = ''
      }
      return nodeView
    }
  },
})
