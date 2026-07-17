import { Node, mergeAttributes } from '@tiptap/core'

// Eigenständiger Block-Node für einen Call-to-Action-Button im Newsletter — kein
// Link-Mark, weil er als eigenes visuelles Element (Hintergrundfarbe, Padding)
// zwischen Absätzen stehen soll, nicht als Inline-Text-Verlinkung.
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    newsletterButton: {
      setButton: (options: { href: string; label: string }) => ReturnType
      updateButton: (options: { href: string; label: string }) => ReturnType
    }
  }
}

export const ButtonNode = Node.create({
  name: 'newsletterButton',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      href:  { default: '' },
      label: { default: 'Jetzt ansehen' },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-newsletter-button]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const style = 'display:inline-block;background:#EA580C;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-family:sans-serif;font-size:15px'
    return ['a', mergeAttributes(HTMLAttributes, {
      'data-newsletter-button': '',
      href: node.attrs.href || '#',
      style,
      contenteditable: 'false',
    }), node.attrs.label || 'Button']
  },

  addCommands() {
    return {
      setButton: (options) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: options })
      },
      updateButton: (options) => ({ commands }) => {
        return commands.updateAttributes(this.name, options)
      },
    }
  },
})
