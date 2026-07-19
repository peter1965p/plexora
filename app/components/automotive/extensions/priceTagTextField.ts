import { Node, mergeAttributes } from '@tiptap/core'

// Inline-Chip für ein Fahrzeug-/Händler-Textfeld (z.B. "Kilometerstand"). Zeigt im
// Editor ein freundliches Label statt roher Handlebars-Syntax — die Übersetzung
// zurück zu {{feld}} passiert erst beim Kompilieren (server/utils/vehiclePriceTagTemplate.ts
// resolvePlaceholderChips()), damit Nutzer den Platzhalter nicht versehentlich
// kaputt-editieren können. group:'inline' + atom:true können nicht per Instanz auf
// 'block' wechseln — Bild-Felder sind deshalb eine eigene Node-Extension (priceTagImageField.ts).
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    priceTagTextField: {
      insertPriceTagTextField: (options: { field: string; label: string }) => ReturnType
    }
  }
}

export const PriceTagTextField = Node.create({
  name: 'priceTagTextField',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      field: { default: '' },
      label: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-pricetag-field-text]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const style = 'display:inline-flex;align-items:center;background:#FFF1E9;color:#B84A16;border:1px solid #F3C7A6;border-radius:6px;padding:2px 8px;font-size:12px;font-weight:600;white-space:nowrap'
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-pricetag-field-text': '',
      'data-field': node.attrs.field || '',
      style,
      contenteditable: 'false',
    }), node.attrs.label || node.attrs.field || 'Feld']
  },

  addCommands() {
    return {
      insertPriceTagTextField: (options) => ({ commands }) => {
        return commands.insertContent({ type: this.name, attrs: options })
      },
    }
  },
})
