import { Node, mergeAttributes } from '@tiptap/core'

// Block-Chip für ein Bildfeld (Fahrzeugfoto/Händler-Logo). Eigene Node statt eines
// 'kind'-Attributs auf PriceTagTextField, weil group/inline in TipTap/ProseMirror
// einmalig am Node-Typ deklariert werden, nicht pro Instanz umschaltbar sind. Kein
// echtes Bild/NodeView — nur ein Platzhalter, das eigentliche Foto kommt erst beim
// Kompilieren rein (resolvePlaceholderChips() baut ein {{#if}}<img>{{/if}} drumherum).
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    priceTagImageField: {
      insertPriceTagImageField: (options: { field: string; label: string }) => ReturnType
    }
  }
}

export const PriceTagImageField = Node.create({
  name: 'priceTagImageField',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      field: { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-pricetag-field-image]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const style = 'display:flex;align-items:center;justify-content:center;gap:8px;background:#F5F5F7;border:2px dashed #C9C9CE;border-radius:10px;padding:24px;color:#6b6b6b;font-size:13px;font-weight:600'
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-pricetag-field-image': '',
      'data-field': node.attrs.field || '',
      style,
      contenteditable: 'false',
    }), `🖼 ${node.attrs.label || node.attrs.field || 'Bild'}`]
  },

  addCommands() {
    return {
      insertPriceTagImageField: (options) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: options })
      },
    }
  },
})
