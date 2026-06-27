interface ConfirmOptions {
  title?: string
  name?: string
  sub?: string
  icon?: string
  accentColor?: string
}

const _state = useState('plx-confirm', () => ({
  visible:  false,
  title:    '',
  name:     '',
  sub:      'Diese Aktion kann nicht rückgängig gemacht werden.',
  icon:     'ti-trash',
  accentColor: '',
  resolve:  null as ((v: boolean) => void) | null,
}))

export function useConfirm() {
  function openConfirm(opts: ConfirmOptions = {}): Promise<boolean> {
    return new Promise(resolve => {
      _state.value = {
        visible:     true,
        title:       opts.title       || 'Wirklich löschen?',
        name:        opts.name        || '',
        sub:         opts.sub         || 'Diese Aktion kann nicht rückgängig gemacht werden.',
        icon:        opts.icon        || 'ti-trash',
        accentColor: opts.accentColor || '',
        resolve,
      }
    })
  }

  function _answer(v: boolean) {
    _state.value.resolve?.(v)
    _state.value.visible = false
  }

  return { openConfirm, _state, _answer }
}
